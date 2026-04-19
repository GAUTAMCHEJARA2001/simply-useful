import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Filter, Download, Printer, X } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { SafeDataView } from '@/components/SafeDataView';


const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">X</button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

export const StockLedgerTab: React.FC<{ onViewTransaction?: (type: string, refId: string) => void }> = ({ onViewTransaction }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);


  // Filters for Main List
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [whFilter, setWhFilter] = useState('');

  // Detailed Ledger Modal State
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loadLedger, setLoadLedger] = useState(false);

  // Filters for Ledger Popup
  const [popDateFrom, setPopDateFrom] = useState('');
  const [popDateTo, setPopDateTo] = useState('');
  const [popWh, setPopWh] = useState('');
  const [summary, setSummary] = useState({ opening: 0, current: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, cat, wh] = await Promise.all([
        apiClient<any[]>('/inv/reports/current-stock'),
        apiClient<any[]>('/inv/masters/categories'),
        apiClient<any[]>('/inv/masters/warehouses'),
      ]);
      setStock(Array.isArray(st) ? st : []);
      setCategories(Array.isArray(cat) ? cat : []);
      setWarehouses(Array.isArray(wh) ? wh : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock ledger data');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { loadData(); }, [loadData]);

  const fetchLedger = useCallback(async (prodId: string) => {
    setLoadLedger(true);
    try {
      let url = `/inv/reports/stock-ledger/${prodId}?`;
      if (popDateFrom) url += `date_from=${popDateFrom}&`;
      if (popDateTo) url += `date_to=${popDateTo}&`;
      if (popWh) url += `warehouse_id=${popWh}&`;
      
      const res: any = await apiClient(url);
      setLedger(Array.isArray(res.items) ? res.items : []);
      // Set opening stock and current stock from the response object
      setSummary({
        opening: res.openingBalance || 0,
        current: res.currentStock || 0
      });
    } catch (e: any) {
      toast({ title: 'Fetch failed', description: e.message, variant: 'destructive' });
    } finally { setLoadLedger(false); }
  }, [popDateFrom, popDateTo, popWh, toast]);

  useEffect(() => {
    if (selectedProduct) { fetchLedger(selectedProduct.product_id); }
  }, [selectedProduct, popDateFrom, popDateTo, popWh, fetchLedger]);

  const filteredStock = stock.filter(s => {
    const matchesSearch = s.product_name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !catFilter || s.category_name === catFilter;
    const matchesWh = !whFilter || s.warehouse_name === whFilter;
    return matchesSearch && matchesCat && matchesWh;
  });

  // Calculate Summary Cards
  const totalInward = ledger.reduce((sum, l) => sum + parseFloat(l.credit || 0), 0);
  const totalOutward = ledger.reduce((sum, l) => sum + parseFloat(l.debit || 0), 0);
  const openingStock = ledger.length > 0 ? (parseFloat(ledger[0].balance) - parseFloat(ledger[0].quantity_change)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Ledger</h1>
        <Button size="sm" onClick={loadData} variant="outline"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Main Filter Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Product / SKU" className="w-full pl-9 border border-border rounded-lg px-3 py-2 bg-background text-sm" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 bg-background text-sm">
          <option value="">All Categories</option>
          {[...new Set(stock.map(s => s.category_name).filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 bg-background text-sm">
          <option value="">All Warehouses</option>
          {[...new Set(stock.map(s => s.warehouse_name).filter(Boolean))].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      <SafeDataView
        data={filteredStock}
        isLoading={loading}
        error={error}
        onRetry={loadData}
        emptyMessage="No ledger data found"
        renderItem={() => (
          <DataTable
            columns={['Product Name', 'SKU', 'Category', 'Unit', 'Wh', 'Opening', 'Production', 'Consumed', 'Purchase', 'Sales', 'Sales Return', 'Purch. Ret', 'Adj', 'Closing Stock', 'Action']}
            rows={filteredStock.map(s => [
              s.product_name, s.sku, s.category_name || '—', s.unit || '—',
              <span className="text-xs text-muted-foreground">{s.warehouse_name || 'Global'}</span>,
              <span className="text-muted-foreground">{s.opening_stock}</span>,
              <span className="text-blue-600">{s.production}</span>,
              <span className="text-red-400">{s.consumed || 0}</span>,
              <span className="text-green-600">{s.purchase}</span>,
              <span className="text-orange-500">{s.sales}</span>,
              <span className="text-purple-600">{s.sales_return}</span>,
              <span className="text-pink-600">{s.purchase_return || 0}</span>,
              <span className="text-gray-500">{s.adjustment || 0}</span>,
              <span className={`font-medium ${parseFloat(s.current_stock) <= parseFloat(s.minimum_stock) ? 'text-red-500 font-bold' : ''}`}>{s.current_stock}</span>,
              <Button size="sm" variant="link" onClick={() => setSelectedProduct(s)}>View Ledger</Button>
            ])}
          />
        )}
      />


      {/* Detailed Modal */}
      {selectedProduct && (
        <Modal title={`Stock Ledger: ${selectedProduct.product_name}`} onClose={() => setSelectedProduct(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-4 gap-3">
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Opening Balance</p><p className="text-xl font-bold">{summary.opening}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Inward (Credit)</p><p className="text-xl font-bold text-green-600">+{totalInward}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Outward (Debit)</p><p className="text-xl font-bold text-red-600">-{totalOutward}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Available Stock</p><p className="text-xl font-bold text-blue-600">{summary.current}</p></CardContent></Card>
            </div>

            {/* Popup Filters */}
            <div className="flex gap-2 items-center">
              <input type="date" value={popDateFrom} onChange={e => setPopDateFrom(e.target.value)} className="border border-border rounded-lg px-2 py-1 bg-background text-xs" />
              <span className="text-muted-foreground">to</span>
              <input type="date" value={popDateTo} onChange={e => setPopDateTo(e.target.value)} className="border border-border rounded-lg px-2 py-1 bg-background text-xs" />
              <select value={popWh} onChange={e => setPopWh(e.target.value)} className="border border-border rounded-lg px-2 py-1 bg-background text-xs">
                <option value="">All Warehouses</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={() => { setPopDateFrom(''); setPopDateTo(''); setPopWh(''); }}><X className="w-3 h-3 mr-1" /> Clear</Button>
              <div className="ml-auto flex gap-2">
                <PDFGenerator 
                  type="STOCK_LEDGER" 
                  data={{
                    product_name: selectedProduct.product_name,
                    sku: selectedProduct.sku,
                    unit: selectedProduct.unit || 'Bags',
                    date_from: popDateFrom,
                    date_to: popDateTo,
                    summary: {
                      opening: summary.opening,
                      total_in: totalInward,
                      total_out: totalOutward,
                      closing: summary.current
                    },
                    ledger: ledger.map(l => ({
                      date: l.date,
                      transaction_type: l.transaction_type,
                      reference_id: l.reference_id,
                      warehouse_name: l.warehouse_name,
                      in_qty: l.credit || 0,
                      out_qty: l.debit || 0,
                      balance: l.balance
                    }))
                  }}
                  filename={`Ledger_${selectedProduct.sku}.pdf`}
                  buttonLabel="Download Ledger"
                />
                <Button size="sm" variant="outline" onClick={() => toast({ title: 'Exporting to CSV...' })}><Download className="w-3.5 h-3.5 mr-1" /> Export</Button>
              </div>
            </div>

            {loadLedger ? (
              <div className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Ledger…</div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Ref</th>
                      <th className="p-2 text-right">Debit (Out)</th>
                      <th className="p-2 text-right">Credit (In)</th>
                      <th className="p-2 text-right font-bold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledger.map((l, i) => (
                      <tr key={l.id} 
                        className={`hover:bg-primary/5 cursor-pointer transition-colors group ${onViewTransaction ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (!onViewTransaction || !l.reference_id) return;
                          let type = '';
                          const t = l.transaction_type.toUpperCase();
                          if (t.includes('PURCHASE')) type = 'purchase';
                          else if (t.includes('SALE')) type = 'sale';
                          else if (t.includes('PRODUCTION')) type = 'production';
                          else if (t.includes('RETURN')) type = 'return';
                          
                          if (type) onViewTransaction(type, l.reference_id);
                        }}
                      >
                        <td className="p-2">{new Date(l.date).toLocaleDateString('en-IN')}</td>
                        <td className="p-2">
                          <span className="font-medium group-hover:text-primary transition-colors">{l.transaction_type}</span>
                        </td>
                        <td className="p-2 text-muted-foreground font-mono">{l.reference_id || '—'}</td>
                        <td className="p-2 text-right text-red-500">{l.debit > 0 ? l.debit : '—'}</td>
                        <td className="p-2 text-right text-green-600">{l.credit > 0 ? `+${l.credit}` : '—'}</td>
                        <td className="p-2 text-right font-semibold">{l.balance}</td>
                      </tr>
                    ))}
                    {ledger.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No transactions found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
