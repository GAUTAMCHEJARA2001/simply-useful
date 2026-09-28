import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Users,
  Building2,
  Calendar,
  Search,
  Plus,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  Trash2,
  Edit3,
  Award,
  ArrowUpRight,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Zap,
  MapPin,
  Tag,
  FolderTree,
  Package,
  Shield,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  salesTargetService,
  OfficerSalesTargetRecord,
  SalesTargetListResponse,
  TargetMastersResponse,
  CategoryTargetItem,
  ProductTargetItem,
  CustomTargetItem,
  IncentiveSlabItem,
} from '@/api/services/salesTarget.service';
import { userService } from '@/api/services/user.service';

const formatIndianCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

const formatIndianNumber = (num: number): string => {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('en-IN');
};

const MONTHS = [
  { val: 1, label: 'January' },
  { val: 2, label: 'February' },
  { val: 3, label: 'March' },
  { val: 4, label: 'April' },
  { val: 5, label: 'May' },
  { val: 6, label: 'June' },
  { val: 7, label: 'July' },
  { val: 8, label: 'August' },
  { val: 9, label: 'September' },
  { val: 10, label: 'October' },
  { val: 11, label: 'November' },
  { val: 12, label: 'December' },
];

const UOM_OPTIONS = [
  { value: 'visits', label: 'Visits (Count)' },
  { value: 'meets', label: 'Meets / Demos (Count)' },
  { value: 'pkts', label: 'Packets (pkts)' },
  { value: 'boxes', label: 'Boxes / Kits (boxes)' },
  { value: 'bags', label: 'Bags (bags)' },
  { value: '₹', label: 'Rupees (₹ Money)' },
  { value: 'dealers', label: 'Dealers / Counters (Count)' },
  { value: 'MT', label: 'Metric Ton (MT)' },
  { value: 'ltr', label: 'Liters (ltr)' },
];

