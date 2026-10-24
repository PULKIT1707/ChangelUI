import { Alert, Button } from "changelui";
import { Component, type ReactNode } from "react";
import { analytics } from "../lib/analytics/client";
import { redactErrorMessage, sanitizeErrorName } from "../lib/analytics/events";

export interface DemoErrorBoundaryProps {
  /** The item slug, reported with demo_error. */
  component: string;
  children: ReactNode;
}

interface DemoErrorBoundaryState {
  crashed: boolean;
}

/**
 * Keeps a throwing demo inside its own card: the rest of the page stays usable, the crash is reported
 * as demo_error (redacted message) and Retry renders the demo again.
 */
export class DemoErrorBoundary extends Component<DemoErrorBoundaryProps, DemoErrorBoundaryState> {
  override state: DemoErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): DemoErrorBoundaryState {
    return { crashed: true };
  }

  override componentDidCatch(error: unknown): void {
    analytics.track("demo_error", {
      component: this.props.component,
      phase: "render",
      error_name: error instanceof Error ? sanitizeErrorName(error.name) : "NonError",
      // A thrown non-Error can be anything, so only a redacted Error message is sent.
      error_message: error instanceof Error ? redactErrorMessage(error.message) : "",
    });
  }

  private readonly retry = () => this.setState({ crashed: false });

  override render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return (
      <Alert
        tone="danger"
        title="This demo crashed"
        action={
          <Button size="sm" variant="outline" tone="danger" onClick={this.retry}>
            Retry
          </Button>
        }
      >
        Something in this demo threw an error. Retry to render it again.
      </Alert>
    );
  }
}
