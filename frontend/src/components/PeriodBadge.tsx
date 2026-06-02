import React from 'react';
import { CalendarRange, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TimeScope,
  getTimeScopeLabel,
  toTimeScopeQueryParams,
} from '@/utils/financialYear';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { fyStringToScope } from '@/utils/financialYear';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PeriodBadgeVariant =
  | 'default'   // Pill chip — for card headers and chart subtitles
  | 'subtle'    // Inline text with icon — for page subtitles
  | 'print';    // Plain text — for PDF/CSV titles (no colors)

interface PeriodBadgeProps {
  /** Explicit scope. If omitted, reads from global FinancialYearContext. */
  scope?: TimeScope;
  /** Visual style. Default = 'default' */
  variant?: PeriodBadgeVariant;
  /** Extra className forwarded to the root element */
  className?: string;
  /** Optional prefix text, e.g. "Showing" or "Period:" */
  prefix?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon selector
// ─────────────────────────────────────────────────────────────────────────────

function ScopeIcon({ scope, className }: { scope: TimeScope; className?: string }) {
  if (scope.type === 'ALL_TIME') return <Clock className={className} />;
  if (scope.type === 'QUARTER')  return <Calendar className={className} />;
  return <CalendarRange className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PeriodBadge
 *
 * A reusable badge that displays the current time scope (FY, quarter, month,
 * all-time) with consistent formatting. Reads the global FY context by default,
 * or accepts an explicit `scope` prop for chart-specific overrides.
 *
 * Usage:
 *   <PeriodBadge />                              // reads global FY
 *   <PeriodBadge scope={{ type: 'QUARTER', fy: '2024-25', quarter: 2 }} />
 *   <PeriodBadge variant="subtle" prefix="Showing" />
 *   <PeriodBadge variant="print" />              // for PDF/CSV headers
 */
const PeriodBadge: React.FC<PeriodBadgeProps> = ({
  scope: scopeProp,
  variant = 'default',
  className,
  prefix,
}) => {
  const { selectedFY } = useFinancialYear();
  const scope = scopeProp ?? fyStringToScope(selectedFY);
  const label = getTimeScopeLabel(scope);

  // ── Print variant: plain text, no DOM decoration ─────────────────────────
  if (variant === 'print') {
    return (
      <span className={cn('text-sm text-gray-600', className)}>
        {prefix ? `${prefix} ${label}` : label}
      </span>
    );
  }

  // ── Subtle variant: inline icon + text ────────────────────────────────────
  if (variant === 'subtle') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground',
          className
        )}
      >
        <ScopeIcon scope={scope} className="w-3 h-3 text-primary" />
        {prefix && <span>{prefix}</span>}
        <span className="font-semibold text-primary">{label}</span>
      </span>
    );
  }

  // ── Default variant: pill badge ────────────────────────────────────────────
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
        'border border-primary/20 bg-primary/8 text-primary',
        'select-none',
        className
      )}
      title={`Scope: ${label}`}
    >
      <ScopeIcon scope={scope} className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
};

export default PeriodBadge;

// ─────────────────────────────────────────────────────────────────────────────
// Convenience re-export for consumers who also need the query-param helper
// ─────────────────────────────────────────────────────────────────────────────
export { toTimeScopeQueryParams };
