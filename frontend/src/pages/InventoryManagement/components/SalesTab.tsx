import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, RotateCcw, Eye, Package, X, ChevronsUpDown, Check, Trash2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useSales, useSaleMutations } from '@/hooks/inventory/useSales';
import { SalesModal } from '../modals/SalesModal';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { orderService } from '@/api/services/order.service';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { SmartDatePicker } from '@/components/ui/SmartDatePicker';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const extractChallanNumber = (narration: string) => {
  if (!narration) return '';
  let match = narration.match(/\[CHALLAN:\s*([^\]]+)\]/i);
  if (!match) {
    match = narration.match(/\[INVOICE:\s*([^\]]+)\]/i);
  }
  return match ? match[1] : '';
};

export const SalesTab: React.FC = () => {
  const navigate = useNavigate();
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { deleteSale, deleteDispatchLog } = useSaleMutations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnVehicle, setReturnVehicle] = useState('');
  const [purchaseReturnNo, setPurchaseReturnNo] = useState('');
  const [salesReturnBill, setSalesReturnBill] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  const handleEdit = (sale: any) => {
    setSelectedSale(sale);
    setViewOnly(false);
    setModalOpen(true);
  };

  const handleView = (sale: any) => {
    setSelectedSale(sale);
    setViewOnly(true);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedSale(null);
    setViewOnly(false);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, isDispatchLog?: boolean) => {
    if (!confirm(isDispatchLog ? 'Delete this dispatch transaction?' : 'Delete this sale record?')) return;
    if (isDispatchLog) {
      await deleteDispatchLog(id);
    } else {
      await deleteSale(id);
    }
  };

  const openReturn = (sale: any) => {
    setReturnSale(sale);
    setReturnRemarks('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnVehicle('');
    setPurchaseReturnNo('');
    setSalesReturnBill('');
    
    // Initialize return quantities per item
    const initialQtys: Record<string, number> = {};
    (sale.items || []).forEach((item: any) => {
      const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
      if (pId) {
        const dispatched = item.sentQty || item.qty || 0;
        const alreadyReturned = item.returnedQty || 0;
        const returnable = dispatched - alreadyReturned;
        initialQtys[pId] = returnable > 0 ? returnable : 0;
      }
    });
    setReturnItems(initialQtys);
  };

  const submitReturn = async () => {
    if (!returnSale) return;
    setIsReturning(true);
    
    try {
      const itemsPayload = Object.entries(returnItems)
        .map(([productId, qty]) => ({ productId, qty }))
        .filter(item => item.qty > 0);

      if (itemsPayload.length === 0) {
        toast({ title: 'Error', description: 'Enter at least one return quantity.', variant: 'destructive' });
        setIsReturning(false);
        return;
      }

      let finalRemarks = returnRemarks;
      if (salesReturnBill) finalRemarks = `[SR BILL: ${salesReturnBill}] ` + finalRemarks;
      if (purchaseReturnNo) finalRemarks = `[PR NO: ${purchaseReturnNo}] ` + finalRemarks;
      if (returnVehicle) finalRemarks = `[VEHICLE: ${returnVehicle}] ` + finalRemarks;
      if (returnSale.invoiceNumber || returnSale.challanNumber) {
        finalRemarks = `[INVOICE: ${returnSale.invoiceNumber || returnSale.challanNumber}] ` + finalRemarks;
      }
      finalRemarks = finalRemarks.trim();

      await orderService.partialReturn(returnSale.originalOrderId || returnSale.id, {
        items: itemsPayload,
        remarks: finalRemarks,
        returnDate: returnDate
      });

      toast({ title: 'Returned', description: 'Partial return processed and inventory updated.' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setReturnSale(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || err.message || 'Return failed.', variant: 'destructive' });
    } finally {
      setIsReturning(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('AllSales');
  const [selectedItemFilter, setSelectedItemFilter] = useState('');
  const [openItemCombobox, setOpenItemCombobox] = useState(false);

  const { filterBySelectedFY } = useFinancialYear();

  // Extract all unique product names from the current sales with occurrence count
  const availableProducts = useMemo(() => {
    const counts = new Map<string, number>();
    sales.forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product);
        if (pName && typeof pName === 'string' && pName.trim()) {
          const clean = pName.trim();
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [sales]);

  const filteredSales = filterBySelectedFY(sales, (s: any) => s.dispatchDate || s.date || s.createdAt).filter((s: any) => {
    const customer = (s.customerName || s.partyName || '').toLowerCase();
    const challan = (s.challanNumber || s.invoiceNumber || extractChallanNumber(s.narration) || '').toLowerCase();
    const status = s.status || 'Pending';
    const sTerm = searchTerm.toLowerCase().trim();

    // Specific Item dropdown filter
    if (selectedItemFilter) {
      const hasItem = (s.items || []).some((it: any) => {
        const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product);
        return pName && typeof pName === 'string' && pName.trim().toLowerCase() === selectedItemFilter.toLowerCase();
      });
      if (!hasItem) return false;
    }

    // Text search (matches customer, challan, or any item name)
    const itemsMatch = sTerm ? (s.items || []).some((it: any) => {
      const pName = (it.productName || (typeof it.product === 'object' ? it.product?.name : it.product) || '').toLowerCase();
      return pName.includes(sTerm);
    }) : false;
    
    const matchesSearch = !sTerm || customer.includes(sTerm) || challan.includes(sTerm) || itemsMatch;
    const matchesStatus = 
      (statusFilter === 'AllSales' || statusFilter === 'Completed')
        ? ['Completed', 'Dispatched', 'Partially Dispatched', 'Partially Returned'].includes(status)
        : statusFilter === 'All'
        ? true
        : status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats when a specific item is filtered
  const itemFilterStats = useMemo(() => {
    if (!selectedItemFilter) return null;
    let totalQtySold = 0;
    let totalAmountSold = 0;
    filteredSales.forEach((s: any) => {
      (s.items || []).forEach((it: any) => {
        const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product);
        if (pName && typeof pName === 'string' && pName.trim().toLowerCase() === selectedItemFilter.toLowerCase()) {
          const qty = it.qty ?? it.sentQty ?? 0;
          const ret = it.returnedqty || it.returnedQty || 0;
          const netQ = Math.max(0, qty - ret);
          totalQtySold += netQ;
          totalAmountSold += netQ * (it.price ?? it.rate ?? 0);
        }
      });
    });
    return { totalQtySold, totalAmountSold };
  }, [selectedItemFilter, filteredSales]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Sales (Invoices)</h1>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search customer, invoice, or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[220px] text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:ring-1 focus:ring-primary/50"
          />

          <Popover open={openItemCombobox} onOpenChange={setOpenItemCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openItemCombobox}
                className={`h-[34px] text-xs px-2.5 justify-between font-normal max-w-[230px] min-w-[170px] truncate border rounded-lg ${
                  selectedItemFilter ? 'border-primary text-primary font-semibold bg-primary/5 hover:bg-primary/10' : 'border-border text-foreground'
                }`}
                title={selectedItemFilter ? `Filtering by: ${selectedItemFilter}` : "Filter by item / product"}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {selectedItemFilter ? selectedItemFilter : `All Items (${availableProducts.length})`}
                  </span>
                </div>
                <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] sm:w-[360px] p-0 shadow-lg border border-border" align="start">
              <Command>
                <CommandInput placeholder="Search 100+ items..." className="h-9 text-xs" />
                <CommandList className="max-h-[280px] overflow-y-auto">
                  <CommandEmpty className="p-3 text-xs text-muted-foreground text-center">No matching items found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all items all products reset clear"
                      onSelect={() => {
                        setSelectedItemFilter('');
                        setOpenItemCombobox(false);
                      }}
                      className="py-1.5 px-2.5 text-xs cursor-pointer flex items-center justify-between"
                    >
                      <span className={!selectedItemFilter ? "font-bold text-primary" : "font-medium text-foreground"}>
                        All Items ({availableProducts.length})
                      </span>
                      {!selectedItemFilter && <Check className="h-3.5 w-3.5 text-primary" />}
                    </CommandItem>
                    {availableProducts.map(({ name, count }) => {
                      const isSelected = selectedItemFilter.toLowerCase() === name.toLowerCase();
                      return (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={() => {
                            setSelectedItemFilter(isSelected ? '' : name);
                            setOpenItemCombobox(false);
                          }}
                          className="py-1.5 px-2.5 text-xs cursor-pointer flex items-center justify-between gap-2"
                        >
                          <span className={`truncate text-xs ${isSelected ? "font-bold text-primary" : "text-foreground"}`}>
                            {name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                              {count}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:ring-1 focus:ring-primary/50"
          >
            <option value="AllSales">All Invoices (Completed & Partial)</option>
            <option value="All">All Statuses</option>
            <option value="Partially Returned">Partially Returned</option>
            <option value="Partially Dispatched">Partially Dispatched</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Returned">Returned</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/inventory/manage?tab=deleted_sales')}
            className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Deleted Sales
          </Button>
          <Button size="sm" onClick={handleAdd} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> New Sale
          </Button>
        </div>
      </div>

      {selectedItemFilter && itemFilterStats && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span>Item Filter:</span>
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {selectedItemFilter}
            </span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            <strong>{filteredSales.length}</strong> invoices
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            <strong>{itemFilterStats.totalQtySold}</strong> units dispatched
          </span>
          {itemFilterStats.totalAmountSold > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Item Total: <strong className="text-foreground">{Currency(itemFilterStats.totalAmountSold)}</strong>
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => setSelectedItemFilter('')}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-background hover:bg-muted border border-border px-2 py-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" /> Clear Filter
          </button>
        </div>
      )}

      <SafeDataView data={sales} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Customer', 'Challan', 'Items', 'Net Amount', 'Status', 'Dispatch Date', 'Sales Return']}
          rows={filteredSales.map((s: any) => {
            const cleanNarration = s.narration ? s.narration
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
              .replace(/\[LAST.*?\]/gi, '')
              .trim() : '';

            const status = s.status || 'Pending';
            const statusColor = 
              status === 'Partially Returned' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              status === 'Returned' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              status === 'Partially Dispatched' ? 'bg-violet-100 text-violet-700 border-violet-200' :
              status === 'Dispatched' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
              'bg-gray-100 text-gray-700 border-gray-200';

            const items: any[] = s.items || [];
            const totalUnits = items.reduce((acc: number, it: any) => acc + (Number(it.qty || it.sentQty || 0)), 0);

            // If an item is filtered, pin that item to top of the list
            const sortedItems = [...items].sort((a: any, b: any) => {
              if (!selectedItemFilter) return 0;
              const nameA = (a.productName || (typeof a.product === 'object' ? a.product?.name : a.product) || '').trim().toLowerCase();
              const nameB = (b.productName || (typeof b.product === 'object' ? b.product?.name : b.product) || '').trim().toLowerCase();
              const fLower = selectedItemFilter.toLowerCase();
              if (nameA === fLower && nameB !== fLower) return -1;
              if (nameB === fLower && nameA !== fLower) return 1;
              return 0;
            });

            const itemsTooltip = sortedItems.map((it: any) => {
              const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product) || '—';
              const qty = it.qty ?? it.sentQty ?? 0;
              const ret = it.returnedqty || it.returnedQty || 0;
              return `${pName}: ${qty}${ret > 0 ? ` (${ret} ret)` : ''}`;
            }).join(', ');

            const itemsCell = sortedItems.length === 0 ? (
              <span key={`items-${s.id}`} className="text-xs text-muted-foreground italic">No items</span>
            ) : (
              <div key={`items-${s.id}`} className="flex flex-col gap-1 min-w-[190px] max-w-[270px]" title={itemsTooltip}>
                <div className="space-y-1">
                  {sortedItems.slice(0, 2).map((it: any, idx: number) => {
                    const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product) || '—';
                    const qty = it.qty ?? it.sentQty ?? 0;
                    const retQty = it.returnedqty || it.returnedQty || 0;
                    const isFiltered = selectedItemFilter && pName.trim().toLowerCase() === selectedItemFilter.toLowerCase();

                    return (
                      <button 
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemFilter(isFiltered ? '' : pName.trim());
                        }}
                        className={`w-full text-left flex items-center justify-between gap-1.5 text-[11px] rounded px-1.5 py-0.5 border transition-all cursor-pointer ${
                          isFiltered
                            ? 'bg-primary/15 border-primary text-primary font-bold ring-1 ring-primary/40'
                            : 'bg-muted/40 hover:bg-muted/80 border-border/50 text-foreground'
                        }`}
                        title={isFiltered ? `Click to remove filter for ${pName}` : `Click to filter invoices by ${pName}`}
                      >
                        <span className="truncate max-w-[170px]" title={pName}>{pName}</span>
                        <span className="shrink-0 font-semibold whitespace-nowrap">
                          {retQty > 0 ? (
                            <span>
                              <span>{qty - retQty}</span>
                              <span className="text-amber-600 text-[10px] ml-1">(-{retQty})</span>
                            </span>
                          ) : (
                            `×${qty}`
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {sortedItems.length > 2 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        type="button" 
                        className="text-[10px] font-semibold text-primary hover:underline text-left inline-flex items-center gap-1 cursor-pointer w-fit py-0.5"
                      >
                        <Package className="w-2.5 h-2.5" />
                        <span>+{sortedItems.length - 2} more ({totalUnits} total units)</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3 shadow-lg" align="start">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-border pb-1.5">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            Invoice Items ({sortedItems.length})
                          </span>
                          <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{totalUnits} units</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {sortedItems.map((it: any, idx: number) => {
                            const pName = it.productName || (typeof it.product === 'object' ? it.product?.name : it.product) || '—';
                            const qty = it.qty ?? it.sentQty ?? 0;
                            const price = it.price ?? it.rate ?? 0;
                            const retQty = it.returnedqty || it.returnedQty || 0;
                            const isFiltered = selectedItemFilter && pName.trim().toLowerCase() === selectedItemFilter.toLowerCase();

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedItemFilter(isFiltered ? '' : pName.trim())}
                                className={`w-full text-left p-1.5 rounded border text-xs transition-colors cursor-pointer ${
                                  isFiltered 
                                    ? 'bg-primary/10 border-primary ring-1 ring-primary/30' 
                                    : 'bg-muted/40 hover:bg-muted/70 border-border/40'
                                }`}
                                title={isFiltered ? "Click to clear filter" : `Click to filter invoices by ${pName}`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className={`text-[11px] leading-tight ${isFiltered ? 'font-bold text-primary' : 'font-semibold text-foreground'}`}>
                                    {pName}
                                  </span>
                                  <span className="font-bold text-[11px] shrink-0 text-foreground">
                                    {price > 0 ? Currency(qty * price) : `×${qty}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-0.5">
                                  <span>Qty: {qty}{retQty > 0 && <span className="text-amber-600 font-semibold ml-1">({retQty} returned)</span>}</span>
                                  {price > 0 && <span>@{Currency(price)}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );

            const netBase = items.reduce((acc: number, it: any) => 
              acc + Math.max(0, (it.qty || 0) - (it.returnedqty || it.returnedQty || 0)) * (it.price || it.rate || 0)
            , 0);
            const netGross = items.reduce((acc: number, it: any) => 
              acc + Math.max(0, (it.qty || 0) - (it.returnedqty || it.returnedQty || 0)) * (it.price || it.rate || 0) * (1 + (it.tax_percent || 0) / 100)
            , 0) || s.netAmount || s.grandTotal || s.totalAmount || 0;
            const gstAmount = Math.max(0, netGross - netBase);

            return [
              s.customerName || s.partyName || '—', 
              s.challanNumber || s.invoiceNumber || extractChallanNumber(s.narration) || '—', 
              itemsCell,
              <div key={`amt-${s.id}`} className="flex flex-col">
                <span className="font-semibold text-xs sm:text-sm">{Currency(netGross)}</span>
                {gstAmount > 0.01 && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Base {Currency(netBase)} + Tax {Currency(gstAmount)}
                  </span>
                )}
              </div>,
              <span key={`status-${s.id}`} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>{status}</span>,
              (() => {
                const dispatchD = s.dispatchDate || s.date || s.createdAt;
                const formatD = (val: any) => {
                  if (!val) return '—';
                  try {
                    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                      const [y, m, day] = val.split('-');
                      return `${parseInt(day, 10)}/${parseInt(m, 10)}/${y}`;
                    }
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-IN');
                  } catch (_) {
                    return String(val);
                  }
                };

                const formattedDispatch = formatD(dispatchD);

                return (
                  <span key={`dt-${s.id}`} className="font-semibold text-xs text-foreground whitespace-nowrap">
                    {formattedDispatch}
                  </span>
                );
              })(),
              <div key={s.id} className="flex items-center gap-1.5 flex-wrap min-w-[110px]">
                <Button size="sm" variant="secondary" onClick={() => handleView(s)} className="h-7 text-[10px] px-2" title="View Transaction">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openReturn(s)} className="h-7 text-[10px] px-2"
                  disabled={status === 'Returned' || status === 'Pending' || status === 'Cancelled'}>
                  <RotateCcw className="w-3 h-3 mr-1" /> {status === 'Partially Returned' ? 'Return More' : 'Return'}
                </Button>
              </div>
            ];
          })}
          onEdit={i => handleEdit(filteredSales[i])}
          onDelete={i => handleDelete(filteredSales[i].id, filteredSales[i].isDispatchLog)}
        />
      </SafeDataView>

      <SalesModal 
        isOpen={modalOpen} 
        onClose={() => {
          setModalOpen(false);
          setSelectedSale(null);
          refetch();
        }} 
        sale={selectedSale} 
        readOnly={viewOnly}
        isDispatchLog={selectedSale?.isDispatchLog}
      />

      <Modal isOpen={!!returnSale} title="Partial Sales Return" onClose={() => setReturnSale(null)}>
        <div className="space-y-4">
          <div className="p-3 bg-muted/20 border border-border rounded-xl text-sm">
            <span className="text-muted-foreground text-xs block mb-1">Customer / Party Name</span>
            <span className="font-bold">{returnSale?.customerName || returnSale?.partyName || '—'}</span>
          </div>
          {/* Per-item return quantities */}
          <div className="border border-border rounded-xl overflow-x-auto overflow-y-auto max-h-[40vh] w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-3 text-left min-w-[150px]">Product</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Ordered</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Dispatched</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Already Returned</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Returnable</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {(returnSale?.items || []).map((item: any) => {
                  const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
                  const pName = (typeof item.product === 'object' ? item.product?.name : null) || item.productName || item.product || '—';
                  const ordered = item.qty || 0;
                  const dispatched = item.sentQty || item.qty || 0;
                  const alreadyReturned = item.returnedQty || 0;
                  const returnable = dispatched - alreadyReturned;
                  const currentVal = returnItems[pId];
                  return (
                    <tr key={pId} className="border-t border-border/40">
                      <td className="py-2 px-3 font-medium">{pName}</td>
                      <td className="py-2 px-3 text-center">{ordered}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{dispatched}</td>
                      <td className="py-2 px-3 text-center">
                        {alreadyReturned > 0 ? <span className="text-orange-600 font-bold">{alreadyReturned}</span> : '0'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {returnable > 0 ? <span className="font-bold text-amber-600">{returnable}</span> : <span className="text-emerald-600">✓</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {returnable > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={returnable}
                            value={currentVal === undefined ? '' : currentVal}
                            onChange={e => {
                              const val = e.target.value;
                              setReturnItems(prev => ({ 
                                ...prev, 
                                [pId]: val === '' ? 0 : Math.min(returnable, Math.max(0, Number(val))) 
                              }));
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-20 text-center border border-border px-2 py-1 rounded-lg bg-background text-xs font-bold focus:ring-2 focus:ring-primary/20"
                          />
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1">Return Date</label>
              <SmartDatePicker
                value={returnDate}
                onChange={setReturnDate}
                className="w-full"
                inputClassName="py-1.5 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Vehicle Details</label>
              <input type="text" value={returnVehicle} onChange={e => setReturnVehicle(e.target.value)} placeholder="e.g. MH12AB1234"
                className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Purchase Return Number</label>
              <input type="text" value={purchaseReturnNo} onChange={e => setPurchaseReturnNo(e.target.value)} placeholder="e.g. PR-001"
                className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Company Sales Return Bill</label>
              <input type="text" value={salesReturnBill} onChange={e => setSalesReturnBill(e.target.value)} placeholder="e.g. SR-001"
                className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Reason / Remarks</label>
            <textarea value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)}
              placeholder="Any additional remarks..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm min-h-20 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReturnSale(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReturn} disabled={isReturning}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> {isReturning ? 'Processing...' : 'Confirm Partial Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
