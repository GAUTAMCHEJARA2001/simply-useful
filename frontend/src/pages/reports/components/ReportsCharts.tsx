import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface ReportsChartsProps {
  chartStyle: 'bar' | 'line' | 'pie' | 'none';
  data: ChartDataPoint[];
  domain: 'so-performance' | 'inventory' | 'partners' | 'monthly' | 'sales-analysis';
  formatter: (v: number) => string;
  chartLabel?: string; // optional override for title
}

const PALETTE = [
  'hsl(224, 76%, 33%)', // Primary Dark Blue
  'hsl(142, 72%, 29%)', // Green
  'hsl(38, 92%, 50%)',  // Orange/Amber
  'hsl(262, 83%, 58%)', // Violet
  'hsl(346, 84%, 50%)', // Rose
  'hsl(199, 89%, 48%)', // Cyan
  'hsl(28, 80%, 52%)'   // Rust/Orange
];

export const ReportsCharts: React.FC<ReportsChartsProps> = React.memo(({
  chartStyle,
  data,
  domain,
  formatter,
  chartLabel
}) => {
  if (chartStyle === 'none' || data.length === 0) return null;

  // Clean data for charting (e.g. limit to top 10 items for Pie/Bar charts to avoid clutter)
  const chartDataset = useMemo(() => {
    if (chartStyle === 'pie' || chartStyle === 'bar') {
      // Sort and take top 10 to keep it extremely clean
      return [...data].sort((a, b) => b.value - a.value).slice(0, 10);
    }
    return data;
  }, [data, chartStyle]);

  // Chart Titles mapping
  const titles: Record<string, string> = {
    'so-performance': 'Sales Officers Net Achieved Revenue',
    'inventory': 'Inventory Product Stock Quantities',
    'partners': 'Party Billing Volumes (Top 10)',
    'monthly': 'Monthly Revenue & Est. Profit Trends',
    'sales-analysis': chartLabel || 'Sales Analysis — Top Items by Revenue'
  };

  // Double value tracking for Monthly (Revenue vs Profit)
  const showDoubleSeries = domain === 'monthly';

  // 1. Chart Component Map Strategy (Requirement #6)
  const chartComponentMap = {
    bar: (
      <BarChart data={chartDataset}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={65} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter} />
        <Tooltip formatter={(v: any) => [formatter(Number(v)), '']} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {showDoubleSeries ? (
          <>
            <Bar dataKey="value" name="Gross Revenue" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Est. Profit" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
          </>
        ) : (
          <Bar dataKey="value" name="Metric Value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    ),
    line: (
      <LineChart data={chartDataset}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={65} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter} />
        <Tooltip formatter={(v: any) => [formatter(Number(v)), '']} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {showDoubleSeries ? (
          <>
            <Line type="monotone" dataKey="value" name="Gross Revenue" stroke={PALETTE[0]} strokeWidth={3} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="profit" name="Est. Profit" stroke={PALETTE[1]} strokeWidth={2.5} strokeDasharray="4 4" />
          </>
        ) : (
          <Line type="monotone" dataKey="value" name="Metric Value" stroke={PALETTE[0]} strokeWidth={3} activeDot={{ r: 8 }} />
        )}
      </LineChart>
    ),
    pie: (
      <PieChart>
        <Pie
          data={chartDataset}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={95}
          innerRadius={45} // Elegant Donut style
          paddingAngle={3}
          label={({ name, percent }) => `${name.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
          labelLine={true}
        >
          {chartDataset.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: any) => [formatter(Number(v)), '']} />
        <Legend wrapperStyle={{ fontSize: 11 }} layout="horizontal" verticalAlign="bottom" align="center" />
      </PieChart>
    )
  };

  return (
    <Card className="border border-border/80 rounded-2xl shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-1 border-b border-border/40">
        <CardTitle className="text-sm font-bold text-foreground">{titles[domain]}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartComponentMap[chartStyle]}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

ReportsCharts.displayName = 'ReportsCharts';