export const SalesTargetManagementTab: React.FC = () => {
  const { toast } = useToast();
  const currentDate = new Date();

  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SalesTargetListResponse | null>(null);
  const [masters, setMasters] = useState<TargetMastersResponse | null>(null);

  // Edit/Allocation Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerSalesTargetRecord | null>(null);
  const [modalTab, setModalTab] = useState<string>('financial');
  const [saving, setSaving] = useState<boolean>(false);

  // Form fields for modal
  const [formData, setFormData] = useState<{
    target_revenue: number;
    target_bags: number;
    target_collection: number;
    target_dealer_revenue: number;
    target_dealer_bags: number;
    target_non_dealer_revenue: number;
    target_non_dealer_bags: number;
    target_visits: number;
    target_new_dealers: number;
    target_travel_days: number;
    min_achievement_pct_for_incentive: number;
    incentive_per_bag: number;
    incentive_pct_on_revenue: number;
    notes: string;
    category_targets: CategoryTargetItem[];
    product_targets: ProductTargetItem[];
    custom_targets: CustomTargetItem[];
    incentive_slabs: IncentiveSlabItem[];
    new_dealer_bounty: number;
    min_collection_pct_for_incentive: number;
  }>({
    target_revenue: 1000000,
    target_bags: 2850,
    target_collection: 500000,
    target_dealer_revenue: 750000,
    target_dealer_bags: 2150,
    target_non_dealer_revenue: 250000,
    target_non_dealer_bags: 700,
    target_visits: 80,
    target_new_dealers: 3,
    target_travel_days: 22,
    min_achievement_pct_for_incentive: 80,
    incentive_per_bag: 5,
    incentive_pct_on_revenue: 0,
    notes: '',
    category_targets: [],
    product_targets: [],
    custom_targets: [],
    incentive_slabs: [
      { min_pct: 80, max_pct: 99.9, rate_per_bag: 3, label: 'Base Tier (80-99%)' },
      { min_pct: 100, max_pct: 119.9, rate_per_bag: 6, label: 'Target Achiever (100-119%)' },
      { min_pct: 120, max_pct: 999, rate_per_bag: 10, label: 'Super Achiever (120%+)' },
    ],
    new_dealer_bounty: 500,
    min_collection_pct_for_incentive: 70,
  });

  // Replicate previous month modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyFromMonth, setCopyFromMonth] = useState<number>(selectedMonth === 1 ? 12 : selectedMonth - 1);
  const [copyFromYear, setCopyFromYear] = useState<number>(selectedMonth === 1 ? selectedYear - 1 : selectedYear);
  const [copyGrowthPct, setCopyGrowthPct] = useState<number>(10);
  const [copying, setCopying] = useState<boolean>(false);

  // Staff Catalog Multi-Select Modal States (Staff Management Style)
  const [isStaffCatalogOpen, setIsStaffCatalogOpen] = useState<boolean>(false);
  const [staffCatalogSelectedIds, setStaffCatalogSelectedIds] = useState<string[]>([]);
  const [staffCatalogBrandFilter, setStaffCatalogBrandFilter] = useState<string | null>(null);
  const [staffCatalogParentCatFilter, setStaffCatalogParentCatFilter] = useState<string | null>(null);
  const [staffCatalogSubCatFilter, setStaffCatalogSubCatFilter] = useState<string | null>(null);
  const [staffCatalogSearch, setStaffCatalogSearch] = useState<string>('');
  const [staffCatalogDefaultQty, setStaffCatalogDefaultQty] = useState<number>(100);
  const [staffCatalogDefaultIncentive, setStaffCatalogDefaultIncentive] = useState<number>(5);
  const [officerAssignedProductIds, setOfficerAssignedProductIds] = useState<string[]>([]);
  const [staffCatalogOnlyOfficerAssigned, setStaffCatalogOnlyOfficerAssigned] = useState<boolean>(false);

  // Fetch targets and masters
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await salesTargetService.getTargets({
        year: selectedYear,
        month: selectedMonth,
      });
      setData(res.data);
    } catch (err: any) {
      toast({
        title: 'Error loading targets',
        description: err.response?.data?.error || 'Could not fetch sales targets.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const res = await salesTargetService.getMasters();
      setMasters(res.data);
    } catch (err) {
      console.error('Failed to load target masters', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchMasters();
  }, []);

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    if (!data?.officers) return [];
    return data.officers.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.user.name.toLowerCase().includes(q) ||
        o.user.email.toLowerCase().includes(q) ||
        o.user.territory.toLowerCase().includes(q);
      const matchTerritory = territoryFilter === 'ALL' || o.user.territory === territoryFilter;
      return matchSearch && matchTerritory;
    });
  }, [data?.officers, searchQuery, territoryFilter]);

  // Unique territories
  const uniqueTerritories = useMemo(() => {
    if (!data?.officers) return [];
    const set = new Set(data.officers.map((o) => o.user.territory || 'General'));
    return Array.from(set);
  }, [data?.officers]);

  // Open modal to configure target
  const handleOpenEdit = (officer: OfficerSalesTargetRecord) => {
    setSelectedOfficer(officer);
    const t = officer.targets;

    // Fetch officer staff assignments from User Management
    setOfficerAssignedProductIds([]);
    setStaffCatalogOnlyOfficerAssigned(false);
    userService.getAssignments(officer.user.id)
      .then((res) => {
        const d = res.data?.data || res.data;
        const pIds = (d?.products || []).map((p: any) => typeof p === 'object' ? String(p.id) : String(p));
        setOfficerAssignedProductIds(pIds);
      })
      .catch(() => {
        setOfficerAssignedProductIds([]);
      });

    // Populate brand & category metadata on product targets if missing
    const enrichedProductTargets = (t.product_targets || []).map((pt) => {
      const prod = masters?.products?.find((p) => p.id === pt.product_id);
      const brandObj = masters?.brands?.find((b) => String(b.id) === String(pt.brand_id || prod?.brand_id));
      const catObj = masters?.categories?.find((c) => String(c.id) === String(pt.category_id || prod?.category_id));
      return {
        ...pt,
        target_type: pt.target_type || 'product',
        brand_id: pt.brand_id || (prod?.brand_id ? String(prod.brand_id) : undefined),
        brand_name: pt.brand_name || brandObj?.name,
        category_id: pt.category_id || (prod?.category_id ? String(prod.category_id) : undefined),
        category_name: pt.category_name || catObj?.name,
      };
    });

    setFormData({
      target_revenue: t.target_revenue || 1000000,
      target_bags: t.target_bags || Math.round((t.target_revenue || 1000000) / 350),
      target_collection: t.target_collection || Math.round((t.target_revenue || 1000000) * 0.5),
      target_dealer_revenue: t.target_dealer_revenue || Math.round((t.target_revenue || 1000000) * 0.75),
      target_dealer_bags: t.target_dealer_bags || Math.round((t.target_bags || 2850) * 0.75),
      target_non_dealer_revenue: t.target_non_dealer_revenue || Math.round((t.target_revenue || 1000000) * 0.25),
      target_non_dealer_bags: t.target_non_dealer_bags || Math.round((t.target_bags || 2850) * 0.25),
      target_visits: t.target_visits || 80,
      target_new_dealers: t.target_new_dealers || 3,
      target_travel_days: t.target_travel_days || 22,
      min_achievement_pct_for_incentive: t.min_achievement_pct_for_incentive || 80,
      incentive_per_bag: t.incentive_per_bag || 0,
      incentive_pct_on_revenue: t.incentive_pct_on_revenue || 0,
      notes: t.notes || '',
      category_targets: t.category_targets?.length ? [...t.category_targets] : [],
      product_targets: enrichedProductTargets.length
        ? enrichedProductTargets
        : (masters?.products || []).slice(0, 2).map((p) => {
            const bObj = masters?.brands?.find(b => String(b.id) === String(p.brand_id));
            const cObj = masters?.categories?.find(c => String(c.id) === String(p.category_id));
            return {
              target_type: 'product' as const,
              product_id: p.id,
              product_code: p.code,
              product_name: p.name,
              brand_id: p.brand_id ? String(p.brand_id) : undefined,
              brand_name: bObj?.name,
              category_id: p.category_id ? String(p.category_id) : undefined,
              category_name: cObj?.name,
              target_qty: 200,
              target_amount: Math.round(200 * (p.rate || 350)),
              incentive_rate: 5,
            };
          }),
      custom_targets: t.custom_targets?.length
        ? [...t.custom_targets]
        : [
            { id: 'ct-project', name: 'Project / Site Visits', uom: 'visits', target_val: 15, incentive_rate: 0 },
            { id: 'ct-mason', name: 'Masonry Meets', uom: 'meets', target_val: 2, incentive_rate: 250 },
            { id: 'ct-dealer-meet', name: 'Dealer Meets', uom: 'meets', target_val: 1, incentive_rate: 300 },
            { id: 'ct-dist-meet', name: 'Distributor Meets', uom: 'meets', target_val: 1, incentive_rate: 500 },
          ],
      incentive_slabs: t.incentive_slabs?.length
        ? [...t.incentive_slabs]
        : [
            { min_pct: 80, max_pct: 99.9, rate_per_bag: 3, label: 'Base Tier (80-99%)' },
            { min_pct: 100, max_pct: 119.9, rate_per_bag: 6, label: 'Target Achiever (100-119%)' },
            { min_pct: 120, max_pct: 999, rate_per_bag: 10, label: 'Super Achiever (120%+)' },
          ],
      new_dealer_bounty: t.new_dealer_bounty !== undefined ? t.new_dealer_bounty : 500,
      min_collection_pct_for_incentive:
        t.min_collection_pct_for_incentive !== undefined ? t.min_collection_pct_for_incentive : 70,
    });
    setModalTab('collections');
    setIsEditModalOpen(true);
  };

  // Auto-sync dealer splits when revenue changes
  const handleRevenueChange = (val: number) => {
    const dealerRev = Math.round(val * 0.75);
    const nonDealerRev = Math.round(val * 0.25);
    setFormData((prev) => ({
      ...prev,
      target_revenue: val,
      target_collection: prev.target_collection > 0 ? prev.target_collection : Math.round(val * 0.5),
      target_dealer_revenue: dealerRev,
      target_non_dealer_revenue: nonDealerRev,
    }));
  };

  // Target Handlers (Product SKU, Category, Brand)
  const handleAddProductTarget = (type: 'product' | 'category' | 'brand' = 'product') => {
    let newItem: any = {
      target_type: type,
      target_qty: 100,
      target_amount: 35000,
      incentive_rate: 5,
    };

    if (type === 'category') {
      const defCat = masters?.categories?.[0];
      newItem.category_id = defCat?.id ? String(defCat.id) : '';
      newItem.category_name = defCat?.name || 'Category';
      newItem.product_id = newItem.category_id;
      newItem.product_name = newItem.category_name;
      newItem.product_code = '';
    } else if (type === 'brand') {
      const defBrand = masters?.brands?.[0];
      newItem.brand_id = defBrand?.id ? String(defBrand.id) : '';
      newItem.brand_name = defBrand?.name || 'Brand';
      newItem.product_id = newItem.brand_id;
      newItem.product_name = newItem.brand_name;
      newItem.product_code = '';
    } else {
      const defProd = masters?.products?.[0];
      if (defProd) {
        const bObj = masters?.brands?.find(b => String(b.id) === String(defProd.brand_id));
        const cObj = masters?.categories?.find(c => String(c.id) === String(defProd.category_id));
        newItem.product_id = defProd.id;
        newItem.product_code = defProd.code || '';
        newItem.product_name = defProd.name || '';
        newItem.brand_id = defProd.brand_id ? String(defProd.brand_id) : '';
        newItem.brand_name = bObj?.name || '';
        newItem.category_id = defProd.category_id ? String(defProd.category_id) : '';
        newItem.category_name = cObj?.name || '';
        newItem.target_amount = Math.round(100 * (defProd.rate || 350));
      }
    }

    setFormData((prev) => {
      const updated = [...prev.product_targets, newItem];
      const totalUnits = updated.reduce((s, p) => s + (p.target_qty || 0), 0);
      return {
        ...prev,
        product_targets: updated,
        target_bags: totalUnits,
      };
    });
  };

  const handleUpdateProductTargetType = (idx: number, newType: 'product' | 'category' | 'brand') => {
    setFormData((prev) => {
      const updated = prev.product_targets.map((pt, i) => {
        if (i !== idx) return pt;
        if (newType === 'category') {
          const defCat = masters?.categories?.[0];
          return {
            ...pt,
            target_type: 'category' as const,
            category_id: defCat?.id ? String(defCat.id) : '',
            category_name: defCat?.name || 'Category',
            brand_id: undefined,
            brand_name: undefined,
            product_id: defCat?.id ? String(defCat.id) : '',
            product_name: defCat?.name || 'Category',
            product_code: '',
          };
        } else if (newType === 'brand') {
          const defBrand = masters?.brands?.[0];
          return {
            ...pt,
            target_type: 'brand' as const,
            brand_id: defBrand?.id ? String(defBrand.id) : '',
            brand_name: defBrand?.name || 'Brand',
            category_id: undefined,
            category_name: undefined,
            product_id: defBrand?.id ? String(defBrand.id) : '',
            product_name: defBrand?.name || 'Brand',
            product_code: '',
          };
        } else {
          const defProd = masters?.products?.[0];
          const bObj = masters?.brands?.find(b => String(b.id) === String(defProd?.brand_id));
          const cObj = masters?.categories?.find(c => String(c.id) === String(defProd?.category_id));
          return {
            ...pt,
            target_type: 'product' as const,
            product_id: defProd?.id || '',
            product_code: defProd?.code || '',
            product_name: defProd?.name || '',
            brand_id: defProd?.brand_id ? String(defProd.brand_id) : undefined,
            brand_name: bObj?.name,
            category_id: defProd?.category_id ? String(defProd.category_id) : undefined,
            category_name: cObj?.name,
            target_amount: Math.round((pt.target_qty || 100) * (defProd?.rate || 350)),
          };
        }
      });
      return { ...prev, product_targets: updated };
    });
  };

  const handleUpdateProductTargetRow = (idx: number, patch: Partial<ProductTargetItem>) => {
    setFormData((prev) => {
      const updated = prev.product_targets.map((pt, i) => {
        if (i !== idx) return pt;
        return { ...pt, ...patch };
      });
      const totalUnits = updated.reduce((s, p) => s + (p.target_qty || 0), 0);
      return {
        ...prev,
        product_targets: updated,
        target_bags: totalUnits,
      };
    });
  };

  const handleUpdateProductTarget = (idx: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = prev.product_targets.map((pt, i) => {
        if (i !== idx) return pt;
        if (field === 'item_selection') {
          const currentType = pt.target_type || 'product';
          if (currentType === 'category') {
            const cat = masters?.categories?.find((c) => String(c.id) === String(val));
            return {
              ...pt,
              category_id: String(val),
              category_name: cat?.name || '',
              product_id: String(val),
              product_name: cat?.name || '',
            };
          } else if (currentType === 'brand') {
            const brand = masters?.brands?.find((b) => String(b.id) === String(val));
            return {
              ...pt,
              brand_id: String(val),
              brand_name: brand?.name || '',
              product_id: String(val),
              product_name: brand?.name || '',
            };
          } else {
            const prod = masters?.products?.find((p) => p.id === val);
            const bObj = masters?.brands?.find(b => String(b.id) === String(prod?.brand_id));
            const cObj = masters?.categories?.find(c => String(c.id) === String(prod?.category_id));
            return {
              ...pt,
              product_id: prod?.id || val,
              product_code: prod?.code || '',
              product_name: prod?.name || '',
              brand_id: prod?.brand_id ? String(prod.brand_id) : pt.brand_id,
              brand_name: bObj?.name || pt.brand_name,
              category_id: prod?.category_id ? String(prod.category_id) : pt.category_id,
              category_name: cObj?.name || pt.category_name,
              target_amount: Math.round((pt.target_qty || 0) * (prod?.rate || 350)),
            };
          }
        }
        if (field === 'target_qty') {
          const num = parseFloat(val) || 0;
          const currentType = pt.target_type || 'product';
          let rate = 350;
          if (currentType === 'product') {
            const prod = masters?.products?.find((p) => p.id === pt.product_id);
            rate = prod?.rate || 350;
          }
          return {
            ...pt,
            target_qty: num,
            target_amount: pt.target_amount && pt.target_amount > 0 ? pt.target_amount : Math.round(num * rate),
          };
        }
        return { ...pt, [field]: val };
      });
      const totalUnits = updated.reduce((s, p) => s + (p.target_qty || 0), 0);
      return {
        ...prev,
        product_targets: updated,
        target_bags: totalUnits,
      };
    });
  };

  // Staff Management Catalog Multi-Select Helpers
  const getStaffCatalogFilteredProducts = () => {
    let list = masters?.products || [];
    if (staffCatalogOnlyOfficerAssigned && officerAssignedProductIds.length > 0) {
      list = list.filter((p) => officerAssignedProductIds.includes(String(p.id)));
    }
    if (staffCatalogBrandFilter) {
      list = list.filter((p) => String(p.brand_id) === String(staffCatalogBrandFilter));
    }
    if (staffCatalogParentCatFilter) {
      const subCatIds = (masters?.categories || [])
        .filter((c) => String(c.parent_id) === String(staffCatalogParentCatFilter))
        .map((c) => String(c.id));
      if (staffCatalogSubCatFilter) {
        list = list.filter((p) => String(p.category_id) === String(staffCatalogSubCatFilter));
      } else {
        const allowed = [String(staffCatalogParentCatFilter), ...subCatIds];
        list = list.filter((p) => allowed.includes(String(p.category_id)));
      }
    }
    if (staffCatalogSearch.trim()) {
      const q = staffCatalogSearch.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.bag_size || '').toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getStaffCatalogRelatedMainCategories = () => {
    const allCats = masters?.categories || [];
    const mainCats = allCats.filter((c) => !c.parent_id);
    const candidateCats = mainCats.length > 0 ? mainCats : allCats;
    if (!staffCatalogBrandFilter) return candidateCats;
    const brandProductCatIds = (masters?.products || [])
      .filter((p) => String(p.brand_id) === String(staffCatalogBrandFilter))
      .map((p) => String(p.category_id));
    const parentIdsOfBrandProducts = allCats
      .filter((c) => brandProductCatIds.includes(String(c.id)))
      .map((c) => (c.parent_id ? String(c.parent_id) : null))
      .filter(Boolean);
    const related = candidateCats.filter(
      (c) => brandProductCatIds.includes(String(c.id)) || parentIdsOfBrandProducts.includes(String(c.id))
    );
    return related.length > 0 ? related : candidateCats;
  };

  const handleApplyStaffCatalogSelection = () => {
    if (staffCatalogSelectedIds.length === 0) return;
    const existingProductIds = new Set(
      formData.product_targets.filter((pt) => pt.target_type === 'product').map((pt) => String(pt.product_id))
    );

    const newItems: ProductTargetItem[] = [];
    for (const pid of staffCatalogSelectedIds) {
      if (existingProductIds.has(String(pid))) continue;
      const prod = masters?.products?.find((p) => String(p.id) === String(pid));
      if (!prod) continue;
      const bObj = masters?.brands?.find((b) => String(b.id) === String(prod.brand_id));
      const cObj = masters?.categories?.find((c) => String(c.id) === String(prod.category_id));
      newItems.push({
        target_type: 'product',
        product_id: prod.id,
        product_code: prod.code || '',
        product_name: prod.name || '',
        brand_id: prod.brand_id ? String(prod.brand_id) : undefined,
        brand_name: bObj?.name,
        category_id: prod.category_id ? String(prod.category_id) : undefined,
        category_name: cObj?.name,
        target_qty: staffCatalogDefaultQty || 100,
        target_amount: Math.round((staffCatalogDefaultQty || 100) * (prod.rate || 350)),
        incentive_rate: staffCatalogDefaultIncentive || 5,
      });
    }

    if (newItems.length > 0) {
      setFormData((prev) => {
        const updated = [...prev.product_targets, ...newItems];
        const totalUnits = updated.reduce((s, p) => s + (p.target_qty || 0), 0);
        return {
          ...prev,
          product_targets: updated,
          target_bags: totalUnits,
        };
      });
      toast({
        title: 'Products Added',
        description: `Added ${newItems.length} products to target configuration.`,
      });
    }
    setIsStaffCatalogOpen(false);
    setStaffCatalogSelectedIds([]);
  };

  const handleRemoveProductTarget = (idx: number) => {
    setFormData((prev) => {
      const updated = prev.product_targets.filter((_, i) => i !== idx);
      const totalUnits = updated.reduce((s, p) => s + (p.target_qty || 0), 0);
      return {
        ...prev,
        product_targets: updated,
        target_bags: totalUnits,
      };
    });
  };

  const handleAddPresetActivity = (name: string, uom: string, defaultTarget: number, defaultIncentive = 0) => {
    if (formData.custom_targets.some((ct) => ct.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Already Added', description: `${name} activity target is already in the list.` });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      custom_targets: [
        ...prev.custom_targets,
        {
          id: 'ct-' + Date.now(),
          name,
          uom,
          target_val: defaultTarget,
          incentive_rate: defaultIncentive,
        },
      ],
    }));
  };

  // Custom Target Category Builder Handlers
  const handleAddCustomTarget = () => {
    const newId = 'ct-' + Date.now();
    setFormData((prev) => ({
      ...prev,
      custom_targets: [
        ...prev.custom_targets,
        {
          id: newId,
          name: 'New Custom Activity',
          uom: 'visits',
          target_val: 20,
          incentive_rate: 0,
        },
      ],
    }));
  };

  const handleUpdateCustomTarget = (idx: number, field: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      custom_targets: prev.custom_targets.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item
      ),
    }));
  };

  const handleRemoveCustomTarget = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      custom_targets: prev.custom_targets.filter((_, i) => i !== idx),
    }));
  };

  // Incentive Slabs Handlers
  const handleAddIncentiveSlab = () => {
    setFormData((prev) => ({
      ...prev,
      incentive_slabs: [
        ...prev.incentive_slabs,
        {
          min_pct: 120,
          max_pct: 150,
          rate_per_bag: 12,
          label: 'Tier Bonus',
        },
      ],
    }));
  };

  const handleUpdateIncentiveSlab = (idx: number, field: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      incentive_slabs: prev.incentive_slabs.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item
      ),
    }));
  };

  const handleRemoveIncentiveSlab = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      incentive_slabs: prev.incentive_slabs.filter((_, i) => i !== idx),
    }));
  };

  // Save Target Allocation
  const handleSaveTarget = async () => {
    if (!selectedOfficer) return;
    setSaving(true);
    try {
      await salesTargetService.saveTarget({
        user_id: selectedOfficer.user.id,
        year: selectedYear,
        month: selectedMonth,
        fiscal_year: data?.filter.fiscal_year || '2026-2027',
        ...formData,
      });
      toast({
        title: 'Target Saved Successfully',
        description: `Updated multi-dimensional targets for ${selectedOfficer.user.name}.`,
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.response?.data?.error || 'Could not save sales target.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Replicate previous month
  const handleCopyPrevious = async () => {
    setCopying(true);
    try {
      const res = await salesTargetService.copyPreviousTargets({
        from_year: copyFromYear,
        from_month: copyFromMonth,
        to_year: selectedYear,
        to_month: selectedMonth,
        growth_pct: copyGrowthPct,
      });
      toast({
        title: 'Targets Replicated',
        description: res.data.message,
      });
      setIsCopyModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Replication Failed',
        description: err.response?.data?.error || 'Could not duplicate targets.',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data?.officers?.length) return;
    const headers = [
      'Officer Name',
      'Email',
      'Territory',
      'Target Revenue (Rs)',
      'Actual Revenue (Rs)',
      'Rev Achieved %',
      'Target Bags',
      'Actual Bags',
      'Bags Achieved %',
      'Dealer Bags Target',
      'Dealer Bags Actual',
      'Non-Dealer Bags Target',
      'Non-Dealer Bags Actual',
      'Collection Target (Rs)',
      'Collection Actual (Rs)',
      'Target Visits',
      'Actual Visits',
      'Target New Dealers',
      'Actual New Dealers',
      'Active Incentive Tier',
      'Net Incentive Earned (Rs)',
    ];

    const rows = data.officers.map((o) => [
      `"${o.user.name}"`,
      `"${o.user.email}"`,
      `"${o.user.territory}"`,
      o.targets.target_revenue,
      o.actuals.actual_revenue,
      o.fulfillment.revenue_pct + '%',
      o.targets.target_bags,
      o.actuals.actual_bags,
      o.fulfillment.bags_pct + '%',
      o.targets.target_dealer_bags,
      o.actuals.actual_dealer_bags,
      o.targets.target_non_dealer_bags,
      o.actuals.actual_non_dealer_bags,
      o.targets.target_collection,
      o.actuals.actual_collection,
      o.targets.target_visits,
      o.actuals.actual_visits,
      o.targets.target_new_dealers,
      o.actuals.actual_new_dealers,
      `"${o.fulfillment.active_tier || 'Below Qualifier'}"`,
      o.fulfillment.estimated_incentive,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Sales_Targets_Matrix_${selectedYear}_Month_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Enterprise Sales Targets &amp; Incentive Allocation</span>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  {data?.filter.date_range_label || 'Current Period'}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Set customizable target categories (Site Visits, Project Visits, Bags, Pkts, ₹) with tiered incentive slabs.
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[105px] h-9 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">
                  FY {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Selector */}
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[125px] h-9 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.val} value={m.val.toString()} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Replicate Button */}
          {data?.is_admin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCopyModalOpen(true)}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Last Month</span>
            </Button>
          )}

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Matrix</span>
          </Button>

          {data?.is_admin && data?.officers && data.officers.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenEdit(data.officers[0])}
              className="h-9 gap-1.5 text-xs shadow-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Target</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Executive 4-Card Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue Quota */}
        <Card className="border shadow-2xs rounded-2xl bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Total Sales Quota</span>
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {data?.summary ? `${data.summary.overall_achievement_pct}%` : '0%'}
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-foreground">
                {formatIndianCurrency(data?.summary.total_actual_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {formatIndianCurrency(data?.summary.total_target_revenue || 0)}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, data?.summary.overall_achievement_pct || 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Bag Volume Quota */}
        <Card className="border shadow-2xs rounded-2xl bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                <span>Bag Volume Quota</span>
              </span>
              <span className="text-xs font-bold text-purple-600">
                {data?.summary.total_target_bags
                  ? `${Math.round(((data.summary.total_actual_bags || 0) / data.summary.total_target_bags) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-foreground">
                {formatIndianNumber(data?.summary.total_actual_bags || 0)}{' '}
                <span className="text-xs font-normal text-muted-foreground">bags</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {formatIndianNumber(data?.summary.total_target_bags || 0)} bags
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
              <span>Dealer: {formatIndianNumber(data?.summary.total_actual_dealer_bags || 0)}</span>
              <span>•</span>
              <span>Non-Dealer: {formatIndianNumber(data?.summary.total_actual_non_dealer_bags || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Payment Recovery */}
        <Card className="border shadow-2xs rounded-2xl bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Collections Target</span>
              </span>
              <span className="text-xs font-bold text-blue-600">
                {data?.summary.total_target_collection
                  ? `${Math.round(((data.summary.total_actual_collection || 0) / data.summary.total_target_collection) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-foreground">
                {formatIndianCurrency(data?.summary.total_actual_collection || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {formatIndianCurrency(data?.summary.total_target_collection || 0)}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    data?.summary.total_target_collection
                      ? ((data.summary.total_actual_collection || 0) / data.summary.total_target_collection) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Sales Team Deployment */}
        <Card className="border shadow-2xs rounded-2xl bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Configured Officers</span>
              </span>
              <span className="text-xs font-bold text-amber-600">
                {data?.summary.configured_officers} / {data?.summary.total_officers}
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-foreground">
                {data?.summary.total_officers || 0}{' '}
                <span className="text-xs font-normal text-muted-foreground">Sales Officers</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Avg Target: {formatIndianCurrency((data?.summary.total_target_revenue || 0) / (data?.summary.total_officers || 1))}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Multi-target &amp; Tiered SIP enabled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search officer or territory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Territories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Territories
              </SelectItem>
              {uniqueTerritories.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Sales Officers Target Matrix Table / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-primary" />
            <span>Loading sales officer targets and live actuals...</span>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm bg-card rounded-2xl border space-y-3">
            <Target className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
            <div className="font-semibold text-foreground">No sales officers matching current filter</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || territoryFilter !== 'ALL'
                ? 'Try clearing your search query or territory filter.'
                : 'No active staff members found with the "SALES" role in this company.'}
            </p>
            {(searchQuery || territoryFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTerritoryFilter('ALL');
                }}
                className="h-8 text-xs font-semibold"
              >
                Clear Search &amp; Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOfficers.map((o) => {
              const achPct = o.fulfillment.overall_pct;
              const isGreen = achPct >= 100;
              const isAmber = achPct >= 70 && achPct < 100;

              return (
                <Card
                  key={o.user.id}
                  className="border shadow-2xs rounded-2xl bg-card hover:border-primary/40 transition-all overflow-hidden"
                >
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Officer Identity */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                          {o.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">{o.user.name}</h4>
                            {o.is_configured ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                Configured
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                                Default Baseline
                              </Badge>
                            )}
                            {o.fulfillment.active_tier && (
                              <Badge className="text-[10px] bg-purple-600 text-white gap-1">
                                <Award className="w-3 h-3" />
                                <span>{o.fulfillment.active_tier}</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{o.user.email}</span>
                            <span>•</span>
                            <span>{o.user.territory}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Incentive Badge */}
                      <div className="flex items-center gap-2">
                        <div className="text-right px-3 py-1.5 rounded-xl bg-muted/40 border">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Earned Incentive</span>
                          <span className="text-sm font-black text-emerald-600">
                            {formatIndianCurrency(o.fulfillment.estimated_incentive)}
                          </span>
                        </div>
                        {data?.is_admin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(o)}
                            className="h-9 gap-1.5 text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-primary" />
                            <span>Configure Multi-Target</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 4 Core Pillars Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 border-t text-xs">
                      {/* Revenue Target */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Sales Target (₹)</span>
                          <span
                            className={`font-bold ${
                              isGreen ? 'text-emerald-600' : isAmber ? 'text-amber-600' : 'text-rose-600'
                            }`}
                          >
                            {achPct}%
                          </span>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatIndianCurrency(o.actuals.actual_revenue)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Target: {formatIndianCurrency(o.targets.target_revenue)}
                        </p>
                      </div>

                      {/* Product Targets / Volume Quota */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>{o.targets.product_targets?.length ? 'Product Quota' : 'Order Bags'}</span>
                          <span className="font-bold text-purple-600">{o.fulfillment.bags_pct}%</span>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatIndianNumber(o.actuals.actual_bags)} / {formatIndianNumber(o.targets.target_bags)} units
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          {o.targets.product_targets?.length ? (
                            <span className="text-purple-700 font-medium">{o.targets.product_targets.length} Products Monitored</span>
                          ) : (
                            <span>Dealer: {formatIndianNumber(o.actuals.actual_dealer_bags)}/{formatIndianNumber(o.targets.target_dealer_bags)}</span>
                          )}
                          <span>Orders: {o.actuals.order_count || 0}</span>
                        </div>
                      </div>

                      {/* Collections Target */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Collections</span>
                          <span className="font-bold text-blue-600">{o.fulfillment.collection_pct}%</span>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatIndianCurrency(o.actuals.actual_collection)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Target: {formatIndianCurrency(o.targets.target_collection)}
                        </p>
                      </div>

                      {/* Field Visits & Onboarding */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Visits &amp; Expansion</span>
                          <span className="font-bold text-foreground">
                            {o.actuals.actual_visits} / {o.targets.target_visits}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {o.actuals.actual_new_dealers} / {o.targets.target_new_dealers} New Dealers
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Travel Days: {o.actuals.actual_travel_days} / {o.targets.target_travel_days}
                        </p>
                      </div>
                    </div>

                    {/* PRODUCT, CATEGORY & BRAND TARGETS BREAKDOWN */}
                    {o.targets.product_targets && o.targets.product_targets.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                            <span>Product, Category &amp; Brand Quotas:</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {o.targets.product_targets.length} Quotas Monitored
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {o.targets.product_targets.map((pt, pidx) => {
                            const tType = pt.target_type || 'product';
                            const badgeLabel = tType === 'category' ? 'CAT' : (tType === 'brand' ? 'BRAND' : 'SKU');
                            const badgeColor = tType === 'category' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' 
                              : (tType === 'brand' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200' 
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200');
                            const displayName = pt.display_name || pt.product_name || 'Item';
                            return (
                              <div key={pidx} className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-[11px] space-y-0.5">
                                <div className="flex justify-between font-bold text-foreground items-center gap-1">
                                  <div className="flex items-center gap-1 truncate" title={displayName}>
                                    <Badge variant="outline" className={`text-[8px] px-1 py-0 font-bold uppercase shrink-0 ${badgeColor}`}>
                                      {badgeLabel}
                                    </Badge>
                                    <span className="truncate">{displayName}</span>
                                  </div>
                                  <span className="text-purple-600 font-extrabold shrink-0">{pt.achievement_pct || 0}%</span>
                                </div>
                                <div className="text-xs font-semibold text-foreground">
                                  {formatIndianNumber(pt.actual_qty || 0)}{' '}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    / {formatIndianNumber(pt.target_qty)} units
                                  </span>
                                </div>
                                {pt.actual_amount ? (
                                  <div className="text-[10px] text-muted-foreground">
                                    Revenue: {formatIndianCurrency(pt.actual_amount)}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC CUSTOM TARGET CATEGORIES WITH CUSTOM UOM */}
                    {o.targets.custom_targets && o.targets.custom_targets.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          <span>Field Activities &amp; Meeting Targets:</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {o.targets.custom_targets.map((ct) => (
                            <div key={ct.id} className="p-2 rounded-xl bg-secondary/50 border text-[11px] space-y-0.5">
                              <div className="flex justify-between font-bold text-foreground truncate" title={ct.name}>
                                <span>{ct.name}</span>
                                <span className="text-primary">{ct.achievement_pct || 0}%</span>
                              </div>
                              <div className="text-xs font-semibold text-foreground">
                                {formatIndianNumber(ct.actual_val || 0)}{' '}
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  / {formatIndianNumber(ct.target_val)} {ct.uom}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* INCENTIVE ACCELERATOR BANNER */}
                    {o.fulfillment.next_tier && (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <div className="flex items-center gap-2 text-amber-700">
                          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold">{o.fulfillment.next_tier.headline}</span>
                        </div>
                        {o.fulfillment.collection_penalty_applied && (
                          <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">
                            Collection Safety Gatekeeper Active
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MULTI-TARGET ALLOCATION MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Target className="w-5 h-5 text-primary" />
              <span>Enterprise Multi-Target &amp; SIP Allocation: {selectedOfficer?.user.name}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Period: {data?.filter.date_range_label} ({data?.filter.fiscal_year}) • Territory: {selectedOfficer?.user.territory}
            </p>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="collections" className="text-xs">
                1. Collections &amp; Sales (₹)
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs">
                2. Product Targets (SKUs)
              </TabsTrigger>
              <TabsTrigger value="visits" className="text-xs">
                3. Visits &amp; Field Meets
              </TabsTrigger>
              <TabsTrigger value="incentive" className="text-xs">
                4. Incentive Slabs
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Collections & Sales Revenue */}
            <TabsContent value="collections" className="space-y-4 pt-2">
              <div className="space-y-3">
                {/* Auto-fetch Payment Collection Quota */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-emerald-600" />
                      <span>Payment Collection Target (₹)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                      Auto-Fetched from ERP Receipts
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    value={formData.target_collection}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, target_collection: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-10 text-base font-extrabold bg-background"
                    placeholder="e.g. 500000"
                  />
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400">
                    Live ERP payments submitted by this Sales Officer in Payment Receipts will be automatically aggregated towards this recovery target.
                  </p>
                </div>

                {/* Sales Revenue Target */}
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Monthly Gross Sales Revenue Target (₹) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.target_revenue}
                    onChange={(e) => handleRevenueChange(parseFloat(e.target.value) || 0)}
                    className="h-9 mt-1 text-sm font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Benchmark booked sales value (e.g. ₹10,00,000 for ₹10 Lakhs).
                  </p>
                </div>

                {/* Channel Split */}
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Channel Revenue Split (Dealer vs Direct Project)</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Dealer Network Revenue (₹)</label>
                      <Input
                        type="number"
                        value={formData.target_dealer_revenue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            target_dealer_revenue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Direct Project Revenue (₹)</label>
                      <Input
                        type="number"
                        value={formData.target_non_dealer_revenue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            target_non_dealer_revenue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Gatekeeper threshold */}
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Collection Safety Gatekeeper Threshold (%)
                    </label>
                    <span className="text-xs font-bold text-amber-700">{formData.min_collection_pct_for_incentive}%</span>
                  </div>
                  <Input
                    type="number"
                    value={formData.min_collection_pct_for_incentive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, min_collection_pct_for_incentive: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-8 text-xs bg-background"
                  />
                  <p className="text-[10px] text-amber-700/90 dark:text-amber-400">
                    If SO recovers less than this % of their payment collection target, 50% incentive is withheld until cleared.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Product, Category & Brand Targets */}
            <TabsContent value="products" className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-purple-600" />
                      <span>Product, Category &amp; Brand Quotas</span>
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Set targets on specific Product SKUs, entire Categories, or Brands. Order line items will auto-aggregate to these quotas.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStaffCatalogSelectedIds([]);
                        setStaffCatalogSearch('');
                        setStaffCatalogBrandFilter(null);
                        setStaffCatalogParentCatFilter(null);
                        setStaffCatalogSubCatFilter(null);
                        setIsStaffCatalogOpen(true);
                      }}
                      className="h-8 text-xs gap-1.5 border-purple-400 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold shadow-xs"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span>Select Products (Staff Style)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProductTarget('product')}
                      className="h-8 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Product SKU</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProductTarget('category')}
                      className="h-8 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      <span>+ Category</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProductTarget('brand')}
                      className="h-8 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>+ Brand</span>
                    </Button>
                  </div>
                </div>

                {formData.product_targets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-3">
                    <p className="text-foreground font-medium">No product, category or brand quotas configured yet.</p>
                    <p className="text-[11px]">Choose an option below to set volume quotas:</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setStaffCatalogSelectedIds([]);
                          setStaffCatalogSearch('');
                          setStaffCatalogBrandFilter(null);
                          setStaffCatalogParentCatFilter(null);
                          setStaffCatalogSubCatFilter(null);
                          setIsStaffCatalogOpen(true);
                        }}
                        className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                      >
                        <Shield className="w-3.5 h-3.5" /> Select Products (Staff Management Style)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddProductTarget('product')}
                        className="text-xs gap-1 border-purple-300 text-purple-700"
                      >
                        <Package className="w-3.5 h-3.5" /> Add Product SKU
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddProductTarget('category')}
                        className="text-xs gap-1 border-blue-300 text-blue-700"
                      >
                        <FolderTree className="w-3.5 h-3.5" /> Add Category Quota
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddProductTarget('brand')}
                        className="text-xs gap-1 border-amber-300 text-amber-700"
                      >
                        <Tag className="w-3.5 h-3.5" /> Add Brand Quota
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.product_targets.map((pt, idx) => {
                      const tType = pt.target_type || 'product';
                      const currentProd = masters?.products?.find((p) => p.id === pt.product_id);
                      const currentBrandId = pt.brand_id || (currentProd?.brand_id ? String(currentProd.brand_id) : '');
                      const currentCatId = pt.category_id || (currentProd?.category_id ? String(currentProd.category_id) : '');

                      // Categories for this row (filtered if brand selected)
                      const availableCategoriesForRow = (masters?.categories || []).filter((c) => {
                        if (!currentBrandId) return true;
                        const prodsInBrand = (masters?.products || []).filter(
                          (p) => String(p.brand_id) === String(currentBrandId)
                        );
                        return prodsInBrand.some((p) => String(p.category_id) === String(c.id));
                      });

                      // Products for this row (filtered by chosen Brand & Category)
                      const matchingProdsForRow = (masters?.products || []).filter((p) => {
                        if (currentBrandId && String(p.brand_id) !== String(currentBrandId)) return false;
                        if (currentCatId && String(p.category_id) !== String(currentCatId)) return false;
                        return true;
                      });

                      return (
                        <div key={idx} className="p-3 rounded-xl border bg-card space-y-2">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                            {/* Target Type Picker */}
                            <div className="w-full lg:w-32 shrink-0">
                              <label className="text-[10px] font-semibold text-muted-foreground">Target By</label>
                              <Select
                                value={tType}
                                onValueChange={(val: 'product' | 'category' | 'brand') => handleUpdateProductTargetType(idx, val)}
                              >
                                <SelectTrigger className="h-8 mt-0.5 text-xs font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="product" className="text-xs">📦 Product SKU</SelectItem>
                                  <SelectItem value="category" className="text-xs">📁 Category</SelectItem>
                                  <SelectItem value="brand" className="text-xs">🏷️ Brand</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Dynamic Selectors depending on Target By */}
                            {tType === 'product' && (
                              <>
                                {/* Filter Brand dropdown */}
                                <div className="w-full sm:w-36 shrink-0">
                                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-amber-600" /> Brand
                                  </label>
                                  <Select
                                    value={currentBrandId || 'ALL'}
                                    onValueChange={(bId) => {
                                      const brandId = bId === 'ALL' ? '' : bId;
                                      const brandObj = masters?.brands?.find((b) => String(b.id) === String(brandId));
                                      const prodsMatchingBrand = (masters?.products || []).filter(
                                        (p) => !brandId || String(p.brand_id) === String(brandId)
                                      );
                                      let newProd = prodsMatchingBrand.find((p) => p.id === pt.product_id);
                                      if (!newProd && prodsMatchingBrand.length > 0) {
                                        newProd = prodsMatchingBrand[0];
                                      }
                                      const newCatObj = masters?.categories?.find(
                                        (c) => String(c.id) === String(newProd?.category_id)
                                      );
                                      handleUpdateProductTargetRow(idx, {
                                        brand_id: brandId,
                                        brand_name: brandObj?.name || '',
                                        category_id: newProd?.category_id ? String(newProd.category_id) : pt.category_id,
                                        category_name: newCatObj?.name || pt.category_name,
                                        product_id: newProd?.id || pt.product_id,
                                        product_name: newProd?.name || pt.product_name,
                                        product_code: newProd?.code || pt.product_code,
                                        target_amount: newProd
                                          ? Math.round((pt.target_qty || 100) * (newProd.rate || 350))
                                          : pt.target_amount,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 mt-0.5 text-xs">
                                      <SelectValue placeholder="All Brands" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      <SelectItem value="ALL" className="text-xs font-semibold">🏷️ All Brands</SelectItem>
                                      {(masters?.brands || []).map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Filter Category dropdown */}
                                <div className="w-full sm:w-36 shrink-0">
                                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <FolderTree className="w-3 h-3 text-blue-600" /> Category
                                  </label>
                                  <Select
                                    value={currentCatId || 'ALL'}
                                    onValueChange={(cId) => {
                                      const catId = cId === 'ALL' ? '' : cId;
                                      const catObj = masters?.categories?.find((c) => String(c.id) === String(catId));
                                      const prodsMatching = (masters?.products || []).filter(
                                        (p) =>
                                          (!currentBrandId || String(p.brand_id) === String(currentBrandId)) &&
                                          (!catId || String(p.category_id) === String(catId))
                                      );
                                      let newProd = prodsMatching.find((p) => p.id === pt.product_id);
                                      if (!newProd && prodsMatching.length > 0) {
                                        newProd = prodsMatching[0];
                                      }
                                      handleUpdateProductTargetRow(idx, {
                                        category_id: catId,
                                        category_name: catObj?.name || '',
                                        product_id: newProd?.id || pt.product_id,
                                        product_name: newProd?.name || pt.product_name,
                                        product_code: newProd?.code || pt.product_code,
                                        target_amount: newProd
                                          ? Math.round((pt.target_qty || 100) * (newProd.rate || 350))
                                          : pt.target_amount,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 mt-0.5 text-xs">
                                      <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      <SelectItem value="ALL" className="text-xs font-semibold">📁 All Categories</SelectItem>
                                      {availableCategoriesForRow.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Select Product SKU */}
                                <div className="flex-1 min-w-[200px]">
                                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3 text-purple-600" /> Select Product SKU
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-normal">
                                      ({matchingProdsForRow.length} available)
                                    </span>
                                  </label>
                                  <Select
                                    value={pt.product_id || ''}
                                    onValueChange={(val) => handleUpdateProductTarget(idx, 'item_selection', val)}
                                  >
                                    <SelectTrigger className="h-8 mt-0.5 text-xs font-medium">
                                      <SelectValue placeholder="Choose Product SKU..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      {matchingProdsForRow.map((p) => {
                                        const bObj = masters?.brands?.find((b) => String(b.id) === String(p.brand_id));
                                        return (
                                          <SelectItem key={p.id} value={p.id} className="text-xs">
                                            <span className="font-semibold">{p.name}</span>
                                            {p.bag_size ? <span className="text-muted-foreground"> ({p.bag_size})</span> : ''}
                                            {bObj ? (
                                              <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                                [{bObj.name}]
                                              </span>
                                            ) : ''}
                                            <span className="ml-1 text-[10px] text-muted-foreground">— {p.code} (₹{p.rate || 0})</span>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                            {tType === 'category' && (
                              <>
                                {/* Optional Brand Filter */}
                                <div className="w-full sm:w-36 shrink-0">
                                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-amber-600" /> Filter Brand
                                  </label>
                                  <Select
                                    value={pt.brand_id || 'ALL'}
                                    onValueChange={(bId) => {
                                      const brandId = bId === 'ALL' ? '' : bId;
                                      const brandObj = masters?.brands?.find((b) => String(b.id) === String(brandId));
                                      handleUpdateProductTargetRow(idx, {
                                        brand_id: brandId,
                                        brand_name: brandObj?.name || '',
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 mt-0.5 text-xs">
                                      <SelectValue placeholder="All Brands" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      <SelectItem value="ALL" className="text-xs font-semibold">🏷️ All Brands</SelectItem>
                                      {(masters?.brands || []).map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Category Selector */}
                                <div className="flex-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <FolderTree className="w-3 h-3 text-blue-600" /> Select Category
                                  </label>
                                  <Select
                                    value={pt.category_id || pt.product_id || ''}
                                    onValueChange={(val) => handleUpdateProductTarget(idx, 'item_selection', val)}
                                  >
                                    <SelectTrigger className="h-8 mt-0.5 text-xs">
                                      <SelectValue placeholder="Choose Category..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      {availableCategoriesForRow.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                          📁 {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                            {tType === 'brand' && (
                              <div className="flex-1">
                                <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-amber-600" /> Select Brand
                                </label>
                                <Select
                                  value={pt.brand_id || pt.product_id || ''}
                                  onValueChange={(val) => handleUpdateProductTarget(idx, 'item_selection', val)}
                                >
                                  <SelectTrigger className="h-8 mt-0.5 text-xs">
                                    <SelectValue placeholder="Choose Brand..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {(masters?.brands || []).map((b) => (
                                      <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                                        🏷️ {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Target Qty */}
                            <div className="w-full sm:w-28 shrink-0">
                              <label className="text-[10px] font-semibold text-muted-foreground">Target Qty (Units)</label>
                              <Input
                                type="number"
                                value={pt.target_qty}
                                onChange={(e) => handleUpdateProductTarget(idx, 'target_qty', e.target.value)}
                                className="h-8 mt-0.5 text-xs font-bold text-purple-700"
                              />
                            </div>

                            {/* Estimated Revenue */}
                            <div className="w-full sm:w-28 shrink-0">
                              <label className="text-[10px] font-semibold text-muted-foreground">Target Val (₹)</label>
                              <Input
                                type="number"
                                value={pt.target_amount || 0}
                                onChange={(e) => handleUpdateProductTarget(idx, 'target_amount', parseFloat(e.target.value) || 0)}
                                className="h-8 mt-0.5 text-xs font-medium"
                              />
                            </div>

                            {/* Incentive per Unit */}
                            <div className="w-full sm:w-24 shrink-0">
                              <label className="text-[10px] font-semibold text-muted-foreground">₹ Inc./Unit</label>
                              <Input
                                type="number"
                                placeholder="₹0"
                                value={pt.incentive_rate || 0}
                                onChange={(e) => handleUpdateProductTarget(idx, 'incentive_rate', parseFloat(e.target.value) || 0)}
                                className="h-8 mt-0.5 text-xs text-emerald-600 font-semibold"
                              />
                            </div>

                            {/* Delete */}
                            <div className="pt-0 sm:pt-4 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProductTarget(idx)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Summary Footer */}
                    <div className="p-3 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">
                        Total Volume Quota: <strong className="text-foreground">{formData.product_targets.reduce((s, p) => s + (p.target_qty || 0), 0)} units</strong> ({formData.product_targets.length} Quotas)
                      </span>
                      <span className="font-semibold text-purple-700">
                        Est. Value: {formatIndianCurrency(formData.product_targets.reduce((s, p) => s + (p.target_amount || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Field Activity, Visits & Meets */}
            <TabsContent value="visits" className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Visits &amp; Field Meets Targets</span>
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Set custom quotas on Project Visits, Masonry Meets, Dealer Meets, Distributor Meets.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomTarget}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Activity</span>
                  </Button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Quick Add Activity Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPresetActivity('Project / Site Visits', 'visits', 15, 0)}
                      className="h-7 text-xs bg-background border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      🏗️ + Project / Site Visits
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPresetActivity('Masonry Meets', 'meets', 2, 250)}
                      className="h-7 text-xs bg-background border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      🧱 + Masonry Meets
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPresetActivity('Dealer Meets', 'meets', 1, 300)}
                      className="h-7 text-xs bg-background border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                      🏬 + Dealer Meets
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPresetActivity('Distributor Meets', 'meets', 1, 500)}
                      className="h-7 text-xs bg-background border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                    >
                      🏭 + Distributor Meets
                    </Button>
                  </div>
                </div>

                {/* Activity List */}
                <div className="space-y-2.5">
                  {formData.custom_targets.map((ct, idx) => (
                    <div key={ct.id || idx} className="p-3 rounded-xl border bg-card space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Activity / Meeting Name</label>
                          <Input
                            placeholder="e.g. Masonry Meets / Project Visits"
                            value={ct.name}
                            onChange={(e) => handleUpdateCustomTarget(idx, 'name', e.target.value)}
                            className="h-8 mt-0.5 text-xs font-semibold"
                          />
                        </div>
                        <div className="w-full sm:w-36">
                          <label className="text-[10px] font-semibold text-muted-foreground">Count By (UOM)</label>
                          <Select
                            value={ct.uom}
                            onValueChange={(val) => handleUpdateCustomTarget(idx, 'uom', val)}
                          >
                            <SelectTrigger className="h-8 mt-0.5 text-xs">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {UOM_OPTIONS.map((u) => (
                                <SelectItem key={u.value} value={u.value} className="text-xs">
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full sm:w-28">
                          <label className="text-[10px] font-semibold text-muted-foreground">Target Count</label>
                          <Input
                            type="number"
                            value={ct.target_val}
                            onChange={(e) =>
                              handleUpdateCustomTarget(idx, 'target_val', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 mt-0.5 text-xs font-bold"
                          />
                        </div>
                        <div className="w-full sm:w-28">
                          <label className="text-[10px] font-semibold text-muted-foreground">₹ Incentive/Count</label>
                          <Input
                            type="number"
                            placeholder="₹0"
                            value={ct.incentive_rate || 0}
                            onChange={(e) =>
                              handleUpdateCustomTarget(idx, 'incentive_rate', parseFloat(e.target.value) || 0)
                            }
                            className="h-8 mt-0.5 text-xs font-semibold text-emerald-600"
                          />
                        </div>
                        <div className="pt-0 sm:pt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCustomTarget(idx)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Base Visits & Travel Days Quotas */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Total Counter Visits</label>
                    <Input
                      type="number"
                      value={formData.target_visits}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, target_visits: parseInt(e.target.value) || 0 }))
                      }
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">New Onboardings</label>
                    <Input
                      type="number"
                      value={formData.target_new_dealers}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, target_new_dealers: parseInt(e.target.value) || 0 }))
                      }
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">Travel Days</label>
                    <Input
                      type="number"
                      value={formData.target_travel_days}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, target_travel_days: parseInt(e.target.value) || 0 }))
                      }
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: ENTERPRISE TIERED INCENTIVE SLABS */}
            <TabsContent value="incentive" className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Enterprise Tiered Incentive Slabs (Accelerators)</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Higher achievement triggers higher per-bag rewards to motivate sales officers.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddIncentiveSlab}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Tier Slab</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.incentive_slabs.map((slab, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border bg-card text-xs">
                      <div className="w-40 font-semibold text-foreground">
                        <Input
                          value={slab.label}
                          onChange={(e) => handleUpdateIncentiveSlab(idx, 'label', e.target.value)}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px]">Min:</span>
                        <Input
                          type="number"
                          value={slab.min_pct}
                          onChange={(e) => handleUpdateIncentiveSlab(idx, 'min_pct', parseFloat(e.target.value) || 0)}
                          className="h-8 w-16 text-xs"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px]">Max:</span>
                        <Input
                          type="number"
                          value={slab.max_pct}
                          onChange={(e) => handleUpdateIncentiveSlab(idx, 'max_pct', parseFloat(e.target.value) || 0)}
                          className="h-8 w-16 text-xs"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px]">Reward:</span>
                        <Input
                          type="number"
                          value={slab.rate_per_bag}
                          onChange={(e) => handleUpdateIncentiveSlab(idx, 'rate_per_bag', parseFloat(e.target.value) || 0)}
                          className="h-8 w-24 text-xs font-bold text-emerald-600"
                        />
                        <span className="text-muted-foreground text-[10px]">₹ / bag</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIncentiveSlab(idx)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Safety Rules & Bounties */}
                <div className="p-3 rounded-xl border bg-card space-y-2 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Safety Gatekeepers &amp; Conversion Bounties</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        New Dealer Onboarding Bounty
                      </label>
                      <Input
                        type="number"
                        value={formData.new_dealer_bounty}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, new_dealer_bounty: parseFloat(e.target.value) || 0 }))
                        }
                        className="h-8 mt-1 text-xs font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Flat ₹ reward per newly onboarded dealer</p>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Collection Safety Threshold %
                      </label>
                      <Input
                        type="number"
                        value={formData.min_collection_pct_for_incentive}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            min_collection_pct_for_incentive: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 mt-1 text-xs font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">If collection &lt; 70%, 50% held until recovery</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Strategy Notes &amp; Guidance</label>
                  <Input
                    placeholder="e.g. Focus on launching ET-222 in North territory..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="h-9 mt-1 text-xs"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTarget} disabled={saving} className="gap-1.5">
              {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save &amp; Deploy Targets</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. DUPLICATE PREVIOUS MONTH MODAL */}
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Copy className="w-5 h-5 text-primary" />
              <span>Duplicate Last Month's Targets</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Replicate targets from a previous month to {MONTHS.find((m) => m.val === selectedMonth)?.label} {selectedYear} with an optional growth multiplier.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Source Month</label>
                <Select
                  value={copyFromMonth.toString()}
                  onValueChange={(v) => setCopyFromMonth(parseInt(v))}
                >
                  <SelectTrigger className="h-9 mt-1 text-xs">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.val} value={m.val.toString()} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Source Year</label>
                <Select
                  value={copyFromYear.toString()}
                  onValueChange={(v) => setCopyFromYear(parseInt(v))}
                >
                  <SelectTrigger className="h-9 mt-1 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">
                        FY {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span>Flat Growth Rate Multiplier:</span>
                <span className="font-bold text-primary">+{copyGrowthPct}%</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant={copyGrowthPct === pct ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCopyGrowthPct(pct)}
                    className="flex-1 h-8 text-xs font-bold"
                  >
                    +{pct}%
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Will scale all revenue, bag volumes, and custom quotas by +{copyGrowthPct}%.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCopyModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCopyPrevious} disabled={copying} className="gap-1.5">
              {copying ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Replicate Targets</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. STAFF MANAGEMENT STYLE PRODUCT PICKER DIALOG */}
      <Dialog open={isStaffCatalogOpen} onOpenChange={setIsStaffCatalogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Shield className="w-5 h-5 text-primary" />
              <span>Assign Products from Staff Management Catalog</span>
            </DialogTitle>
          </DialogHeader>

          {selectedOfficer && (
            <div className="bg-muted/40 border p-3 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Sales Officer: <span className="font-bold text-sm text-primary">{selectedOfficer.user.name}</span> ({selectedOfficer.user.role})
                </p>
                <p className="text-[11px] text-muted-foreground">Territory: {selectedOfficer.user.territory || 'General'}</p>
              </div>
              {officerAssignedProductIds.length > 0 && (
                <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50 gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{officerAssignedProductIds.length} Products Assigned in Staff Module</span>
                </Badge>
              )}
            </div>
          )}

          {/* Quick Filter toggle if officer has assignments */}
          {officerAssignedProductIds.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant={staffCatalogOnlyOfficerAssigned ? 'default' : 'outline'}
                onClick={() => setStaffCatalogOnlyOfficerAssigned((prev) => !prev)}
                className="text-xs h-7 gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{staffCatalogOnlyOfficerAssigned ? '✓ Showing Only Officer Assigned' : 'Filter by Officer Assigned Products'}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">
                  {officerAssignedProductIds.length}
                </Badge>
              </Button>
            </div>
          )}

          {/* 3-Column Cascading Filter (Brand, Category, Subcategory) - Exact Staff Management Style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-card border rounded-xl">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Filter Brand
              </label>
              <select
                value={staffCatalogBrandFilter || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setStaffCatalogBrandFilter(val);
                  setStaffCatalogParentCatFilter(null);
                  setStaffCatalogSubCatFilter(null);
                }}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-background text-xs"
              >
                <option value="">All Brands ({masters?.brands?.length || 0})</option>
                {(masters?.brands || []).map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Filter Category
              </label>
              <select
                value={staffCatalogParentCatFilter || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setStaffCatalogParentCatFilter(val);
                  setStaffCatalogSubCatFilter(null);
                }}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-background text-xs"
              >
                <option value="">All Categories</option>
                {getStaffCatalogRelatedMainCategories().map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Filter Subcategory
              </label>
              <select
                value={staffCatalogSubCatFilter || ''}
                onChange={(e) => setStaffCatalogSubCatFilter(e.target.value || null)}
                disabled={!staffCatalogParentCatFilter}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-background text-xs disabled:opacity-50"
              >
                <option value="">All Subcategories</option>
                {(masters?.categories || [])
                  .filter((c) => String(c.parent_id) === String(staffCatalogParentCatFilter))
                  .map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Search & Select All Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, code..."
                  value={staffCatalogSearch}
                  onChange={(e) => setStaffCatalogSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/20"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const filtered = getStaffCatalogFilteredProducts();
                  const allFilteredIds = filtered.map((p) => String(p.id));
                  const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => staffCatalogSelectedIds.includes(id));
                  if (areAllSelected) {
                    setStaffCatalogSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
                  } else {
                    setStaffCatalogSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
                  }
                }}
                className="h-8 text-xs font-semibold shrink-0"
              >
                Select All ({getStaffCatalogFilteredProducts().length})
              </Button>
            </div>

            {/* Product Checkbox List */}
            <div className="grid grid-cols-1 gap-1.5 p-2 border rounded-xl bg-card max-h-64 overflow-y-auto shadow-inner">
              {getStaffCatalogFilteredProducts().map((p) => {
                const isChecked = staffCatalogSelectedIds.includes(String(p.id));
                const brandObj = masters?.brands?.find((b) => String(b.id) === String(p.brand_id));
                const isOfficerAssigned = officerAssignedProductIds.includes(String(p.id));
                const alreadyInTargets = formData.product_targets.some(
                  (pt) => pt.target_type === 'product' && String(pt.product_id) === String(p.id)
                );

                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg border transition-all ${
                      isChecked
                        ? 'bg-primary/10 border-primary/40'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setStaffCatalogSelectedIds((prev) =>
                          checked ? [...prev, String(p.id)] : prev.filter((id) => id !== String(p.id))
                        );
                      }}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{p.name}</span>
                        {p.bag_size && <span className="text-muted-foreground text-[11px]">({p.bag_size})</span>}
                        {brandObj && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300">
                            {brandObj.name}
                          </Badge>
                        )}
                        {isOfficerAssigned && (
                          <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-semibold text-purple-700 bg-purple-50 border-purple-300">
                            ⭐ Assigned to Officer
                          </Badge>
                        )}
                        {alreadyInTargets && (
                          <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-semibold text-emerald-700 bg-emerald-50 border-emerald-300">
                            ✓ In Current Targets
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>Code: <strong>{p.code}</strong></span>
                        <span>•</span>
                        <span>Rate: <strong>₹{p.rate || 0}</strong></span>
                      </div>
                    </div>
                  </label>
                );
              })}
              {getStaffCatalogFilteredProducts().length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No products found matching filters.
                </div>
              )}
            </div>
          </div>

          {/* Dialog Footer with default values and Add button */}
          <DialogFooter className="flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block">Default Qty</label>
                <Input
                  type="number"
                  value={staffCatalogDefaultQty}
                  onChange={(e) => setStaffCatalogDefaultQty(parseInt(e.target.value) || 0)}
                  className="h-8 w-20 text-xs font-bold text-purple-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block">₹ Incentive/Unit</label>
                <Input
                  type="number"
                  value={staffCatalogDefaultIncentive}
                  onChange={(e) => setStaffCatalogDefaultIncentive(parseFloat(e.target.value) || 0)}
                  className="h-8 w-24 text-xs font-semibold text-emerald-600"
                />
              </div>
              <div className="text-xs text-muted-foreground pt-3 pl-2">
                Selected: <strong className="text-foreground">{staffCatalogSelectedIds.length}</strong> products
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStaffCatalogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={staffCatalogSelectedIds.length === 0}
                onClick={handleApplyStaffCatalogSelection}
                className="text-xs font-bold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add {staffCatalogSelectedIds.length} Products to Targets</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
