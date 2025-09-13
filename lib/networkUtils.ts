import { Alert } from "react-native";
import { logger } from "./logger";

export interface NetworkError extends Error {
  isNetworkError?: boolean;
  isTimeout?: boolean;
  status?: number;
}

/**
 * Checks if an error is a network-related error
 */
export const isNetworkError = (error: any): error is NetworkError => {
  if (!error) return false;

  const message = error.message || String(error);
  const name = error.name || "";

  return (
    name === "TypeError" ||
    message.includes("Network request failed") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("network") ||
    error.isNetworkError === true
  );
};

/**
 * Checks if an error is a timeout error
 */
export const isTimeoutError = (error: any): boolean => {
  if (!error) return false;

  const message = error.message || String(error);
  return (
    message.includes("timeout") ||
    message.includes("AbortError") ||
    error.isTimeout === true
  );
};

/**
 * Retry a function with exponential backoff
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    timeout?: number;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    timeout = 15000,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout wrapper if specified
      if (timeout > 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const result = await Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), timeout)
            ),
          ]);
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } else {
        return await fn();
      }
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry non-network errors
      if (!isNetworkError(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      logger.debug(
        "Retry attempt failed, retrying",
        { attempt: attempt + 1, maxRetries: maxRetries + 1, delay },
        { component: "NetworkUtils" }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Handle network errors with user-friendly messages
 */
export const handleNetworkError = (
  error: any,
  options: {
    showAlert?: boolean;
    customMessage?: string;
    onRetry?: () => void;
    context?: string;
  } = {}
): void => {
  const {
    showAlert = true,
    customMessage,
    onRetry,
    context = "operation",
  } = options;

  logger.networkError(`Network error in ${context}`, error, {
    component: "NetworkUtils",
    context,
  });

  if (!showAlert) return;

  let message = customMessage;

  if (!message) {
    if (isTimeoutError(error)) {
      message = `Request timed out. Please check your internet connection and try again.`;
    } else if (isNetworkError(error)) {
      message = `Network error occurred. Please check your internet connection and try again.`;
    } else {
      message = `An unexpected error occurred during ${context}. Please try again.`;
    }
  }

  const buttons = [{ text: "OK", style: "default" as const }];

  if (onRetry) {
    buttons.unshift({
      text: "Retry",
      style: "default" as const,
      // @ts-expect-error: onPress is supported in React Native Alert but not typed in TS
      onPress: onRetry,
    });
  }

  Alert.alert("Connection Error", message, buttons);
};

/**
 * Wrapper for Supabase edge function calls with retry logic
 */
export const callEdgeFunctionWithRetry = async <T>(
  supabase: any,
  functionName: string,
  payload: any,
  options: {
    maxRetries?: number;
    timeout?: number;
    context?: string;
  } = {}
): Promise<{ data: T; error: null } | { data: null; error: any }> => {
  const {
    maxRetries = 2,
    timeout = 10000,
    context = "edge function call",
  } = options;

  try {
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
        });

        if (error) {
          throw error;
        }

        return data;
      },
      {
        maxRetries,
        timeout,
        baseDelay: 1000,
        maxDelay: 5000,
      }
    );

    return { data: result, error: null };
  } catch (error) {
    logger.error(
      "Edge function failed after retries",
      error,
      { component: "NetworkUtils", functionName, context }
    );
    return { data: null, error };
  }
};

/**
 * Wrapper for regular fetch requests with retry logic
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retryOptions: {
    maxRetries?: number;
    timeout?: number;
    context?: string;
  } = {}
): Promise<Response> => {
  const {
    maxRetries = 3,
    timeout = 15000,
    context = "fetch request",
  } = retryOptions;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    {
      maxRetries,
      timeout: 0, // We handle timeout manually above
      baseDelay: 1000,
      maxDelay: 5000,
    }
  );
};
