import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h2 className="font-display font-bold text-2xl text-text mb-3">
            Something went wrong
          </h2>
          <p className="text-text-muted mb-6">
            We ran into an unexpected error. Refreshing usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
