import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { Plus, X } from 'lucide-react';
import { useProducts } from '@/hooks/inventory/useProducts';
import { useReturnMutations } from '@/hooks/inventory/useReturns';

interface ReturnOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnOrder?: any;
  defaultType?: 'Sales Return' | 'Purchase Return';
}

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ isOpen, onClose, returnOrder, defaultType = 'Sales Return' }) => {
  const { saveReturn, isSavingReturn } = useReturnMutations();
  const { data: products = [] } = useProducts();

  const [form, setForm] = useState<any>({
    type: defaultType,
    partyName: '',
    challanNumber: '',
    originalBillNumber: '',
    vehicleNumber: '',
    returnReason: '',
    returnDate: new Date().toISOString().split('T')[0],
    lineItems: [{ productId: '', qty: 0, price: 0 }]
  });

  useEffect(() => {
    if (returnOrder && isOpen) {
      const mappedLineItems = (returnOrder.items || []).map((it: any) => ({
        productId: it.productId || it.product_id || it.productid_id || it.product?.id || '',
        qty: it.qty || 0,
        price: it.price || it.rate || 0,
      }));
      
      setForm({
        ...returnOrder,
        type: returnOrder.type || defaultType,
        partyName: returnOrder.party?.name || returnOrder.party?.dealerName || returnOrder.party?.distributorName || returnOrder.partyName || '',
        challanNumber: returnOrder.challanNumber || returnOrder.challan_number || '',
        originalBillNumber: returnOrder.originalBillNumber || returnOrder.original_bill_number || '',
        vehicleNumber: returnOrder.vehicleNumber || returnOrder.vehicle_number || '',
        returnReason: returnOrder.returnReason || returnOrder.return_reason || '',
        returnDate: returnOrder.returnDate || returnOrder.return_date || new Date().toISOString().split('T')[0],
        lineItems: mappedLineItems.length > 0 ? mappedLineItems : [{ productId: '', qty: 0, price: 0 }]
      });
    } else {
      setForm({ 
        type: defaultType,
        partyName: '',
        challanNumber: '',
        originalBillNumber: '',
        vehicleNumber: '',
        returnReason: '',
        returnDate: new Date().toISOString().split('T')[0],
        lineItems: [{ productId: '', qty: 0, price: 0 }] 
      });
    }
  }, [returnOrder, isOpen, defaultType]);

  const addLineItem = () => {
    setForm({ ...form, lineItems: [...(form.lineItems || []), { productId: '', qty: 0, price: 0 }] });
  };

  const removeLineItem = (index: number) => {
    const updated = [...(form.lineItems || [])];
    updated.splice(index, 1);
    setForm({ ...form, lineItems: updated });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...(form.lineItems || [])];
    if (field === 'productId') {
      const selectedProd = products.find((p: any) => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        price: selectedProd ? selectedProd.rate || 0 : 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setForm({ ...form, lineItems: updated });
  };

  const grandTotal = (form.lineItems || []).reduce((acc: number, it: any) => 
    acc + (it.qty || 0) * (it.price || 0), 0
  );

  const handleSave = async () => {
    const payload = {
      ...form,
      netAmount: grandTotal,
      total_amount: grandTotal,
      items: (form.lineItems || []).map((it: any) => ({
        productId: it.productId,
        qty: it.qty,
        price: it.price,
        total: (it.qty || 0) * (it.price || 0)
      }))
    };
    await saveReturn(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title={returnOrder?.id ? 'Edit Return Order' : 'New Return Order'} onClose={onClose} className="max-w-4xl">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-border/40">
          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Type</label>
            <select value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs">
              <option value="Sales Return">Sales Return</option>
              <option value="Purchase Return">Purchase Return</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Customer / Supplier Name</label>
            <input value={form.partyName || ''} onChange={e => setForm({ ...form, partyName: e.target.value })}
              placeholder="Party Name" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Challan/Bill</label>
            <input value={form.challanNumber || ''} onChange={e => setForm({ ...form, challanNumber: e.target.value })}
              placeholder="RET-1001" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Original Bill Number</label>
            <input value={form.originalBillNumber || ''} onChange={e => setForm({ ...form, originalBillNumber: e.target.value })}
              placeholder="INV-1001" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Date</label>
            <input type="date" value={form.returnDate || ''} onChange={e => setForm({ ...form, returnDate: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Vehicle No</label>
            <input value={form.vehicleNumber || ''} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
              placeholder="GJ-05-XX-1234" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="text-[11px] font-semibold block mb-1">Return Reason / Narration</label>
            <input value={form.returnReason || ''} onChange={e => setForm({ ...form, returnReason: e.target.value })}
              placeholder="Damaged in transit, incorrect items, etc." className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-foreground/70">Returned Items</p>
            <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 text-[10px]">
              <Plus className="w-3 h-3 mr-1" /> Add Row
            </Button>
          </div>
          
          <div className="space-y-2">
            {(form.lineItems || []).map((item: any, i: number) => (
              <div key={i} className="space-y-2 border border-border/50 rounded-xl p-3 bg-muted/5 relative">
                <div className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium text-muted-foreground block">Product</label>
                    <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
                      <option value="">-- Product --</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name || p.productName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block">Return Qty</label>
                    <input type="number" value={item.qty} onChange={e => updateLineItem(i, 'qty', parseFloat(e.target.value))}
                      className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block">Rate</label>
                    <input type="number" value={item.price} onChange={e => updateLineItem(i, 'price', parseFloat(e.target.value))}
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

          <div className="bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center justify-between border border-red-500/20">
            <div className="text-[11px] font-semibold uppercase opacity-90">Total Return Value</div>
            <div className="text-xl font-bold font-mono">{Currency(grandTotal)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSavingReturn}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSavingReturn} className="bg-red-600 hover:bg-red-700 text-white">
            {isSavingReturn ? 'Saving...' : 'Save Return'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
