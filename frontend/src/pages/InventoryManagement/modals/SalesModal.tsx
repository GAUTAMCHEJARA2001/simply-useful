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
  readOnly?: boolean;
  isDispatchLog?: boolean;
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

const formatDateForInput = (dVal: any) => {
  if (!dVal) return '';
  if (typeof dVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dVal.trim())) {
    return dVal.trim();
  }
  try {
    const d = new Date(dVal);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (_) {}
  return '';
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

const cleanGeneralNarration = (narration: string) => {
  if (!narration) return '';
  return narration
    .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
    .replace(/\[CHALLAN:\s*[^\]]+\]/gi, '')
    .replace(/\[WAREHOUSE:\s*[^\]]+\]/gi, '')
    .replace(/\[WAREHOUSE ID:\s*[^\]]+\]/gi, '')
    .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
    .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
    .replace(/\[DRIVER MOBILE:\s*[^\]]+\]/gi, '')
    .replace(/\[DISPATCH DATE:\s*[^\]]+\]/gi, '')
    .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
    .replace(/\[DISPATCH REMARKS:\s*([^\]]+)\]/gi, '$1')
    .replace(/\[REJECTION REASON:\s*[^\]]+\]/gi, '')
    .replace(/\[REJECTION DATE:\s*[^\]]+\]/gi, '')
    .replace(/\[RETURN REASON:\s*[^\]]+\]/gi, '')
    .replace(/\[RETURN DATE:\s*[^\]]+\]/gi, '')
    .trim();
};

