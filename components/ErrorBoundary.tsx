import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

/**
 * Error Fallback Component
 * Displays a user-friendly error message with retry option
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <ThemedView style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <Ionicons
          name="warning-outline"
          size={64}
          color="#FF6B6B"
          style={styles.errorIcon}
        />

        <ThemedText style={styles.errorTitle}>
          Oops! Something went wrong
        </ThemedText>

        <ThemedText style={styles.errorMessage}>
          We're sorry, but something unexpected happened. Don't worry, your data
          is safe.
        </ThemedText>

        {__DEV__ && error && (
          <View style={styles.debugInfo}>
            <ThemedText style={styles.debugTitle}>
              Debug Information:
            </ThemedText>
            <ThemedText style={styles.debugText}>{error.message}</ThemedText>
            <ThemedText style={styles.debugText}>{error.stack}</ThemedText>
          </View>
        )}

        <Button
          title="Try Again"
          onPress={resetError}
          style={styles.retryButton}
          variant="primary"
        />
      </View>
    </ThemedView>
  );
};

/**
 * React Error Boundary Class Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to our logging service
    logger.error("Error boundary caught an error", error, {
      component: "ErrorBoundary",
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary for functional components
 * Note: This is a workaround since hooks can't catch errors directly
 * Use the class-based ErrorBoundary for actual error catching
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    logger.error("Error captured by useErrorHandler", error, {
      component: "useErrorHandler",
    });
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

/**
 * Higher-order component that wraps a component with ErrorBoundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};

/**
 * Async Error Boundary for handling async errors
 * Use this for components that perform async operations
 */
export const AsyncErrorBoundary: React.FC<{
  children: React.ReactNode;
  onAsyncError?: (error: Error) => void;
}> = ({ children, onAsyncError }) => {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error("Unhandled promise rejection", event.reason, {
        component: "AsyncErrorBoundary",
      });

      setAsyncError(event.reason);

      if (onAsyncError) {
        onAsyncError(event.reason);
      }

      // Prevent the default behavior (logging to console)
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, [onAsyncError]);

  if (asyncError) {
    return (
      <ErrorFallback
        error={asyncError}
        resetError={() => setAsyncError(null)}
      />
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
    maxWidth: 400,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  debugInfo: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 16,
    marginBottom: 4,
  },
  retryButton: {
    minWidth: 120,
  },
});

export default ErrorBoundary;
