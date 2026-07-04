import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Package, Warehouse, Globe, Search, RefreshCw, Layers, AlertTriangle, Tags, TrendingUp, IndianRupee } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { SafeDataView } from '@/components/SafeDataView';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const KpiCard = ({ title, value, icon: Icon, colorClass, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm hover:shadow-lg transition-all duration-300 group ${colorClass}`}
  >
    <div className="flex flex-col gap-3 relative z-10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
        <div className="p-2 rounded-xl bg-background/50 backdrop-blur-md shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
    <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-125 transform">
       <Icon className="w-32 h-32" />
    </div>
  </motion.div>
);

const GlobalInventory: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const warehouses = Array.from(new Set(data.map(item => item.warehouseName))).filter(Boolean);
  const filterCategories = Array.from(new Set(data.map(item => item.categoryName))).filter(Boolean);

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = selectedWarehouses.length === 0 || selectedWarehouses.includes(item.warehouseName);
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.categoryName);
    
    return matchesSearch && matchesWarehouse && matchesCategory;
  });

  // KPI Calculations based on filtered data
  const activeWhCount = Array.from(new Set(filteredData.map(i => i.warehouseName))).filter(Boolean).length;
  const totalSkus = Array.from(new Set(filteredData.map(i => i.sku))).length;
  const totalStock = Math.round(filteredData.reduce((sum, i) => sum + i.quantity, 0));
  const lowStockCount = filteredData.filter(i => i.quantity <= 50).length;
  const totalCategories = Array.from(new Set(filteredData.map(i => i.categoryName))).length;
  const averageStock = totalSkus > 0 ? Math.round(totalStock / totalSkus) : 0;
  const totalValuation = filteredData.reduce((sum, i) => sum + (i.quantity * (i.rate || 0)), 0);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 min-h-screen bg-background/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner">
              <Globe className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Global Inventory
            </h1>
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Cross-warehouse asset oversight & analytics
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search SKU, Product, or Category..." 
              className="pl-10 w-[260px] bg-card/50 backdrop-blur-sm border-border/50 rounded-xl focus:ring-primary/20 focus:bg-card transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[160px] rounded-xl bg-card/50 backdrop-blur-sm border-border/50 justify-start gap-2 font-medium text-foreground hover:bg-card transition-all">
                <Tags className="w-4 h-4 text-primary" />
                {selectedCategories.length === 0 ? "All Categories" : `${selectedCategories.length} Selected`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]" align="end">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedCategories.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedCategories([]);
                }}
              >
                All Categories
              </DropdownMenuCheckboxItem>
              {filterCategories.map(cat => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={selectedCategories.includes(cat)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCategories(prev => [...prev, cat]);
                    } else {
                      setSelectedCategories(prev => prev.filter(c => c !== cat));
                    }
                  }}
                >
                  {cat}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[160px] rounded-xl bg-card/50 backdrop-blur-sm border-border/50 justify-start gap-2 font-medium text-foreground hover:bg-card transition-all">
                <Warehouse className="w-4 h-4 text-primary" />
                {selectedWarehouses.length === 0 ? "All Locations" : `${selectedWarehouses.length} Selected`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]" align="end">
              <DropdownMenuLabel>Filter by Warehouse</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedWarehouses.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedWarehouses([]);
                }}
              >
                All Warehouses
              </DropdownMenuCheckboxItem>
              {warehouses.map(wh => (
                <DropdownMenuCheckboxItem
                  key={wh}
                  checked={selectedWarehouses.includes(wh)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedWarehouses(prev => [...prev, wh]);
                    } else {
                      setSelectedWarehouses(prev => prev.filter(w => w !== wh));
                    }
                  }}
                >
                  {wh}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            onClick={loadGlobalInventory}
            className="p-2.5 rounded-xl border border-border/50 bg-card/50 hover:bg-card text-foreground hover:text-primary shadow-sm transition-all active:scale-95 group"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>
      </div>

      {/* Dynamic KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <KpiCard 
          title="Active Locations" 
          value={activeWhCount} 
          icon={Warehouse} 
          delay={0.1}
          colorClass="bg-gradient-to-br from-blue-500/10 to-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-500/20" 
        />
        <KpiCard 
          title="Unique SKUs" 
          value={totalSkus} 
          icon={Layers} 
          delay={0.15}
          colorClass="bg-gradient-to-br from-purple-500/10 to-purple-600/5 text-purple-600 dark:text-purple-400 border-purple-500/20" 
        />
        <KpiCard 
          title="Total Global Stock" 
          value={totalStock} 
          icon={Package} 
          delay={0.2}
          colorClass="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
        />
        <KpiCard 
          title="Stock Valuation" 
          value={`₹${totalValuation.toLocaleString('en-IN')}`} 
          icon={IndianRupee} 
          delay={0.22}
          colorClass="bg-gradient-to-br from-green-500/10 to-green-600/5 text-green-600 dark:text-green-400 border-green-500/20" 
        />
        <KpiCard 
          title="Low Stock Alerts" 
          value={lowStockCount} 
          icon={AlertTriangle} 
          delay={0.25}
          colorClass="bg-gradient-to-br from-rose-500/10 to-rose-600/5 text-rose-600 dark:text-rose-400 border-rose-500/20" 
        />
        <KpiCard 
          title="Categories" 
          value={totalCategories} 
          icon={Tags} 
          delay={0.3}
          colorClass="bg-gradient-to-br from-amber-500/10 to-amber-600/5 text-amber-600 dark:text-amber-400 border-amber-500/20" 
        />
        <KpiCard 
          title="Avg Stock/SKU" 
          value={averageStock} 
          icon={TrendingUp} 
          delay={0.35}
          colorClass="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" 
        />
      </div>

      {/* Main Table */}
      <SafeDataView data={data} isLoading={loading} error={error} onRetry={loadGlobalInventory} emptyMessage="No inventory data found across system.">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="shadow-2xl rounded-2xl overflow-hidden border border-border/50 bg-card">
          <DataTable 
            columns={['Product', 'SKU', 'Category', 'Rate', 'Stock Level', 'Value', 'Warehouse', 'Status']}
            rows={filteredData.map((item, idx) => [
              <p key={`name-${idx}`} className="font-bold text-foreground/90">{item.productName}</p>,
              <code key={`sku-${idx}`} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-muted-foreground">{item.sku}</code>,
              <span key={`cat-${idx}`} className="text-xs text-muted-foreground font-medium">{item.categoryName}</span>,
              <span key={`rate-${idx}`} className="text-xs font-mono font-bold text-muted-foreground">₹{(item.rate || 0).toLocaleString('en-IN')}</span>,
              <div key={`stock-${idx}`} className="flex items-center gap-2">
                 <span className="font-black text-sm">{Math.round(item.quantity)}</span>
                 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{item.unit?.name || (typeof item.unit === 'string' ? item.unit : '') || '—'}</span>
              </div>,
              <span key={`val-${idx}`} className="text-xs font-mono font-bold text-green-600 dark:text-green-400">₹{(item.quantity * (item.rate || 0)).toLocaleString('en-IN')}</span>,
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
