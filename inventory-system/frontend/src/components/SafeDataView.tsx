import React from 'react';
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './ui/button';

interface SafeDataViewProps<T> {
  data: T[] | null | undefined;
  isLoading: boolean;
  error: Error | string | null;
  onRetry?: () => void;
  renderItem?: (item: T, index: number) => React.ReactNode;
  children?: React.ReactNode;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
}

/**
 * THE UNIVERSAL SAFE RENDER COMPONENT
 * Handles Loading, Error, and Empty states automatically.
 * Supports Iteration (renderItem) OR Single Container (children).
 */
export function SafeDataView<T>({
  data,
  isLoading,
  error,
  onRetry,
  renderItem,
  children,
  emptyMessage = "No data found",
  loadingMessage = "Loading...",
  className = ""
}: SafeDataViewProps<T>) {
  
  // Rule 2: Handle Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-red-900">Error Loading Data</h3>
        <p className="text-sm text-red-700 mb-4">{error instanceof Error ? error.message : error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="flex items-center gap-2 border-red-200 text-red-900 hover:bg-red-100">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        )}
      </div>
    );
  }

  // Rule 2: Handle Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  // Rule 1: Always Safe Render (Check length and existence)
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-slate-100">
        <Inbox className="w-10 h-10 text-slate-400 mb-3" />
        <h3 className="text-lg font-semibold text-slate-900">{emptyMessage}</h3>
        <p className="text-sm text-slate-500">We couldn't find any items to display here.</p>
      </div>
    );
  }

  // Mode A: Single Container (Preffered for Tables/Grids)
  if (children) {
    return <div className={className}>{children}</div>;
  }

  // Mode B: Iterative Rendering (Mapped)
  if (!renderItem) return null;

  return (
    <div className={className}>
      {data.map((item, index) => (
        <React.Fragment key={(item as any).id || (item as any).orderId || (item as any).productCode || (item as any).sku || index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}
