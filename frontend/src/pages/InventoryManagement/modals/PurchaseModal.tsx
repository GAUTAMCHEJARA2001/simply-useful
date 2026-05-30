import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { Plus, X, Link } from 'lucide-react';
import { useProducts } from '@/hooks/inventory/useProducts';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { useSuppliers } from '@/hooks/inventory/useSuppliers';
import { usePurchaseMutations } from '@/hooks/inventory/usePurchases';
import { usePurchaseOrders } from '@/hooks/inventory/usePurchaseOrders';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase?: any;
}

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const numberInputValue = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};
const parseNumberInput = (value: string) => {
  if (value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};
const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, purchase }) => {
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const { data: suppliers = [] } = useSuppliers();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { savePurchase } = usePurchaseMutations();

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const getFormattedDateString = (dateInput: any) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const [form, setForm] = useState<any>({
    date: getLocalDateString(),
    lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, remark: '' }]
  });

  useEffect(() => {
    if (purchase) {
      setForm({
        ...purchase,
        date: getFormattedDateString(purchase.date)
      });
    } else {
      setForm({
        date: getLocalDateString(),
        lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, remark: '' }]
      });
    }
  }, [purchase, isOpen]);

  const addLineItem = () => {
    setForm({ ...form, lineItems: [...(form.lineItems || []), { productId: '', quantity: 0, rate: 0, tax_percent: 18, remark: '' }] });
  };

  const removeLineItem = (index: number) => {
    const updated = [...(form.lineItems || [])];
    updated.splice(index, 1);
    setForm({ ...form, lineItems: updated });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...(form.lineItems || [])];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, lineItems: updated });
  };

  const handleSave = async () => {
    try {
      await savePurchase(form);
      onClose();
    } catch {
      // The mutation hook already shows the error toast.
    }
  };

  const grandTotal = (form.lineItems || []).reduce((acc: number, it: any) => 
    acc + toNumber(it.quantity) * toNumber(it.rate) * (1 + toNumber(it.tax_percent) / 100), 0
  );

  return (
    <Modal isOpen={isOpen} title={purchase?.id ? 'Edit Purchase' : 'New Purchase Registration'} onClose={onClose}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        
        {/* Link Purchase Order Option */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" /> Link to Purchase Order (Optional)
            </span>
            {form.purchase_order_id && (
              <button 
                onClick={() => setForm({ ...form, purchase_order_id: '', supplier_id: '', lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, remark: '' }] })}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Clear Link
              </button>
            )}
          </div>
          <select 
            value={form.purchase_order_id || ''} 
            onChange={e => {
              const poId = e.target.value;
              if (!poId) {
                setForm({
                  ...form,
                  purchase_order_id: '',
                  supplier_id: '',
                  lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, remark: '' }]
                });
                return;
              }
              const po = purchaseOrders.find((p: any) => String(p.id) === String(poId));
              if (po) {
                setForm({
                  ...form,
                  purchase_order_id: poId,
                  supplier_id: po.supplierId || po.supplier_id || '',
                  lineItems: (po.items || []).map((it: any) => ({
                    productId: it.product_id || it.productId || '',
                    quantity: numberInputValue(it.quantity ?? it.qty),
                    rate: numberInputValue(it.rate),
                    tax_percent: numberInputValue(it.tax_percent ?? it.taxPercent) || 18,
                    remark: it.remark || ''
                  }))
                });
              }
            }}
            className="w-full border border-primary/20 rounded-lg px-3 py-1.5 bg-background text-xs text-primary font-medium"
          >
            <option value="">-- Select PO to Autofill Items & Supplier --</option>
            {purchaseOrders
              .filter((po: any) => {
                const status = (po.status || '').toUpperCase();
                return status === 'ORDERED' || 
                       status === 'PARTIALLY_RECEIVED' || 
                       status === 'PENDING' || 
                       String(po.id) === String(form.purchase_order_id);
              })
              .map((po: any) => (
                <option key={po.id} value={po.id}>
                  {po.po_number || po.poNumber} — {po.supplier_name || po.supplier?.name || 'Unknown Supplier'} ({po.status})
                </option>
              ))
            }
          </select>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            Select a pending or partially received PO. The system will auto-populate products, ordered quantities, and rates. You can adjust the quantities below to match what you actually received (excess or deficit).
          </p>
        </div>

        {/* Supplier & Warehouse */}
        <div className="grid grid-cols-6 gap-4 p-5 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1.5">Purchase Date</label>
            <input 
              type="date" 
              value={form.date || ''} 
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
            />
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1.5">Challan Number</label>
            <input 
              value={form.challanNumber || ''} 
              onChange={e => setForm({ ...form, challanNumber: e.target.value })}
              placeholder="E.g., CH-4589" 
              className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
            />
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1.5">Vehicle Number</label>
            <input 
              value={form.vehicle_number || ''} 
              onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
              placeholder="HR-55-A-1234" 
              className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1.5">Supplier</label>
            <select 
              value={form.supplier_id || ''} 
              onChange={e => setForm({ ...form, supplier_id: e.target.value })}
              className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-6 md:col-span-3">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider block mb-1.5">Warehouse</label>
            <select 
              value={form.warehouse_id || ''} 
              onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
              className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="">-- Choose Warehouse --</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>
        
        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">Line Items</p>
            <Button size="sm" variant="outline" onClick={addLineItem} className="h-8 text-xs font-semibold rounded-xl hover:bg-primary/5 border-primary/20 text-primary transition-all duration-200 active:scale-95">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </div>
          
          <div className="space-y-3">
            {(form.lineItems || []).map((item: any, i: number) => (
              <div key={i} className="group relative border border-border/50 hover:border-primary/20 rounded-2xl p-4 bg-muted/10 hover:bg-card shadow-sm hover:shadow transition-all duration-300">
                <div className="grid grid-cols-6 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider block mb-1.5">Product</label>
                    <select 
                      value={item.productId} 
                      onChange={e => updateLineItem(i, 'productId', e.target.value)}
                      className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                    >
                      <option value="">-- Product --</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider block mb-1.5">Qty</label>
                    <input 
                      type="number" 
                      value={numberInputValue(item.quantity)} 
                      onChange={e => updateLineItem(i, 'quantity', parseNumberInput(e.target.value))}
                      className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider block mb-1.5">Rate</label>
                    <input 
                      type="number" 
                      value={numberInputValue(item.rate)} 
                      onChange={e => updateLineItem(i, 'rate', parseNumberInput(e.target.value))}
                      className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider block mb-1.5">Tax %</label>
                    <input 
                      type="number" 
                      value={numberInputValue(item.tax_percent)} 
                      onChange={e => updateLineItem(i, 'tax_percent', parseNumberInput(e.target.value))}
                      className="w-full border border-border/70 rounded-xl px-3 py-2 bg-background/50 hover:bg-background focus:bg-background text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                    />
                  </div>
                  <div className="flex justify-center pb-1">
                    <button 
                      onClick={() => removeLineItem(i)} 
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-xl transition-all active:scale-90"
                      title="Remove Row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
 
          <div className="bg-gradient-to-r from-primary to-primary/95 text-primary-foreground px-5 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-primary/10 transition-all duration-300">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">Grand Total</div>
            <div className="text-2xl font-black font-mono tracking-tight">{Currency(grandTotal)}</div>
          </div>
        </div>
 
        <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-5 text-xs font-bold tracking-wider uppercase border-border/70 hover:bg-muted active:scale-95 transition-all duration-200">Cancel</Button>
          <Button onClick={handleSave} className="rounded-xl h-11 px-6 text-xs font-bold tracking-wider uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 active:scale-95 transition-all duration-200">Save Purchase</Button>
        </div>
      </div>
    </Modal>
  );
};
