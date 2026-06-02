import React, { useMemo } from 'react';
import { HeatCell } from '../hooks/useSalesAnalysis';

interface SalesHeatMapProps {
  data: HeatCell[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12am';
  if (i < 12) return `${i}am`;
  if (i === 12) return '12pm';
  return `${i - 12}pm`;
});

function heatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'hsl(220, 14%, 96%)';
  const ratio = Math.min(value / max, 1);
  // Interpolate from light blue-grey to deep indigo-primary
  const lightness = Math.round(96 - ratio * 62);   // 96% → 34%
  const saturation = Math.round(14 + ratio * 62);   // 14% → 76%
  const hue = Math.round(220 + ratio * 24);          // 220 → 244 (indigo)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const formatCurrency = (v: number) =>
  v >= 1_00_000
    ? `₹${(v / 1_00_000).toFixed(1)}L`
    : `₹${Math.round(v).toLocaleString('en-IN')}`;

export const SalesHeatMap: React.FC<SalesHeatMapProps> = React.memo(({ data }) => {
  const maxCount = useMemo(() => Math.max(...data.map(c => c.count), 1), [data]);

  // Build a lookup for fast cell access
  const cellMap = useMemo(() => {
    const m = new Map<string, HeatCell>();
    data.forEach(c => m.set(`${c.day}_${c.hour}`, c));
    return m;
  }, [data]);

  const totalOrders = useMemo(() => data.reduce((s, c) => s + c.count, 0), [data]);
  const totalRevenue = useMemo(() => data.reduce((s, c) => s + c.revenue, 0), [data]);
  const peakCell = useMemo(() => data.reduce((best, c) => (c.count > best.count ? c : best), data[0] || { day: 0, hour: 0, count: 0, revenue: 0 }), [data]);

  return (
    <div className="space-y-4">
      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Orders (Period)', value: totalOrders.toLocaleString() },
          { label: 'Total Revenue (Period)', value: formatCurrency(totalRevenue) },
          { label: 'Peak Hour', value: peakCell.count > 0 ? `${DAY_LABELS[peakCell.day]} ${HOUR_LABELS[peakCell.hour]} (${peakCell.count} orders)` : '—' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
            <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
        <span>Low activity</span>
        <div className="flex gap-0.5">
          {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((r, i) => (
            <div
              key={i}
              className="w-5 h-3 rounded-sm"
              style={{ background: heatColor(r * maxCount, maxCount) }}
            />
          ))}
        </div>
        <span>High activity</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-3">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `52px repeat(24, minmax(30px, 1fr))`,
            gap: '2px',
            minWidth: '820px'
          }}
        >
          {/* Header row — hours */}
          <div className="text-[9px] font-bold text-muted-foreground flex items-end pb-1" />
          {HOUR_LABELS.map((label, h) => (
            <div
              key={h}
              className="text-[9px] font-semibold text-muted-foreground text-center pb-1 leading-tight"
            >
              {label}
            </div>
          ))}

          {/* Data rows — days */}
          {DAY_LABELS.map((dayLabel, day) => (
            <React.Fragment key={day}>
              {/* Day label */}
              <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-end pr-2">
                {dayLabel}
              </div>
              {/* Hour cells */}
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = cellMap.get(`${day}_${hour}`);
                const count = cell?.count || 0;
                const rev = cell?.revenue || 0;
                const bg = heatColor(count, maxCount);
                return (
                  <div
                    key={hour}
                    title={count > 0 ? `${DAY_LABELS[day]} ${HOUR_LABELS[hour]}: ${count} order${count !== 1 ? 's' : ''} · ${formatCurrency(rev)}` : 'No orders'}
                    className="rounded-sm cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                    style={{
                      background: bg,
                      height: '26px',
                      border: count > 0 ? '1px solid hsl(224, 76%, 75%)' : '1px solid hsl(220, 14%, 90%)',
                    }}
                  >
                    {count > 0 && count === maxCount && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/90 select-none">
                        ★
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Hover over any cell to see order count and revenue. ★ marks the single busiest hour.
      </p>
    </div>
  );
});

SalesHeatMap.displayName = 'SalesHeatMap';
