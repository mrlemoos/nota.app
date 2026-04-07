import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

export class SpaErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('SpaErrorBoundary', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-sm text-foreground">
          <p className="max-w-sm text-muted-foreground">
            Something went wrong loading Nota. You can try again or reload the app.
          </p>
          <pre className="max-h-40 max-w-full overflow-auto rounded-md border border-border bg-muted/30 p-3 text-left font-mono text-xs text-foreground">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded-md border border-border bg-muted/40 px-4 py-2 text-xs hover:bg-muted/60"
            onClick={() => {
              this.setState({ error: null });
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
