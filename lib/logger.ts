/**
 * Secure Logging Utility
 *
 * This utility provides safe logging that:
 * - Filters out sensitive data in production
 * - Uses appropriate log levels
 * - Prevents data exposure in client-side logs
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = __DEV__ || process.env.NODE_ENV === "development";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sensitiveKeys = [
      "password",
      "token",
      "key",
      "secret",
      "credential",
      "auth",
      "accessToken",
      "refreshToken",
      "apiKey",
      "privateKey",
      "ssn",
      "socialSecurity",
      "creditCard",
      "cardNumber",
      "cvv",
      "pin",
      "otp",
      "verificationCode",
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sensitive) =>
        lowerKey.includes(sensitive)
      );

      if (isSensitive) {
        (sanitized as any)[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Format log message with context
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context.component || "App"}]` : "";
    return `${timestamp} [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, data?: any, context?: LogContext): void {
    if (this.isDevelopment) {
      const sanitizedData = data ? this.sanitizeData(data) : undefined;
      console.log(
        this.formatMessage("debug", message, context),
        sanitizedData || ""
      );
    }
  }

  /**
   * Info logging - safe for production
   */
  info(message: string, data?: any, context?: LogContext): void {
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    console.log(
      this.formatMessage("info", message, context),
      sanitizedData || ""
    );
  }

  /**
   * Warning logging - safe for production
   */
  warn(message: string, data?: any, context?: LogContext): void {
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    console.warn(
      this.formatMessage("warn", message, context),
      sanitizedData || ""
    );
  }

  /**
   * Error logging - safe for production but sanitized
   */
  error(message: string, error?: any, context?: LogContext): void {
    const sanitizedError = error ? this.sanitizeData(error) : undefined;
    console.error(
      this.formatMessage("error", message, context),
      sanitizedError || ""
    );
  }

  /**
   * Critical error logging - always logs, even in production
   * Use sparingly for truly critical issues
   */
  critical(message: string, error?: any, context?: LogContext): void {
    const sanitizedError = error ? this.sanitizeData(error) : undefined;
    console.error(
      this.formatMessage("error", `CRITICAL: ${message}`, context),
      sanitizedError || ""
    );
  }

  /**
   * Network error logging with retry context
   */
  networkError(
    message: string,
    error: any,
    context: LogContext & { retryCount?: number }
  ): void {
    const sanitizedError = this.sanitizeData(error);
    const retryInfo = context.retryCount
      ? ` (retry ${context.retryCount})`
      : "";

    console.error(
      this.formatMessage(
        "error",
        `Network Error${retryInfo}: ${message}`,
        context
      ),
      sanitizedError
    );
  }

  /**
   * User action logging - for analytics and debugging
   */
  userAction(action: string, data?: any, context?: LogContext): void {
    if (this.isDevelopment) {
      this.debug(`User Action: ${action}`, data, context);
    }
  }

  /**
   * Performance logging - for monitoring
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (this.isDevelopment) {
      this.debug(
        `Performance: ${operation} took ${duration}ms`,
        undefined,
        context
      );
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for TypeScript
export type { LogContext, LogLevel };
