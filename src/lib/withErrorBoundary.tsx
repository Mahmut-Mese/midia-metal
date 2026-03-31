import React from "react";
import IslandErrorBoundary from "@/components/IslandErrorBoundary";

/**
 * HOC that wraps a React island component in an error boundary.
 * Usage: export default withErrorBoundary(MyIsland, "MyIsland")
 */
export default function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
) {
  const displayName = name || Component.displayName || Component.name || "Island";

  function Wrapped(props: P) {
    return (
      <IslandErrorBoundary name={displayName}>
        <Component {...props} />
      </IslandErrorBoundary>
    );
  }

  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}
