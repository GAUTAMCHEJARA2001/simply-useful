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

const extractChallanNumber = (narration: string) => {
  if (!narration) return '';
  let match = narration.match(/\[CHALLAN:\s*([^\]]+)\]/i);
  if (!match) {
    match = narration.match(/\[INVOICE:\s*([^\]]+)\]/i);
  }
  return match ? match[1] : '';
};

const extractWarehouseId = (narration: string) => {
  if (!narration) return '';
  const match = narration.match(/\[WAREHOUSE ID:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : '';
};

const extractDispatchDetails = (narration: string) => {
  if (!narration) return { invoice: '', vehicle: '', driver: '', mobile: '', dispatchDate: '', dispatchTime: '', warehouseName: '', warehouseId: '' };
  const invoiceMatch = narration.match(/\[CHALLAN:\s*([^\]]+)\]/i) || narration.match(/\[INVOICE:\s*([^\]]+)\]/i);
  const vehicleMatch = narration.match(/\[VEHICLE:\s*([^\]]+)\]/i);
  const driverMatch = narration.match(/\[DRIVER:\s*([^\]]+)\]/i);
  const mobileMatch = narration.match(/\[DRIVER MOBILE:\s*([^\]]+)\]/i);
  const dateMatch = narration.match(/\[DISPATCH DATE:\s*([^\]]+)\]/i);
  const timeMatch = narration.match(/\[DISPATCH TIME:\s*([^\]]+)\]/i);
  const warehouseMatch = narration.match(/\[WAREHOUSE:\s*([^\]]+)\]/i);
  const warehouseIdMatch = narration.match(/\[WAREHOUSE ID:\s*([^\]]+)\]/i);
  
  return {
    invoice: invoiceMatch ? invoiceMatch[1].trim() : '',
    vehicle: vehicleMatch ? vehicleMatch[1].trim() : '',
    driver: driverMatch ? driverMatch[1].trim() : '',
    mobile: mobileMatch ? mobileMatch[1].trim() : '',
    dispatchDate: dateMatch ? dateMatch[1].trim() : '',
    dispatchTime: timeMatch ? timeMatch[1].trim() : '',
    warehouseName: warehouseMatch ? warehouseMatch[1].trim() : '',
    warehouseId: warehouseIdMatch ? warehouseIdMatch[1].trim() : '',
  };
};