export const SalesModal: React.FC<SalesModalProps> = ({ isOpen, onClose, sale, readOnly, isDispatchLog }) => {
  const { data: warehouses = [] } = useWarehouses();
  const { saveSale, saveDispatchLog } = useSaleMutations();
  const extractedDetails = extractDispatchDetails(sale?.narration || '');

  const [form, setForm] = useState<any>({
    lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, returnedQty: 0, itemRemark: '' }]
  });

  const { data: products = [] } = useProducts({ warehouseId: form.warehouse_id });
  const [initializedSaleId, setInitializedSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInitializedSaleId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (sale && isOpen && initializedSaleId !== sale.id) {
      // Map Order object to SalesModal form shape
      const mappedLineItems = (sale.items || []).map((it: any) => ({
        id: it.id || '',
        productId: it.productId || it.product_id || it.productid_id || it.product?.id || '',
        quantity: it.qty || 0,
        rate: it.price || 0,
        tax_percent: it.tax_percent || 18,
        returnedQty: it.returnedQty || 0,
        itemRemark: it.itemRemark || it.item_remark || it.remark || ''
      }));
      
      const whId = sale.assignedWarehouse || extractWarehouseId(sale.narration) || sale.warehouseId || sale.warehouse_id || '';
      
      const rawNarration = sale.narration || sale.remarks || '';
      const cleanNarration = cleanGeneralNarration(rawNarration);

      const parsedDispatchDate = formatDateForInput(sale.dispatchDate || extractedDetails.dispatchDate || '') || new Date().toISOString().split('T')[0];
      const parsedSaleDate = formatDateForInput(sale.date || sale.orderDate || sale.createdAt) || new Date().toISOString().split('T')[0];

      setForm({
        ...sale,
        customerName: sale.partyName || sale.customerName || '',
        challanNumber: sale.invoiceNumber || extractChallanNumber(sale.narration) || sale.challanNumber || '',
        warehouse_id: whId,
        date: parsedSaleDate,
        dispatchDate: parsedDispatchDate,
        narration: cleanNarration || rawNarration || '',
        lineItems: mappedLineItems.length > 0 ? mappedLineItems : [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, returnedQty: 0, itemRemark: '' }],
        vehicleNumber: sale.vehicleNumber || sale.vehiclenumber || sale.vehicle_number || extractedDetails.vehicle || '',
        driverName: sale.driverName || sale.drivername || sale.driver_name || extractedDetails.driver || '',
        driverMobile: sale.driverMobileNumber || sale.driverMobile || sale.drivermobile || sale.driver_mobile || extractedDetails.mobile || '',
      });
      setInitializedSaleId(sale.id);
    } else if (!sale && isOpen && initializedSaleId !== 'new') {
      setForm({ 
        date: new Date().toISOString().split('T')[0],
        dispatchDate: new Date().toISOString().split('T')[0],
        lineItems: [{ productId: '', quantity: 0, rate: 0, tax_percent: 18, returnedQty: 0, itemRemark: '' }] 
      });
      setInitializedSaleId('new');
    }
  }, [sale, isOpen, initializedSaleId]);

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
    setForm({ ...form, lineItems: [...(form.lineItems || []), { productId: '', quantity: 0, rate: 0, tax_percent: 18, returnedQty: 0, itemRemark: '' }] });
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
    acc + ((it.quantity || 0) - (it.returnedQty || 0)) * (it.rate || 0) * (1 + (it.tax_percent || 0) / 100), 0
  );

  const handleSave = async () => {
    const rawNarration = form.narration || '';
    const cleanNarration = cleanGeneralNarration(rawNarration);

    const selectedWh = warehouses.find((w: any) => String(w.id) === String(form.warehouse_id));
    const finalRemarks = form.narration || cleanNarration;

    const payload = {
      ...form,
      partyName: form.customerName || form.partyName || '',
      partyType: form.partyType || 'Dealer',
      status: form.status || 'Completed',
      grandTotal: grandTotal,
      narration: finalRemarks,
      remarks: finalRemarks,
      date: form.date || new Date().toISOString().split('T')[0],
      assignedWarehouse: form.warehouse_id || '',
      warehouse_id: form.warehouse_id || '',
      invoiceNumber: form.challanNumber || '',
      dispatchWarehouse: selectedWh ? selectedWh.name : '',
      dispatchDate: form.dispatchDate || sale?.dispatchDate || '',
      vehicleNumber: form.vehicleNumber || '',
      driverName: form.driverName || '',
      driverMobile: form.driverMobile || '',
      driverMobileNumber: form.driverMobile || '',
      items: (form.lineItems || []).map((it: any) => ({
        id: it.id || undefined,
        productId: it.productId,
        qty: it.quantity,
        price: it.rate,
        total: (it.quantity || 0) * (it.rate || 0),
        tax_percent: it.tax_percent || 18,
        returnedQty: it.returnedQty || 0,
        itemRemark: it.itemRemark || ''
      }))
    };
    
    if (isDispatchLog) {
      await saveDispatchLog({
        id: sale.id,
        invoiceNumber: form.challanNumber || '',
        vehicleNumber: form.vehicleNumber || extractedDetails.vehicle || '',
        driverName: form.driverName || extractedDetails.driver || '',
        driverMobile: form.driverMobile || extractedDetails.mobile || '',
        driverMobileNumber: form.driverMobile || extractedDetails.mobile || '',
        dispatchDate: form.dispatchDate || new Date().toISOString().split('T')[0],
        orderDate: form.date,
        date: form.date,
        partyName: form.customerName || form.partyName || '',
        customerName: form.customerName || form.partyName || '',
        warehouse_id: form.warehouse_id || '',
        remarks: finalRemarks,
        narration: finalRemarks,
        items: payload.items
      });
      if (sale.originalOrderId) {
        try {
          await saveSale({
            ...payload,
            id: sale.originalOrderId,
          });
        } catch (_) {}
      }
    } else {
      await saveSale(payload);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title={readOnly ? 'View Transaction' : (sale?.id ? (isDispatchLog ? 'Edit Dispatch' : 'Edit Sale') : 'New Sale Registration')} onClose={onClose}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <fieldset disabled={readOnly} className="space-y-4">
        {sale?.id && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl text-xs space-y-3">
            <p className="font-bold uppercase tracking-wider text-purple-700 text-[10px] flex items-center gap-1.5">
              📋 Sale &amp; Fulfillment Context
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-muted-foreground">
              <div>
                <span className="font-bold text-foreground/80 block">Order ID</span>
                <span className="text-foreground font-medium">{sale.orderId || sale.originalOrderId || sale.id || '—'}</span>
              </div>
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
                  {(() => {
                    const rawO = sale.orderDate || sale.date || sale.createdAt;
                    if (!rawO) return '—';
                    try {
                      if (typeof rawO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawO.trim())) {
                        const [y, m, d] = rawO.trim().split('-');
                        return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
                      }
                      const parsed = new Date(rawO);
                      return isNaN(parsed.getTime()) ? String(rawO) : parsed.toLocaleString('en-IN');
                    } catch {
                      return String(rawO);
                    }
                  })()}
                </span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Dispatched Date / Time</span>
                <span className="text-foreground font-medium">
                  {(() => {
                    const rawDate = extractedDetails.dispatchDate || extractedDetails.dispatchTime || sale.dispatchDate || sale.dispatchdate || sale.dispatch_date || form.dispatchDate;
                    if (!rawDate) return '—';
                    try {
                      if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
                        const [y, m, d] = rawDate.trim().split('-');
                        return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
                      }
                      const parsed = new Date(rawDate);
                      return isNaN(parsed.getTime()) ? String(rawDate) : parsed.toLocaleString('en-IN');
                    } catch {
                      return String(rawDate);
                    }
                  })()}
                </span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Dispatch Vehicle Number</span>
                <span className="text-foreground font-medium">
                  {extractedDetails.vehicle || sale.vehicleNumber || sale.vehiclenumber || sale.vehicle_number || form.vehicleNumber || '—'}
                </span>
              </div>
              <div>
                <span className="font-bold text-foreground/80 block">Driver Details</span>
                <span className="text-foreground font-medium">
                  {(() => {
                    const dName = extractedDetails.driver || sale.driverName || sale.drivername || sale.driver_name || form.driverName || '';
                    const dMobile = extractedDetails.mobile || sale.driverMobileNumber || sale.driverMobile || sale.drivermobile || sale.driver_mobile || form.driverMobile || form.driverMobileNumber || '';
                    if (!dName && !dMobile) return '—';
                    if (dName && dMobile) return `${dName} (${dMobile})`;
                    return dName || dMobile || '—';
                  })()}
                </span>
              </div>
              <div className="col-span-2 md:col-span-3">
                <span className="font-bold text-foreground/80 block">Fulfillment Location (Warehouse)</span>
                <span className="text-foreground font-semibold">
                  {(() => {
                    const whId = sale.warehouseid_id || sale.warehouse_id || sale.warehouseId || sale.assignedWarehouse || form.warehouse_id;
                    const matchedWh = warehouses.find((w: any) => String(w.id) === String(whId));
                    return extractedDetails.warehouseName || sale.warehouseName || sale.dispatchWarehouse || matchedWh?.name || '—';
                  })()}
                </span>
              </div>
              {cleanGeneralNarration(sale.narration || sale.remarks || '') && (
                <div className="col-span-2 md:col-span-3 pt-2.5 mt-1 border-t border-purple-500/20">
                  <span className="font-bold text-purple-700 block text-[10px] uppercase tracking-wider mb-1">
                    📝 General Narration (From Sales Order)
                  </span>
                  <div className="bg-background/90 p-2.5 rounded-lg border border-purple-500/25 text-xs text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                    {cleanGeneralNarration(sale.narration || sale.remarks || '')}
                  </div>
                </div>
              )}
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
          <div>
            <label className="text-[11px] font-semibold block mb-1">
              Order Placed Date
            </label>
            <input 
              type="date" 
              value={form.date || ''} 
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" 
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">
              Dispatch Date
            </label>
            <input 
              type="date" 
              value={form.dispatchDate || ''} 
              onChange={e => setForm({ ...form, dispatchDate: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" 
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold block mb-1">📝 General Narration / Remarks</label>
            <textarea value={form.narration || ''} onChange={e => setForm({ ...form, narration: e.target.value })}
              placeholder="Enter remarks/narration notes..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-xs min-h-16" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Vehicle Number</label>
            <input value={form.vehicleNumber || ''} onChange={e => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
              placeholder="MH-15-AB-1234" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1">Driver Name</label>
            <input value={form.driverName || ''} onChange={e => setForm({ ...form, driverName: e.target.value })}
              placeholder="Driver Name" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold block mb-1">Driver Mobile</label>
            <input value={form.driverMobile || ''} onChange={e => setForm({ ...form, driverMobile: e.target.value })}
              placeholder="9876543210" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs" />
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
                    <label className="text-[10px] font-medium text-muted-foreground flex justify-between items-center mb-1">
                      <span>{item.returnedQty > 0 ? 'Ordered Qty' : 'Qty'}</span>
                      {item.returnedQty > 0 && (
                        <span className="text-[10px] text-red-500 font-extrabold whitespace-nowrap bg-red-500/10 px-1 rounded">
                          (-{item.returnedQty} Ret) = {item.quantity - item.returnedQty} Net
                        </span>
                      )}
                    </label>
                    <input type="number" min={item.returnedQty || 1} value={item.quantity || ''} onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))}
                      placeholder="0" className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
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

                {/* Product Narration / Item Remark */}
                <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <span>🏷️ Product Narration:</span>
                  </label>
                  <input
                    type="text"
                    value={item.itemRemark || ''}
                    onChange={e => updateLineItem(i, 'itemRemark', e.target.value)}
                    placeholder={readOnly ? '— No product narration —' : 'Enter product narration / item remark...'}
                    className="w-full border border-border/60 rounded-md px-2.5 py-1 bg-background text-xs text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-success text-success-foreground px-4 py-3 rounded-xl flex items-center justify-between shadow-lg shadow-success/20">
            <div className="text-[11px] font-semibold uppercase opacity-90">Total Value</div>
            <div className="text-xl font-bold font-mono">{Currency(grandTotal)}</div>
          </div>
        </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-4">
          {!readOnly ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>Save {isDispatchLog ? 'Dispatch' : 'Invoice'}</Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
