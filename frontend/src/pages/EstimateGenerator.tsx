import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { OrderItem } from '@/types';
import { motion } from 'framer-motion';
import { Plus, Trash2, FileText, Check, ChevronsUpDown, Save, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { Textarea } from '@/components/ui/textarea';
import { apiService } from '@/api/apiService';
import { useToast } from '@/hooks/use-toast';

const EstimateGenerator: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products } = useData();
  
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [narration, setNarration] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [dbId, setDbId] = useState('');
  
  const [items, setItems] = useState<OrderItem[]>([
    { product: '', qty: 0, price: 0, total: 0, itemRemark: '' },
  ]);
  const [openComboboxIndex, setOpenComboboxIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadEstimate(id);
    }
  }, [id]);

  const loadEstimate = async (estimateDbId: string) => {
    try {
      setIsLoading(true);
      const res = await apiService.estimates.getById(estimateDbId);
      if (res.data) {
        const est = res.data;
        setDbId(est.id);
        setEstimateId(est.estimateId);
        setPartyName(est.partyName || '');
        setAddress(est.address || '');
        setGst(est.gst || '');
        setContact(est.contact || '');
        setEmail(est.email || '');
        setNarration(est.narration || '');
        
        if (est.items && est.items.length > 0) {
          setItems(est.items.map((i: any) => ({
            ...i,
            product: i.product,
          })));
        }
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load estimate', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

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

  const getTotalWeight = () => items.reduce((acc, item) => acc + getItemWeight(item), 0);

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    
    if (field === 'product') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.price = prod.rate;
      }
    }
    
    item.total = (item.qty || 0) * (item.price || 0);
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { product: '', qty: 0, price: 0, total: 0, itemRemark: '' }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  
  // Construct a raw order payload that matches the PDF generator's expectations
  const estimatePayload = useMemo(() => {
    const currentEstId = estimateId || `EST-${Date.now().toString().slice(-6)}`;
    return {
      order_id: currentEstId,
      date: new Date().toISOString(),
      partyName: partyName || 'Walk-in Customer',
      narration: narration,
      partyDetails: {
        name: partyName || 'Walk-in Customer',
        address: address,
        gst: gst,
        contact: contact,
        email: email
      },
      items: items.filter(i => i.product && (i.qty || 0) > 0).map(i => {
        const prodId = typeof i.product === 'object' ? (i.product as any)?.id : i.product;
        const prod = products.find(p => p.id === prodId);
        return {
          ...i,
          productName: prod?.name || 'Unknown Product',
          productCode: prod?.productCode || 'PRD',
          taxPercent: prod?.gst || 18,
          tax_percent: prod?.gst || 18
        }
      }),
      grandTotal: grandTotal,
      status: 'Estimate'
    }
  }, [estimateId, partyName, address, gst, contact, email, items, products, grandTotal]);

  const isValid = partyName.trim() !== '' && items.some(i => i.product && (i.qty || 0) > 0);

  const handleSave = async () => {
    if (!isValid) return;
    try {
      setIsSaving(true);
      const payload = {
        estimateId: estimatePayload.order_id,
        partyName,
        address,
        gst,
        contact,
        email,
        narration,
        grandTotal,
        items: items.filter(i => i.product && (i.qty || 0) > 0).map(i => ({
          product: typeof i.product === 'object' ? (i.product as any)?.id : i.product,
          qty: i.qty,
          price: i.price,
          total: i.total,
          itemRemark: i.itemRemark
        }))
      };
      
      let res;
      if (dbId) {
        res = await apiService.estimates.update(dbId, payload);
      } else {
        res = await apiService.estimates.create(payload);
      }
      
      if (res.data?.success) {
        toast({ title: 'Success', description: 'Estimate saved successfully!' });
        if (!dbId && res.data.data?.id) {
           navigate(`/sales/estimate/${res.data.data.id}`, { replace: true });
        }
      } else {
        toast({ title: 'Error', description: 'Failed to save estimate', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save estimate', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading estimate...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 mt-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sales/estimates')}><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="text-2xl font-bold text-foreground">Estimate Generator {estimateId ? `- ${estimateId}` : ''}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-10">Generate and save dynamic Quotation PDFs for ad-hoc parties.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Party Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Party Name <span className="text-destructive">*</span></Label>
            <Input value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="e.g. John Doe Builders" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
            <Input value={gst} onChange={e => setGst(e.target.value)} placeholder="e.g. 08ABCDE1234F1Z5" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">Billing Address</Label>
            <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contact Number</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone number" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Email Address</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold">General Narration / Notes</Label>
            <Textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="Add any extra notes here..." rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex justify-between">
            Line Items
            <span className="text-sm font-normal text-muted-foreground">Total: {getTotalWeight()} kg</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-6 px-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 space-y-1.5">
                  <Label className="text-xs">Product</Label>
                  <Popover open={openComboboxIndex === idx} onOpenChange={(open) => setOpenComboboxIndex(open ? idx : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openComboboxIndex === idx} className="w-full justify-between h-11 bg-background text-left font-normal border-input">
                        <span className="truncate">
                          {item.product
                            ? products.find((p) => p.id === (typeof item.product === 'object' ? (item.product as any)?.id : item.product))?.name || "Unknown Product"
                            : "Select product..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search product..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.name}
                                onSelect={() => {
                                  updateItem(idx, 'product', p.id!);
                                  setOpenComboboxIndex(null);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 shrink-0 ${item.product === p.id ? "opacity-100" : "opacity-0"}`} />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate font-medium">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground">({p.bagSize}) - ₹{p.rate}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={0} className="h-11" value={item.qty || ''} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} placeholder="0" />
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs">Price per unit</Label>
                  <Input type="number" min={0} className="h-11" value={item.price || ''} onChange={e => updateItem(idx, 'price', Number(e.target.value))} placeholder="0" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Input placeholder="Item remark (optional)" className="h-9 text-xs flex-1 mr-3" value={item.itemRemark ?? ''} onChange={e => updateItem(idx, 'itemRemark', e.target.value)} />
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground whitespace-nowrap">{getItemWeight(item)} kg</span>
                  <span className="text-[10px] text-muted-foreground">₹{(item.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full h-12 border-dashed"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
             <span className="text-lg font-semibold">Estimated Grand Total:</span>
             <span className="text-2xl font-bold text-success">₹{grandTotal.toLocaleString()}</span>
          </div>
          
          <div className="flex gap-4 w-full">
            <Button 
                onClick={handleSave} 
                disabled={!isValid || isSaving} 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              <Save className="w-5 h-5 mr-2" /> {isSaving ? 'Saving...' : (dbId ? 'Update Estimate' : 'Save Estimate')}
            </Button>
            {isValid ? (
              <div className="flex-1">
                  <PDFGenerator
                      type="QUOTATION"
                      data={{ ...estimatePayload, type: 'QUOTATION' }}
                      filename={`Estimate_${estimatePayload.order_id}.pdf`}
                      buttonLabel="Download PDF"
                      variant="outline"
                      size="lg"
                  />
              </div>
            ) : (
              <Button disabled variant="outline" className="flex-1 h-12">
                <FileText className="w-5 h-5 mr-2" /> Download PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimateGenerator;
