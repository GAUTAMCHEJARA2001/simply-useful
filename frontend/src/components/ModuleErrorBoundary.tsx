import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  moduleName?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Crash in module "${this.props.moduleName || 'Anonymous'}":`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 my-2 text-center">
          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {this.props.moduleName ? `${this.props.moduleName} encountered a display issue` : 'Module temporarily unavailable'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || 'An unexpected rendering error occurred. The rest of the system remains fully functional.'}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all active:scale-95 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Module</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;
