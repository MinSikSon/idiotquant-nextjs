import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  children: ReactNode;
  // Optional: Allow parent components to perform logic when a reset happens
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Updates state so the next render shows the fallback UI.
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Used for logging error information to an external service.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You could send this to Sentry, LogRocket, etc.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  /**
   * Resets the error state, allowing the component tree to try re-rendering.
   */
  public handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      // Ensure the ErrorFallback component is designed to receive these props
      return (
        <ErrorFallback
          error={this.state.error!}
          resetErrorBoundary={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };