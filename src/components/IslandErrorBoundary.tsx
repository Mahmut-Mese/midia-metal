import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for React islands.
 * Shows a section-level error instead of crashing the entire page.
 */
class IslandErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.name || "Island"}] Error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="py-20 text-center">
          <p className="text-[#6e7a92] mb-4">Something went wrong loading this section.</p>
          <button
            onClick={this.handleRetry}
            className="text-sm font-semibold text-orange hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default IslandErrorBoundary;
