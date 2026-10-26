import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { DataTable } from '@/components/DataTable';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Search, Trash2, Eye, Truck, User, Calendar, FileText,
  Package, AlertTriangle, RefreshCw, X, ShieldAlert
} from 'lucide-react';

interface DeletedItem {
  productId?: string;
  productName?: string;
  productCode?: string;
  qty?: number;
  unitPrice?: number;
  amount?: number;
}

interface DeletedSaleRecord {
  id: string;
  source?: string;
  type: 'DISPATCH' | 'SALE';
  orderId?: string;
  orderNo?: string;
  invoiceNumber?: string;
  customerName?: string;
  dispatchDate?: string;
  vehicleNumber?: string;
  driverName?: string;
  remarks?: string;
  deletedAt: string;
  deletedBy: string;
  deletedByEmail?: string;
  items: DeletedItem[];
  grandTotal?: number;
}

export const DeletedSalesTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DISPATCH' | 'SALE'>('ALL');
  const [viewRecord, setViewRecord] = useState<DeletedSaleRecord | null>(null);

  const { data: deletedRecords = [], isLoading, error, refetch, isFetching } = useQuery<DeletedSaleRecord[]>({
    queryKey: ['deleted-sales'],
    queryFn: async () => {
      const res = await api.get('/transactions/deleted-sales');
      return (res.data?.data || res.data || []) as DeletedSaleRecord[];
    },
    staleTime: 30000,
  });

  const filteredRecords = useMemo(() => {
    return deletedRecords.filter((rec) => {
      if (typeFilter !== 'ALL' && rec.type !== typeFilter) return false;
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchDoc = (rec.invoiceNumber || '').toLowerCase().includes(term);
      const matchOrder = (rec.orderNo || '').toLowerCase().includes(term);
      const matchCust = (rec.customerName || '').toLowerCase().includes(term);
      const matchUser = (rec.deletedBy || '').toLowerCase().includes(term);
      const matchEmail = (rec.deletedByEmail || '').toLowerCase().includes(term);
      const matchRemarks = (rec.remarks || '').toLowerCase().includes(term);
      const matchVehicle = (rec.vehicleNumber || '').toLowerCase().includes(term);
      const matchItems = (rec.items || []).some(
        (it) => (it.productName || '').toLowerCase().includes(term) || (it.productCode || '').toLowerCase().includes(term)
      );

      return matchDoc || matchOrder || matchCust || matchUser || matchEmail || matchRemarks || matchVehicle || matchItems;
    });
  }, [deletedRecords, typeFilter, searchTerm]);

  // Quick stats
  const stats = useMemo(() => {
    const total = deletedRecords.length;
    const dispatches = deletedRecords.filter((r) => r.type === 'DISPATCH').length;
    const sales = deletedRecords.filter((r) => r.type === 'SALE').length;
    const totalQty = deletedRecords.reduce((sum, r) => {
      return sum + (r.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
    }, 0);
    return { total, dispatches, sales, totalQty };
  }, [deletedRecords]);

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return isNaN(d.getTime()) ? isoStr : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md border border-border/50 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Deleted Sales & Dispatches
                <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 font-semibold">
                  Trash / Audit
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit log of cancelled or removed dispatch entries and sales orders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl h-9 text-xs border-border/60 hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">Total Removed</span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
            <span className="text-[11px] text-muted-foreground">records</span>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">Deleted Dispatches</span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.dispatches}</span>
            <span className="text-[11px] text-indigo-500/80">orders</span>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">Deleted Sales Orders</span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.sales}</span>
            <span className="text-[11px] text-amber-500/80">orders</span>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">Units Restored</span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalQty.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-emerald-500/80">items</span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice, customer, order, user (e.g. Kiran), items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 bg-card border-border/60 h-10 rounded-xl text-xs sm:text-sm focus-visible:ring-1"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Toggle */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs self-start sm:self-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              typeFilter === 'ALL'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({deletedRecords.length})
          </button>
          <button
            onClick={() => setTypeFilter('DISPATCH')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              typeFilter === 'DISPATCH'
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dispatches ({stats.dispatches})
          </button>
          <button
            onClick={() => setTypeFilter('SALE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              typeFilter === 'SALE'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sales Orders ({stats.sales})
          </button>
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      <SafeDataView isLoading={isLoading} error={error} data={filteredRecords}>
        <DataTable
          columns={[
            'Type',
            'Doc / Invoice #',
            'Order #',
            'Customer',
            'Items & Quantities',
            'Deleted By',
            'Deleted At',
            'Vehicle / Remarks',
            'Action',
          ]}
          rows={filteredRecords.map((rec) => {
            const isDispatch = rec.type === 'DISPATCH';
            const items = rec.items || [];
            const topItems = items.slice(0, 2);
            const remainingCount = items.length - 2;

            return [
              // Type Badge
              <Badge
                key="type"
                variant="outline"
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                  isDispatch
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
              >
                {rec.type}
              </Badge>,

              // Doc / Invoice Number
              <div key="doc" className="flex flex-col">
                <span className="font-mono font-semibold text-xs text-foreground">
                  {rec.invoiceNumber && rec.invoiceNumber !== '—' ? rec.invoiceNumber : '—'}
                </span>
                {rec.source === 'STOCK_TRANSACTION' && (
                  <span className="text-[9px] text-muted-foreground italic">Legacy entry</span>
                )}
              </div>,

              // Order Number
              <span key="order" className="font-mono text-xs text-muted-foreground font-medium">
                {rec.orderNo || rec.orderId || '—'}
              </span>,

              // Customer
              <span key="cust" className="font-medium text-xs text-foreground max-w-[150px] truncate block" title={rec.customerName}>
                {rec.customerName && rec.customerName !== '—' ? rec.customerName : '—'}
              </span>,

              // Items & Quantities
              <div key="items" className="flex flex-wrap items-center gap-1 max-w-[220px]">
                {items.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <>
                    {topItems.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/50 max-w-[140px] truncate"
                        title={`${it.productName || 'Product'} (${it.qty} pcs)`}
                      >
                        <span className="truncate">{it.productName || 'Product'}</span>
                        <strong className="font-bold text-destructive">×{it.qty}</strong>
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60 transition-colors"
                          >
                            +{remainingCount} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 bg-popover border border-border/60 shadow-xl rounded-xl z-50">
                          <p className="text-xs font-semibold mb-2 text-foreground">All Deleted Items ({items.length})</p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                                <span className="truncate pr-2 text-muted-foreground">{it.productName || 'Item'}</span>
                                <span className="font-mono font-semibold text-destructive whitespace-nowrap">×{it.qty}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </>
                )}
              </div>,

              // Deleted By
              <div key="user" className="flex flex-col">
                <span className="font-medium text-xs text-foreground flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  {rec.deletedBy || 'Unknown'}
                </span>
                {rec.deletedByEmail && (
                  <span className="text-[10px] text-muted-foreground">{rec.deletedByEmail}</span>
                )}
              </div>,

              // Deleted At
              <div key="date" className="flex flex-col">
                <span className="text-xs text-foreground whitespace-nowrap">
                  {formatDateTime(rec.deletedAt)}
                </span>
              </div>,

              // Vehicle / Remarks
              <div key="rem" className="flex flex-col max-w-[140px]">
                {rec.vehicleNumber && rec.vehicleNumber !== '—' && (
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {rec.vehicleNumber}
                  </span>
                )}
                {rec.remarks && (
                  <span className="text-[10px] text-muted-foreground truncate" title={rec.remarks}>
                    {rec.remarks}
                  </span>
                )}
                {!rec.vehicleNumber && !rec.remarks && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>,

              // View details
              <Button
                key="btn"
                variant="ghost"
                size="sm"
                onClick={() => setViewRecord(rec)}
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                View
              </Button>
            ];
          })}
        />
      </SafeDataView>

      {/* ── DETAILS MODAL ── */}
      {viewRecord && (
        <Modal
          isOpen={true}
          onClose={() => setViewRecord(null)}
          title={`Deleted ${viewRecord.type === 'DISPATCH' ? 'Dispatch' : 'Sale Order'} Details`}
        >
          <div className="space-y-5">
            {/* Alert banner */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-destructive">This entry was deleted from the system</p>
                <p className="text-muted-foreground mt-0.5">
                  Stock deducted by this dispatch has been restored to the ledger.
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 bg-muted/40 rounded-xl border border-border/50 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Type</span>
                <Badge
                  variant="outline"
                  className="mt-1 font-bold text-[10px]"
                >
                  {viewRecord.type}
                </Badge>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Invoice / Doc #</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 block">
                  {viewRecord.invoiceNumber || '—'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Order No</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 block">
                  {viewRecord.orderNo || viewRecord.orderId || '—'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Customer</span>
                <span className="font-semibold text-foreground mt-0.5 block truncate">
                  {viewRecord.customerName || '—'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Deleted By</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {viewRecord.deletedBy || '—'}
                </span>
                {viewRecord.deletedByEmail && (
                  <span className="text-[10px] text-muted-foreground">{viewRecord.deletedByEmail}</span>
                )}
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Deleted Timestamp</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {formatDateTime(viewRecord.deletedAt)}
                </span>
              </div>

              {viewRecord.vehicleNumber && viewRecord.vehicleNumber !== '—' && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Vehicle</span>
                  <span className="font-mono font-semibold text-foreground mt-0.5 block">
                    {viewRecord.vehicleNumber}
                  </span>
                </div>
              )}

              {viewRecord.driverName && viewRecord.driverName !== '—' && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Driver</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {viewRecord.driverName}
                  </span>
                </div>
              )}

              {viewRecord.dispatchDate && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Original Date</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {viewRecord.dispatchDate}
                  </span>
                </div>
              )}
            </div>

            {/* Remarks */}
            {viewRecord.remarks && (
              <div className="p-3 bg-card border border-border/50 rounded-xl text-xs">
                <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider mb-1">
                  Remarks / Notes
                </span>
                <p className="text-foreground">{viewRecord.remarks}</p>
              </div>
            )}

            {/* Deleted Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  Deleted Items ({(viewRecord.items || []).length})
                </h4>
                <span className="text-xs font-semibold text-destructive">
                  Total Qty: {(viewRecord.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0)}
                </span>
              </div>

              <div className="border border-border/50 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] border-b border-border/50 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3 text-right">Quantity Restored</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {(viewRecord.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                          No specific item rows captured.
                        </td>
                      </tr>
                    ) : (
                      viewRecord.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium text-foreground">{it.productName || 'Unknown Product'}</td>
                          <td className="py-2 px-3 font-mono text-muted-foreground">{it.productCode || '—'}</td>
                          <td className="py-2 px-3 font-mono font-bold text-destructive text-right">
                            {it.qty}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setViewRecord(null)}
                className="rounded-xl h-9 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
