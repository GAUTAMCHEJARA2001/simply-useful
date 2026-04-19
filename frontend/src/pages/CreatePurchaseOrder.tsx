import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  Plus, Trash2, ShoppingCart, Check, ChevronsUpDown, 
  ArrowLeft, Calendar as CalendarIcon, Warehouse
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

interface POItem {
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  tax_percent: number;
  line_total: number;
  remark: string;
}

const CreatePurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data States
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPO, setSubmittedPO] = useState<any>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<POItem[]>([
    { product_id: '', product_name: '', quantity: 0, rate: 0, tax_percent: 0, line_total: 0, remark: '' }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, w, p] = await Promise.all([
          apiClient<any[]>('/inv/masters/suppliers'),
          apiClient<any[]>('/inv/masters/warehouses'),
          apiClient<any[]>('/inv/masters/products')
        ]);
        setSuppliers(s);
        setWarehouses(w);
        setProducts(p);
      } catch (err: any) {
        toast({ title: 'Load failed', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const selectedSupplier = useMemo(() => 
    suppliers.find(s => s.id === supplierId), 
  [suppliers, supplierId]);

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.product_name = prod.name;
        item.rate = Number(prod.rate || 0);
      }
    }
    
    const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
    const rate = Number(field === 'rate' ? value : item.rate) || 0;
    const tax = Number(field === 'tax_percent' ? value : item.tax_percent) || 0;
    
    item.line_total = (qty * rate) * (1 + tax/100);
    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { product_id: '', product_name: '', quantity: 0, rate: 0, tax_percent: 0, line_total: 0, remark: '' }]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const base = item.quantity * item.rate;
      const tax = base * (item.tax_percent / 100);
      return {
        tax: acc.tax + tax,
        net: acc.net + base + tax
      };
    }, { tax: 0, net: 0 });
  }, [items]);

  const handleSubmit = async () => {
    if (!supplierId || items.some(i => !i.product_id || i.quantity <= 0)) {
      toast({ title: 'Invalid Form', description: 'Please select a supplier and fill item details.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient<any>('/inv/transactions/purchase-orders', {
        method: 'POST',
        data: {
          supplier_id: supplierId,
          warehouse_id: warehouseId,
          expected_date: expectedDate,
          remarks,
          items: items.filter(i => i.product_id)
        }
      });
      setSubmittedPO(res);
      toast({ title: 'Success', description: `Purchase Order ${res.po_number} created!` });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  if (submittedPO) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
          <Check className="w-10 h-10 text-success" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold">{submittedPO.po_number} Created Successfully!</h2>
          <p className="text-muted-foreground mt-2">The Purchase Order has been saved as a formal document.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/inventory/manage')}>Back to Inventory</Button>
          <PDFGenerator 
              type="PURCHASE_ORDER" 
              data={{
                orderNo: submittedPO.po_number,
                date: new Date().toLocaleDateString('en-IN'),
                party: {
                  name: selectedSupplier?.name || '—',
                  address: selectedSupplier?.address || '—',
                  gst: selectedSupplier?.gst_number || '—',
                  contact: selectedSupplier?.contact_info || '—',
                },
                totals: {
                  subtotal: submittedPO.net_amount - (submittedPO.total_tax || 0),
                  tax: submittedPO.total_tax || 0,
                  grandTotal: submittedPO.net_amount,
                },
                items: items.map(it => ({
                    product_id: it.product_id,
                    product_name: it.product_name,
                    qty: it.quantity,
                    unit: products.find(p => p.id === it.product_id)?.unit || 'Bags',
                    rate: it.rate,
                    total: it.line_total,
                    remark: it.remark
                }))
              }}
              filename={`${submittedPO.po_number}.pdf`}
              buttonLabel="Print Purchase Order Now"
            />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Purchase Order</h1>
          <p className="text-muted-foreground">Issue a formal PO to your supplier.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-primary/10 shadow-lg">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider opacity-60">Supplier & Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-12 border-primary/20"><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedSupplier && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs space-y-1 bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <p className="font-semibold text-primary">{selectedSupplier.name}</p>
                    <p className="text-muted-foreground">{selectedSupplier.address}</p>
                    <p className="text-muted-foreground">GST: {selectedSupplier.gst_number || 'N/A'}</p>
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="h-12 border-primary/20" />
                <div className="mt-4 space-y-2">
                   <Label>Target Warehouse (Optional)</Label>
                   <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className="h-12 border-primary/20"><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider opacity-60">Line Items</CardTitle>
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {items.map((item, idx) => (
                <motion.div key={idx} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative border border-border/50 rounded-xl p-4 transition-all hover:border-primary/30 bg-card hover:shadow-sm">
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5 space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Product</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between h-10 px-3 font-normal">
                            {item.product_name ? <span className="truncate">{item.product_name}</span> : "Select Product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search product..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((p) => (
                                  <CommandItem key={p.id} value={p.name} onSelect={() => updateItem(idx, 'product_id', p.id)}>
                                    <Check className={`mr-2 h-4 w-4 ${item.product_id === p.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{p.name}</span>
                                      <span className="text-[10px] text-muted-foreground">₹{p.rate || 0} / {p.unit || 'Unit'}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Qty</Label>
                      <Input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" className="h-10" />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rate</Label>
                      <Input type="number" value={item.rate || ''} onChange={e => updateItem(idx, 'rate', e.target.value)} placeholder="0.00" className="h-10" />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tax%</Label>
                      <Input type="number" value={item.tax_percent || ''} onChange={e => updateItem(idx, 'tax_percent', e.target.value)} placeholder="0" className="h-10" />
                    </div>

                    <div className="md:col-span-10">
                      <Input value={item.remark} onChange={e => updateItem(idx, 'remark', e.target.value)} placeholder="Line item remark..." className="h-8 text-xs bg-muted/20" />
                    </div>
                    
                    <div className="md:col-span-2 text-right">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total</p>
                       <p className="font-bold text-primary">₹{Number(item.line_total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-xl sticky top-6">
            <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{(totals.net - totals.tax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span className="text-muted-foreground">Total Tax</span>
                  <span className="font-medium">+ ₹{totals.tax.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-primary/20 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-2xl font-black text-primary">₹{totals.net.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold opacity-60">General Remarks</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Order instructions..." className="min-h-[100px] text-sm bg-white" />
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 action-button">
                 {submitting ? "Saving..." : <><ShoppingCart className="mr-2" /> Generate & Save PO</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseOrder;
