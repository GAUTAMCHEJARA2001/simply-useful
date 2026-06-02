import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Package, Warehouse, Globe, Search, Filter, RefreshCw, Layers } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { SafeDataView } from '@/components/SafeDataView';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const GlobalInventory: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const loadGlobalInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any[]>('/inv/reports/global-inventory');
      if (res.success) {
        setData(res.data || []);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load global inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalInventory();
  }, [loadGlobalInventory]);

  const companies = Array.from(new Set(data.map(item => item.companyName)));

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === 'all' || item.companyName === companyFilter;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 min-h-screen bg-background/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Globe className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Global Inventory Control</h1>
          </div>
          <p className="text-muted-foreground font-medium">Cross-company asset oversight for Super Administrators</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search SKU or Product..." 
              className="pl-10 w-[240px] bg-card border-border/50 rounded-xl focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px] rounded-xl bg-card border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Companies" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button 
            onClick={loadGlobalInventory}
            className="p-2.5 rounded-xl border border-border/50 hover:bg-muted transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-none shadow-lg glass-card group">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Total Companies
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-3xl font-black">{companies.length}</p>
            </CardContent>
         </Card>
         <Card className="border-none shadow-lg glass-card">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Consolidated SKU Count
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-3xl font-black">{Array.from(new Set(data.map(i => i.sku))).length}</p>
            </CardContent>
         </Card>
         <Card className="border-none shadow-lg glass-card border-l-4 border-l-primary">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-primary" /> Total Unit Stock
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-3xl font-black">{Math.round(data.reduce((sum, i) => sum + i.quantity, 0)).toLocaleString()}</p>
            </CardContent>
         </Card>
      </div>

      {/* Main Table */}
      <SafeDataView data={data} isLoading={loading} error={error} onRetry={loadGlobalInventory} emptyMessage="No inventory data found across system.">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="shadow-2xl rounded-2xl overflow-hidden border border-border/50 bg-card">
          <DataTable 
            columns={['Company', 'Product', 'SKU', 'Category', 'Stock Level', 'Warehouse', 'Status']}
            rows={filteredData.map((item, idx) => [
              <Badge key={`badge-${idx}`} variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px] px-2 py-0.5">
                {item.companyName}
              </Badge>,
              <p key={`name-${idx}`} className="font-bold text-foreground/90">{item.productName}</p>,
              <code key={`sku-${idx}`} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-muted-foreground">{item.sku}</code>,
              <span key={`cat-${idx}`} className="text-xs text-muted-foreground font-medium">{item.categoryName}</span>,
              <div key={`stock-${idx}`} className="flex items-center gap-2">
                 <span className="font-black text-sm">{Math.round(item.quantity)}</span>
                 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{item.unit?.name || (typeof item.unit === 'string' ? item.unit : '') || '—'}</span>
              </div>,
              <div key={`wh-${idx}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <Warehouse className="w-3 h-3" /> {item.warehouseName}
              </div>,
              <div key={`status-${idx}`} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${item.quantity > 100 ? 'bg-success' : item.quantity > 50 ? 'bg-orange-500' : 'bg-destructive'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {item.quantity > 100 ? 'Optimal' : item.quantity > 50 ? 'Medium' : 'Critical'}
                </span>
              </div>
            ])}
          />
        </motion.div>
      </SafeDataView>
    </div>
  );
};

export default GlobalInventory;