export const SalesModal: React.FC<SalesModalProps> = ({ isOpen, onClose, sale }) => {
  const { data: warehouses = [] } = useWarehouses();
  const { saveSale } = useSaleMutations();
  const extractedDetails = extractDispatchDetails(sale?.narration || '');

  const [form, setForm] = useState<any>({
    lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18 }]
  });

  const { data: products = [] } = useProducts({ warehouseId: form.warehouse_id });

  useEffect(() => {
    if (sale && isOpen) {
      // Map Order object to SalesModal form shape
      const mappedLineItems = (sale.items || []).map((it: any) => ({
        productId: it.productId || it.product_id || it.productid_id || it.product?.id || '',
        quantity: it.qty || 0,
        rate: it.price || 0,
        tax_percent: it.tax_percent || 18
      }));
      
      const whId = sale.assignedWarehouse || extractWarehouseId(sale.narration) || sale.warehouseId || sale.warehouse_id || '';
      
      const cleanNarration = sale.narration ? sale.narration
        .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
        .replace(/\[CHALLAN:\s*[^\]]+\]/gi, '')
        .replace(/\[WAREHOUSE:\s*[^\]]+\]/gi, '')
        .replace(/\[WAREHOUSE ID:\s*[^\]]+\]/gi, '')
        .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
        .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
        .replace(/\[DRIVER MOBILE:\s*[^\]]+\]/gi, '')
        .replace(/\[DISPATCH DATE:\s*[^\]]+\]/gi, '')
        .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
        .replace(/\[REJECTION REASON:\s*[^\]]+\]/gi, '')
        .replace(/\[REJECTION DATE:\s*[^\]]+\]/gi, '')
        .replace(/\[RETURN REASON:\s*[^\]]+\]/gi, '')
        .replace(/\[RETURN DATE:\s*[^\]]+\]/gi, '')
        .trim() : '';

      setForm({
        ...sale,
        customerName: sale.partyName || sale.customerName || '',
        challanNumber: sale.invoiceNumber || extractChallanNumber(sale.narration) || sale.challanNumber || '',
        warehouse_id: whId,
        narration: cleanNarration || sale.narration || '',
        lineItems: mappedLineItems.length > 0 ? mappedLineItems : [{ productId: '', quantity: 0, rate: 0, tax_percent: 18 }]
      });
    } else {
      setForm({ lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18 }] });
    }
  }, [sale, isOpen]);

  // Resolve warehouse name (e.g. "NASHIK") to numeric ID (e.g. 7) once warehouses load
  useEffect(() => {
    if (!isOpen || !form || warehouses.length === 0) return;
    const currentWhId = String(form.warehouse_id || '');
    if (!currentWhId) return;
    
    // Already a valid numeric warehouse ID — no resolution needed
    const isIdValid = warehouses.some((w: any) => String(w.id) === currentWhId);
    if (isIdValid) return;
    
    // Try to match by name
    const matchingWh = warehouses.find((w: any) => 
      w.name.toLowerCase().trim() === currentWhId.toLowerCase().trim()
    );
    if (matchingWh) {
      setForm((prev: any) => ({ ...prev, warehouse_id: matchingWh.id }));
    }
  }, [warehouses, isOpen]); // Note: deliberately excludes form.warehouse_id to prevent loops

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
    if (field === 'productId') {
      const selectedProd = products.find((p: any) => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        rate: selectedProd ? selectedProd.rate || 0 : 0,
        tax_percent: selectedProd ? selectedProd.gst || 18 : 18
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setForm({ ...form, lineItems: updated });
  };

  const grandTotal = (form.lineItems || []).reduce((acc: number, it: any) => 
    acc + (it.quantity || 0) * (it.rate || 0) * (1 + (it.tax_percent || 0) / 100), 0
  );

  const handleSave = async () => {
    const rawNarration = form.narration || '';
    const cleanNarration = rawNarration
      .replace(/\[CHALLAN:\s*[^\]]+\]/gi, '')
      .replace(/\[WAREHOUSE:\s*[^\]]+\]/gi, '')
      .replace(/\[WAREHOUSE ID:\s*[^\]]+\]/gi, '')
      .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
      .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
      .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
      .replace(/\[DRIVER MOBILE:\s*[^\]]+\]/gi, '')
      .replace(/\[DISPATCH DATE:\s*[^\]]+\]/gi, '')
      .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
      .trim();

    const selectedWh = warehouses.find((w: any) => String(w.id) === String(form.warehouse_id));

    const payload = {
      ...form,
      partyName: form.customerName || form.partyName || '',
      partyType: form.partyType || 'Dealer',
      status: form.status || 'Completed',
      grandTotal: grandTotal,
      narration: cleanNarration,
      warehouse_id: form.warehouse_id || '',
      invoiceNumber: form.challanNumber || '',
      dispatchWarehouse: selectedWh ? selectedWh.name : '',
      dispatchDate: form.dispatchDate || sale?.dispatchDate || new Date().toISOString().split('T')[0],
      items: (form.lineItems || []).map((it: any) => ({
        productId: it.productId,
        qty: it.quantity,
        price: it.rate,
        total: (it.quantity || 0) * (it.rate || 0),
        tax_percent: it.tax_percent || 18
      }))
    };
    await saveSale(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title={sale?.id ? 'Edit Sale' : 'New Sale Registration'} onClose={onClose}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        
        {sale?.id && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl text-xs space-y-3">
            <p className="font-bold uppercase tracking-wider text-purple-700 text-[10px] flex items-center gap-1.5">
              📋 Sale &amp; Fulfillment Context
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-muted-foreground">
              <div>
                <span className="font-bold text-foreground/80 block">Placed By (Sales Officer)</span>
                <span className="text-foreground font-medium">{sale.soEmail || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Customer / Party Name</span>
                <span className="text-foreground font-medium">{sale.partyName || sale.customerName || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Order Placed Date</span>
                <span className="text-foreground font-medium">
                  {sale.date ? new Date(sale.date).toLocaleString('en-IN') : '—'}
                </span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Dispatched Date / Time</span>
                <span className="text-foreground font-medium">
                  {extractedDetails.dispatchDate || extractedDetails.dispatchTime || sale.dispatchDate || '—'}
                </span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Dispatch Vehicle Number</span>
                <span className="text-foreground font-medium">{extractedDetails.vehicle || sale.vehicleNumber || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Driver Details</span>
                <span className="text-foreground font-medium">
                  {extractedDetails.driver ? `${extractedDetails.driver} ${extractedDetails.mobile ? `(${extractedDetails.mobile})` : ''}` : (sale.driverName ? `${sale.driverName} ${sale.driverMobileNumber ? `(${sale.driverMobileNumber})` : ''}` : '—')}
                </span>
              </div>
              <div className="col-span-2 md:col-span-3">
                <span className="font-bold text-foreground/80 block">Fulfillment Location (Warehouse)</span>
                <span className="text-foreground font-semibold">
                  {extractedDetails.warehouseName || sale.warehouseName || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

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
          <div className="col-span-2">
            <label className="text-[11px] font-semibold block mb-1">Remarks / Narration</label>
            <textarea value={form.narration || ''} onChange={e => setForm({ ...form, narration: e.target.value })}
              placeholder="Enter remarks/narration notes..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-xs min-h-16" />
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
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name || p.productName}</option>)}
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
