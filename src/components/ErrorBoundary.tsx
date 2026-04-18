// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Error Boundary
// ═══════════════════════════════════════════════════════════════════════════════
// Catches uncaught render errors so one bad component doesn't unmount the whole
// app. Previously, a single thrown error (e.g. reading a property of undefined
// on a malformed state from the server) would collapse the entire UI to a blank
// background. Now the user sees a recoverable error screen.

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for debugging; in the future we could ship this to a
    // server endpoint so we catch user-side crashes.
    console.error('[ErrorBoundary] caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private reload = (): void => {
    window.location.reload();
  };

  private reset = (): void => {
    this.setState({ error: null, errorInfo: null, showDetails: false });
  };

  private toggleDetails = (): void => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-xl p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Something broke.</h1>
            <p className="text-slate-300">
              A component threw an error while rendering. The game state on the
              server is untouched — reloading should get you back in.
            </p>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Error</div>
            <div className="text-red-300 font-mono text-sm break-all">{error.message}</div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={this.reload}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
            >
              Try to continue
            </button>
            <button
              onClick={this.toggleDetails}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
            >
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>
          </div>

          {showDetails && (
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 max-h-80 overflow-auto">
              <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                {error.stack}
                {errorInfo?.componentStack && `\n\nComponent stack:${errorInfo.componentStack}`}
              </pre>
            </div>
          )}

          <p className="text-xs text-slate-500">
            If this keeps happening, grab the error text above and send it along
            — it has enough info to pinpoint the bug.
          </p>
        </div>
      </div>
    );
  }
}
