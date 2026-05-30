import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { Plus, X } from 'lucide-react';
import { useProducts } from '@/hooks/inventory/useProducts';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { useSaleMutations } from '@/hooks/inventory/useSales';

interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: any;
}

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const SalesModal: React.FC<SalesModalProps> = ({ isOpen, onClose, sale }) => {
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const { saveSale } = useSaleMutations();

  const [form, setForm] = useState<any>({
    lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18 }]
  });

  useEffect(() => {
    if (sale) setForm(sale);
    else setForm({ lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18 }] });
  }, [sale, isOpen]);

  const addLineItem = () => {
    setForm({ ...form, lineItems: [...(form.lineItems || []), { productId: '', quantity: 0, rate: 0, tax_percent: 18 }] });
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
    await saveSale(form);
    onClose();
  };

  const grandTotal = (form.lineItems || []).reduce((acc: number, it: any) => 
    acc + (it.quantity || 0) * (it.rate || 0) * (1 + (it.tax_percent || 0) / 100), 0
  );

  return (
    <Modal isOpen={isOpen} title={sale?.id ? 'Edit Sale' : 'New Sale Registration'} onClose={onClose}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        
        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/20 rounded-xl border border-border/40">
          <div>
            <label className="text-[11px] font-semibold block mb-1">Customer Name</label>
            <input value={form.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="Client Name" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Source Warehouse</label>
            <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs">
              <option value="">-- Choose Warehouse --</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Invoice/Challan Number</label>
            <input value={form.challanNumber || ''} onChange={e => setForm({ ...form, challanNumber: e.target.value })}
              placeholder="INV-1001" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-foreground/70">Line Items</p>
            <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 text-[10px]">
              <Plus className="w-3 h-3 mr-1" /> Add Row
            </Button>
          </div>
          
          <div className="space-y-2">
            {(form.lineItems || []).map((item: any, i: number) => (
              <div key={i} className="space-y-2 border border-border/50 rounded-xl p-3 bg-muted/5 relative">
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium text-muted-foreground block">Product</label>
                    <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
                      <option value="">-- Product --</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block">Qty</label>
                    <input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value))}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block">Rate</label>
                    <input type="number" value={item.rate} onChange={e => updateLineItem(i, 'rate', parseFloat(e.target.value))}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block">Tax %</label>
                    <input type="number" value={item.tax_percent} onChange={e => updateLineItem(i, 'tax_percent', parseFloat(e.target.value))}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
                  </div>
                  <div className="flex justify-center pb-1">
                    <button onClick={() => removeLineItem(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-success text-success-foreground px-4 py-3 rounded-xl flex items-center justify-between shadow-lg shadow-success/20">
            <div className="text-[11px] font-semibold uppercase opacity-90">Total Value</div>
            <div className="text-xl font-bold font-mono">{Currency(grandTotal)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Invoice</Button>
        </div>
      </div>
    </Modal>
  );
};
