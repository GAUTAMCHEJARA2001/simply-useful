import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { OrderItem, Order } from '@/types';
import { motion } from 'framer-motion';
import { Plus, Trash2, ShoppingCart, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

const OrderPage: React.FC = () => {
  const { user } = useAuth();
  const { dealers, distributors, products, orders, warehouses, addOrder, updateOrderItems, settings, refreshAll, users } = useData();
  const { toast } = useToast();

  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [partyType, setPartyType] = useState<'Dealer' | 'Distributor'>('Dealer');
  const [selectedParty, setSelectedParty] = useState('');
  const [soEmail, setSoEmail] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { product: '', qty: 0, price: 0, total: 0, itemRemark: '' },
  ]);
  const [narration, setNarration] = useState('');
  const [warehouseId, setWarehouseId] = useState<string | number>(1);
  const [showSummary, setShowSummary] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPartyCombobox, setOpenPartyCombobox] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!id && user?.email) {
      setSoEmail(user.email);
    }
    // Reset initialization if ID changes (navigating to a different order)
    setIsInitialized(false);
  }, [id, user]);

  useEffect(() => {
    if (id && orders.length > 0 && !isInitialized) {
      const existing = orders.find(o => 
        (o.orderId && o.orderId.toLowerCase() === id.toLowerCase()) ||
        (o.id && String(o.id).toLowerCase() === id.toLowerCase()) ||
        (o.order_id && String(o.order_id).toLowerCase() === id.toLowerCase())
      );
      if (existing) {
        setPartyType(existing.partyType);
        setSelectedParty(existing.partyName);
        setSoEmail(existing.soEmail || '');
        setItems((existing.items || []).map((item: any) => ({
          ...item,
          product: typeof item.product === 'object' ? item.product?.id : (item.productId || item.product),
          itemRemark: item.itemRemark ?? item.item_remark ?? item.remark ?? '',
        })));
        setNarration(existing.narration || '');
        setIsInitialized(true);
      }
    }
    // Fallback warehouse if 1 is not present
    if (warehouses && warehouses.length > 0 && !warehouses.find(w => w.id === warehouseId)) {
        setWarehouseId(warehouses[0].id);
    }
  }, [id, orders, warehouses, warehouseId, isInitialized]);

  // Force re-fetch shared states/settings when visiting form view
  useEffect(() => {
    refreshAll?.();
  }, [refreshAll]);
  const { can } = usePermissions();

  const userEmail = (user?.email || '').toLowerCase();

  // These are now purely data-driven based on what DataContext fetches (which is role-aware)
  const myDealers = dealers.filter(d => d.active);
  const myDistributors = distributors.filter(d => d.active);
  const parties = useMemo(() => {
    const rawList = partyType === 'Dealer' 
      ? myDealers.map(d => d.dealerName) 
      : myDistributors.map(d => d.distributorName);
    return Array.from(new Set(rawList.filter(Boolean)));
  }, [partyType, myDealers, myDistributors]);

  const salesOfficers = useMemo(() => {
    const activeSO = (users || []).filter(u => (u.role === 'SALES' || u.role === 'SALES_OFFICER') && u.active);
    if (soEmail && !activeSO.some(u => u.email.toLowerCase() === soEmail.toLowerCase())) {
      const match = (users || []).find(u => u.email.toLowerCase() === soEmail.toLowerCase());
      if (match) {
        activeSO.push(match);
      } else {
        activeSO.push({
          id: soEmail,
          email: soEmail,
          name: soEmail,
          role: 'SALES',
          active: false
        } as any);
      }
    }
    return activeSO;
  }, [users, soEmail]);

  const selectedDealerInfo = partyType === 'Dealer' ? dealers.find(d => d.dealerName === selectedParty) : null;
  const selectedDistInfo = partyType === 'Distributor'
    ? distributors.find(d => d.distributorName === selectedParty)
    : distributors.find(d => d.distributorName === selectedDealerInfo?.distributorName);

  const creditWarning = useMemo(() => {
    // Check if credit warnings are enabled in global settings
    if (settings.showCreditWarnings === false || settings.show_credit_warnings === false || settings.showCreditWarnings === 'false' || settings.show_credit_warnings === 'false') return null;

    const grandTotal = items.reduce((s, i) => s + i.total, 0);
    if (partyType === 'Dealer' && selectedDealerInfo) {
      const remaining = selectedDealerInfo.creditLimit - selectedDealerInfo.outstanding;
      if (grandTotal > remaining) return `Dealer credit limit exceeded! Available: ₹${remaining.toLocaleString()}`;
    }
    if (selectedDistInfo) {
      const remaining = selectedDistInfo.creditLimit - selectedDistInfo.outstanding;
      if (grandTotal > remaining) return `Distributor credit limit exceeded! Available: ₹${remaining.toLocaleString()}`;
    }
    return null;
  }, [items, selectedDealerInfo, selectedDistInfo, partyType]);

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';

  // Check if price editing is allowed by global settings (both camelCase and snake_case supported)
  const allowPriceEditSales = settings.allowPriceEditSales === true || 
                              settings.allowPriceEditSales === 'true' || 
                              settings.allow_price_edit_sales === true || 
                              settings.allow_price_edit_sales === 'true';

  // Price input is disabled for non-admins if price editing settings is off and they don't have explicit permission
  const isPriceInputDisabled = !isAdmin && !can('edit_order_price') && !allowPriceEditSales;

  // Debug logging to help identify why the price input is enabled/disabled in real-time
  useEffect(() => {
    console.log('[DEBUG] Price Input State Evaluation:', {
      userEmail: user?.email,
      userRole,
      isAdmin,
      hasExplicitPriceEditPerm: can('edit_order_price'),
      allowPriceEditSalesSetting: allowPriceEditSales,
      settingsState: settings,
      isPriceInputDisabled
    });
  }, [user, userRole, isAdmin, settings, isPriceInputDisabled, can]);

  const getBagWeight = (bag_size: string): number => {
    const m = (bag_size || '').match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  const getItemWeight = (item: OrderItem) => {
    if (!item) return 0;
    const prodId = typeof item.product === 'object' ? (item.product as any)?.id : item.product;
    const prod = products.find(p => p.id === prodId);
    if (!prod) return 0;
    if (prod.weight && prod.weight > 0) return prod.weight * (item.qty || 0);
    return getBagWeight(prod.bagSize) * (item.qty || 0);
  };

  const getTotalWeight = () => {
    return items.reduce((sum, item) => sum + getItemWeight(item), 0);
  };

  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'qty' || field === 'price' || field === 'product') {
      if (field === 'product') {
        const prod = products.find(p => p.id === value);
        if (prod) updated[index].price = prod.rate;
      }
      updated[index].total = updated[index].qty * updated[index].price;
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { product: '', qty: 0, price: 0, total: 0, itemRemark: '' }]);
  const removeItem = (index: number) => { if (items.length === 1) return; setItems(items.filter((_, i) => i !== index)); };
  const canSubmit = selectedParty && items.every(i => i.product && i.qty > 0 && i.price > 0);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof products> = {};
    products.filter(p => (p.productName || p.name)).forEach(p => {
      const cat = p.categoryRef?.name || p.categoryName || (p.category && typeof p.category === 'object' ? p.category.name : p.category) || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const payloadItems = items.filter(i => i.product).map(i => ({
      productId: i.product,
      qty: Number(i.qty),
      price: Number(i.price),
      total: Number(i.total),
      itemRemark: i.itemRemark || ''
    }));

    const updatedOrder = {
      items: payloadItems,
      narration,
      grandTotal,
      partyName: selectedParty,
      distributor: selectedDistInfo?.distributorName || selectedParty,
      warehouseId: Number(warehouseId) || 1,
      soEmail,
    };

    try {
      if (id) {
        await updateOrderItems(id, updatedOrder);
        toast({ title: 'Order Updated Successfully!', description: `Order ${id} has been modified.` });
      } else {
        const newOrder = {
          date: new Date().toISOString().split('T')[0],
          orderId: `ORD-${Date.now().toString().slice(-6)}`,
          soEmail: soEmail || user?.email || '',
          partyType,
          partyName: selectedParty,
          distributor: selectedDistInfo?.distributorName || selectedParty,
          items: payloadItems,
          narration,
          status: 'Pending',
          totalAmount: grandTotal,
          grandTotal: grandTotal,
          warehouseId: Number(warehouseId) || 1, 
        };
        await addOrder(newOrder as any);
        toast({ title: 'Order Placed Successfully!', description: `Order ${newOrder.orderId} for ${selectedParty}` });
      }
      setShowSummary(false);
      setSubmitted(true);
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const handleNext = () => {
      setSubmitted(false);
      if (id) {
        navigate('/sales/orders');
      } else {
        setSelectedParty('');
        setItems([{ product: '', qty: 0, price: 0, total: 0, itemRemark: '' }]);
        setNarration('');
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
          <Check className="w-10 h-10 text-success" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">{id ? 'Order Updated!' : 'Order Submitted!'}</h2>
        <p className="text-muted-foreground">{id ? 'Your changes have been saved.' : 'Your order has been sent for approval.'}</p>
        <Button onClick={handleNext}>
          {id ? 'Back to My Orders' : 'Place Another Order'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="page-header">{id ? 'Edit Order' : 'New Order'}</h1>
          <p className="page-subheader">{id ? `Modifying ${id}` : 'Create a new sales order'}</p>
        </div>
        {id && (
          <PDFGenerator 
            type="SALES_ORDER" 
            data={{
              orderId: id,
              date: new Date().toISOString().split('T')[0],
              partyName: selectedParty,
              grandTotal: grandTotal,
              items: items.filter(i => i.product)
            }}
            filename={`Order_${id}.pdf`}
            buttonLabel="Print Order"
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Party Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            <div className="space-y-2">
              <Label>Party Type</Label>
              <Select value={partyType} onValueChange={(v: 'Dealer' | 'Distributor') => { setPartyType(v); setSelectedParty(''); }}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex flex-col">
              <Label>{partyType} Name</Label>
              <Popover open={openPartyCombobox} onOpenChange={setOpenPartyCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openPartyCombobox} className="h-12 w-full justify-between font-normal">
                    {selectedParty ? selectedParty : <span className="text-muted-foreground">Select {partyType}...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={`Search ${partyType}...`} className="h-9" />
                    <CommandList>
                      <CommandEmpty>No {partyType.toLowerCase()} found.</CommandEmpty>
                      <CommandGroup>
                        {parties.filter(p => p).map(p => (
                          <CommandItem
                            key={p}
                            value={p}
                            onSelect={() => {
                              setSelectedParty(p);
                              setOpenPartyCombobox(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 shrink-0 ${selectedParty === p ? "opacity-100" : "opacity-0"}`} />
                            <span className="truncate">{p}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Sales Officer</Label>
                <Select value={soEmail} onValueChange={setSoEmail}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select Sales Officer" /></SelectTrigger>
                  <SelectContent>
                    {salesOfficers.map(so => (
                      <SelectItem key={so.id} value={so.email}>
                        {so.name} ({so.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {selectedParty && selectedDistInfo && (
            <div className="bg-secondary rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Distributor: </span>
              <span className="font-medium">{selectedDistInfo.distributorName}</span>
              <span className="text-muted-foreground ml-4">Credit Available: </span>
              <span className="font-medium">₹{(selectedDistInfo.creditLimit - selectedDistInfo.outstanding).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2 flex flex-col">
                  <Label className="text-xs">Product</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-left h-11 px-3">
                        {item.product ? (
                          <span className="truncate">
                            {products.find(p => p.id === item.product)?.productName || item.product}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search and select product...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by product name, category..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          {Object.entries(groupedProducts).map(([category, prods]) => (
                            <CommandGroup key={category} heading={category}>
                              {prods.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.productName} ${p.brand?.name || ''} ${category} - ${p.productCode || p.product_code || ''} - ${p.id}`}
                                  onSelect={() => {
                                    updateItem(idx, 'product', p.id!);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 shrink-0 ${item.product === p.id ? "opacity-100" : "opacity-0"}`} />
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-medium">{p.productName}</span>
                                    <span className="text-[10px] text-muted-foreground">({p.bagSize}) - ₹{p.rate}{p.brand?.name ? ` - ${p.brand.name}` : ''}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={0} className="h-11" value={item.qty || ''} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price per unit</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-11"
                    value={item.price || ''}
                    onChange={e => updateItem(idx, 'price', Number(e.target.value))}
                    placeholder="0"
                    disabled={isPriceInputDisabled}
                  />

                </div>
              </div>
              <div className="flex items-center justify-between">
                <Input placeholder="Item remark (optional)" className="h-9 text-xs flex-1 mr-3" value={item.itemRemark ?? ''} onChange={e => updateItem(idx, 'itemRemark', e.target.value)} />

                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground whitespace-nowrap">{getItemWeight(item)} kg</span>
                  {isAdmin && <span className="text-[10px] text-muted-foreground">₹{(item.total || 0).toLocaleString()}</span>}
                </div>
              </div>
            </motion.div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full h-12 border-dashed"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>General Narration</Label>
            <Textarea placeholder="Order notes..." value={narration} onChange={e => setNarration(e.target.value)} rows={3} />
          </div>
          {creditWarning && (
            <div className="flex items-start gap-2 bg-warning/10 text-warning rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{creditWarning}</span>
            </div>
          )}
          <div className="flex flex-col pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total Weight</span>
              <span className="text-2xl font-bold text-primary">{getTotalWeight()} kg</span>
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Grand Total</span>
                <span className="font-bold text-success">₹{grandTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
          <Button onClick={() => setShowSummary(true)} disabled={!canSubmit} className="w-full action-button">
            <ShoppingCart className="w-5 h-5 mr-2" /> Review & Submit Order
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" aria-describedby="order-summary-desc">
          <DialogHeader>
            <DialogTitle>Order Summary</DialogTitle>
            <DialogDescription id="order-summary-desc" className="sr-only">
              Review your sales order items, quantities, and total amount before final submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Party Type:</span><span className="font-medium">{partyType}</span>
              <span className="text-muted-foreground">Party:</span><span className="font-medium">{selectedParty}</span>
              <span className="text-muted-foreground">Distributor:</span><span className="font-medium">{selectedDistInfo?.distributorName || '-'}</span>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted"><th className="text-left px-3 py-2">Product</th><th className="text-center px-3 py-2">Qty</th><th className="text-center px-3 py-2">Rate</th><th className="text-right px-3 py-2">{isAdmin ? 'Total' : 'Weight'}</th></tr></thead>

                <tbody>
                  {items.filter(i => i.product).map((item, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-2">
                        {products.find(p => p.id === item.product)?.productName || item.product}
                      </td>
                      <td className="px-3 py-2 text-center">{item.qty}</td>
                      <td className="px-3 py-2 text-center">₹{item.price}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {isAdmin ? `₹${(item.total || 0).toLocaleString()}` : `${getItemWeight(item)} kg`}
                      </td>
                    </tr>

                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="px-3 py-2" colSpan={3}>{isAdmin ? 'Grand Total' : 'Total Weight'}</td>

                    <td className="px-3 py-2 text-right text-primary">
                      {isAdmin ? `₹${grandTotal.toLocaleString()}` : `${getTotalWeight()} kg`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {narration && <div className="text-sm"><span className="text-muted-foreground">Narration: </span><span>{narration}</span></div>}
            {creditWarning && (
              <div className="flex items-start gap-2 bg-warning/10 text-warning rounded-lg px-3 py-2 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{creditWarning}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setShowSummary(false)} disabled={isSubmitting} className="flex-1">Back to Edit</Button>
              <PDFGenerator 
                type="SALES_ORDER" 
                data={{
                  orderId: id || 'NEW',
                  date: new Date().toISOString().split('T')[0],
                  partyName: selectedParty,
                  grandTotal: grandTotal,
                  items: items.filter(i => i.product)
                }}
                filename={`Order_${id || 'New'}.pdf`}
                buttonLabel="Preview PDF"
              />
            </div>
            <Button onClick={handleSubmit} className="action-button w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderPage;
