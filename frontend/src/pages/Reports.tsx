import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ReportType = 'so-wise' | 'dealer-wise' | 'distributor-wise' | 'product-wise' | 'pending' | 'monthly';

const Reports: React.FC = () => {
  const { orders } = useData();
  const [reportType, setReportType] = useState<ReportType>('so-wise');

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const pendingOrders = orders.filter(o => o.status === 'Pending');

  const getChartData = () => {
    switch (reportType) {
      case 'so-wise':
        return Object.entries(completedOrders.reduce((acc, o) => { acc[o.so_email.split('@')[0]] = (acc[o.so_email.split('@')[0]] || 0) + o.grand_total; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
      case 'dealer-wise':
        return Object.entries(orders.filter(o => o.party_type === 'Dealer').reduce((acc, o) => { acc[o.party_name] = (acc[o.party_name] || 0) + o.grand_total; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
      case 'distributor-wise':
        return Object.entries(orders.reduce((acc, o) => { acc[o.distributor] = (acc[o.distributor] || 0) + o.grand_total; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
      case 'product-wise':
        return Object.entries(orders.flatMap(o => o.items).reduce((acc, i) => { acc[i.product] = (acc[i.product] || 0) + i.total; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name: name.replace('TileFix ', '').replace('GroutMaster ', ''), value }));
      case 'pending':
        return pendingOrders.map(o => ({ name: o.order_id, value: o.grand_total }));
      case 'monthly':
        return Object.entries(orders.reduce((acc, o) => { const m = o.date.substring(0, 7); acc[m] = (acc[m] || 0) + o.grand_total; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
      default:
        return [];
    }
  };

  const data = getChartData();

  const reportLabels: Record<ReportType, string> = {
    'so-wise': 'SO-wise Sales',
    'dealer-wise': 'Dealer-wise Sales',
    'distributor-wise': 'Distributor-wise Sales',
    'product-wise': 'Product-wise Sales',
    'pending': 'Pending Orders',
    'monthly': 'Monthly Summary',
  };

  return (
    <div className="space-y-6">
      <h1 className="page-header">Reports</h1>
      <p className="page-subheader">Generate and view sales reports</p>

      <div className="max-w-xs">
        <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(reportLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{reportLabels[reportType]}</CardTitle></CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data for this report.</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill="hsl(224, 76%, 33%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-right">₹{d.value.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-primary">₹{data.reduce((s, d) => s + d.value, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
