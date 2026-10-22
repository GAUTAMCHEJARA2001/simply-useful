import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Users, MapPin, Receipt,
  Package, BarChart3, Settings, LogOut, Menu, X, Building2,
  ClipboardList, Warehouse, RefreshCw, XCircle, Globe, UserCheck, Store, Activity, FileText,
  PanelLeftClose, PanelLeft, Maximize2, Minimize2, Gauge, Trophy, Target,
  Search, ChevronDown, ChevronRight, Briefcase, Truck, CreditCard, ShieldCheck, Zap,
  Clock, Award, FileBarChart, CalendarCheck, Sliders, DollarSign, Factory, Trash2, Wallet, Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { FinancialYearProvider } from '@/contexts/FinancialYearContext';
import FYSelector from '@/components/FYSelector';
import { WarehouseSwitcher } from '@/components/WarehouseSwitcher';
import { NotificationDropdown } from './NotificationDropdown';
import { UserProfileModal } from '@/components/UserProfileModal';
import { userService } from '@/api/services/user.service';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  feature: string;
  domain: 'SALES' | 'FIELD' | 'FINANCE' | 'SUPPLY_CHAIN' | 'HR' | 'ADMIN';
  description?: string;
  subgroup?: string;
}

const navItems: NavItem[] = [
  // 1. Sales & Revenue
  { label: 'Main Overview', path: '/sales', icon: LayoutDashboard, feature: 'view_sales_dashboard', domain: 'SALES', description: 'Executive sales performance dashboard' },
  { label: 'Targets & Incentives', path: '/sales/targets', icon: Target, feature: 'view_sales_dashboard', domain: 'SALES', description: 'Monthly targets & commission progress' },
  { label: 'New Order', path: '/sales/order', icon: ShoppingCart, feature: 'create_order', domain: 'SALES', description: 'Create and book a new sales order' },
  { label: 'Saved Estimates', path: '/sales/estimates', icon: FileText, feature: 'create_order', domain: 'SALES', description: 'View and convert price estimates' },
  { label: 'Order List', path: '/sales/orders', icon: ClipboardList, feature: 'view_own_orders', domain: 'SALES', description: 'Track all submitted orders and dispatches' },
  { label: 'CRM Leads', path: '/sales/crm', icon: Users, feature: 'track_visits', domain: 'SALES', description: 'Lead pipeline and follow-up tracker' },
  { label: 'My Territory', path: '/sales/territory', icon: Store, feature: 'track_visits', domain: 'SALES', description: 'Dealers and distributors in assigned area' },
  { label: 'Party Onboarding', path: '/sales/onboarding', icon: UserCheck, feature: 'view_sales_dashboard', domain: 'SALES', description: 'KYC and onboarding for new parties' },

  // 2. Field & Operations
  { label: 'Customer Visits', path: '/sales/visits', icon: MapPin, feature: 'track_visits', domain: 'FIELD', description: 'Daily field visits with GPS check-in' },
  { label: 'Daily Travel (KM)', path: '/sales/travel', icon: Gauge, feature: 'track_visits', domain: 'FIELD', description: 'Odometer travel logs and route tracking' },
  { label: 'SO Scorecards', path: '/sales/travel?tab=SCORECARD', icon: Trophy, feature: 'track_visits', domain: 'FIELD', description: 'Sales officer performance rankings' },

  // 3. Finance & Billing
  { label: 'Party Ledgers', path: '/finance/ledger', icon: Wallet, feature: 'view_sales_dashboard', domain: 'FINANCE', description: 'Live ERP party statements, running balances & transaction ledger' },
  { label: 'CN & Discounts', path: '/finance/cn-requests', icon: Percent, feature: 'view_sales_dashboard', domain: 'FINANCE', description: 'Credit Notes, special discounts & SuperAdmin approvals queue' },
  { label: 'Spending & Bills', path: '/sales/expenses', icon: Receipt, feature: 'manage_expenses', domain: 'FINANCE', description: 'Submit and review travel & field expenses' },
  { label: 'Payment Receipts', path: '/sales/payments/new', icon: CreditCard, feature: 'view_sales_dashboard', domain: 'FINANCE', description: 'Record party cheque, RTGS or cash payments' },
  { label: 'Payment Approvals', path: '/admin/payments', icon: Receipt, feature: 'view_admin_dashboard', domain: 'FINANCE', description: 'Verify and approve party payment collections' },
  { label: 'My Ledger Requests', path: '/sales/ledger-requests', icon: FileText, feature: 'view_sales_dashboard', domain: 'FINANCE', description: 'Request statement of accounts for dealers' },
  { label: 'Ledger Fulfillment', path: '/admin/ledger-requests', icon: FileText, feature: 'view_admin_dashboard', domain: 'FINANCE', description: 'Process and upload party financial ledgers' },

  // 4. Supply Chain & Inventory
  // Overview
  { label: 'Dashboard', path: '/inventory/manage?tab=dashboard', icon: BarChart3, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Overview', description: 'Overview of stock metrics, valuation & warehouse health' },
  { label: 'Total Stock', path: '/inventory/manage?tab=total_stock', icon: Package, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Overview', description: 'Current on-hand quantities, available stock & batch valuation' },
  { label: 'Stock Ledger', path: '/inventory/manage?tab=stock_ledger', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Overview', description: 'Live stock movement audit & opening/closing balance' },
  { label: 'Order & Dispatch Room', path: '/inventory', icon: Truck, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Overview', description: 'Real-time order fulfillment & dispatch pipeline' },

  // Masters
  { label: 'Products', path: '/inventory/manage?tab=products', icon: Package, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Finished goods, raw materials and packaging catalog' },
  { label: 'BOM (Recipes)', path: '/inventory/manage?tab=bom', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Production recipes, raw material bill of materials & formulas' },
  { label: 'Categories', path: '/inventory/manage?tab=categories', icon: Sliders, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Product category taxonomy and classifications' },
  { label: 'Sub Categories', path: '/inventory/manage?tab=sub_categories', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Secondary item classifications and grouping' },
  { label: 'Brands', path: '/inventory/manage?tab=brands', icon: Package, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Registered product brands and manufacturer names' },
  { label: 'Units', path: '/inventory/manage?tab=units', icon: Sliders, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Units of measurement (UOM) and conversion scales' },
  { label: 'Suppliers', path: '/inventory/manage?tab=suppliers', icon: Truck, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Masters', description: 'Approved vendor & raw material supplier master' },

  // Admin
  { label: 'Settings', path: '/inventory/manage?tab=settings', icon: Sliders, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Admin', description: 'Warehouse threshold configuration & default rules' },

  // Transactions
  { label: 'Purchase Orders', path: '/inventory/manage?tab=purchase_orders', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Vendor PO generation and tracking' },
  { label: 'Purchases', path: '/inventory/manage?tab=purchases', icon: ShoppingCart, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Goods receipt notes (GRN) & inward stock entries' },
  { label: 'Sales', path: '/inventory/manage?tab=sales', icon: DollarSign, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Outward billing and stock deduction logs' },
  { label: 'Production', path: '/inventory/manage?tab=productions', icon: Factory, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Manufacturing work orders & raw material conversions' },
  { label: 'Deleted Production', path: '/inventory/manage?tab=deleted_productions', icon: Trash2, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Audit log of cancelled or removed production batches' },
  { label: 'Production Approvals', path: '/inventory/manage?tab=production_approvals', icon: UserCheck, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Quality check and manager approval for manufactured batches' },
  { label: 'Adjustments', path: '/inventory/manage?tab=adjustments', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Physical count corrections, stock damage and wastage write-offs' },
  { label: 'Approvals', path: '/inventory/manage?tab=approvals', icon: ClipboardList, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Pending transaction approvals and warehouse authorizations' },
  { label: 'Purchase Returns', path: '/inventory/manage?tab=purchase_returns', icon: ShoppingCart, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Goods returned to suppliers & debit note adjustments' },
  { label: 'Sales Returns', path: '/inventory/manage?tab=sales_returns', icon: ShoppingCart, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Customer returns, damaged product receipts & credit notes' },
  { label: 'Returns Room', path: '/inventory/returns', icon: RefreshCw, feature: 'view_inventory_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Transactions', description: 'Customer returns & credit adjustment room' },

  // Facility
  { label: 'Global Stock', path: '/admin/global-inventory', icon: Globe, feature: 'view_admin_dashboard', domain: 'SUPPLY_CHAIN', subgroup: 'Facility', description: 'Consolidated multi-warehouse stock overview' },
  { label: 'Warehouse List', path: '/admin/warehouses', icon: Warehouse, feature: 'access_settings', domain: 'SUPPLY_CHAIN', subgroup: 'Facility', description: 'Facility locations and storage rooms' },

  // 5. HR & Payroll (Dedicated Standalone Suite)
  { label: 'Staff Dashboard', path: '/hr/manage?tab=dashboard', icon: LayoutDashboard, feature: 'view_reports', domain: 'HR', subgroup: 'Staff & Team', description: 'Staff directory & operations overview' },
  { label: 'Employee Master', path: '/hr/manage?tab=employees', icon: Users, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Staff & Team', description: 'Staff directory & profiles' },
  { label: 'Employee Documents', path: '/hr/manage?tab=documents', icon: Award, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Staff & Team', description: 'Employment letters & ID cards' },
  { label: 'Sales Targets & KPIs', path: '/hr/manage?tab=targets', icon: Target, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Staff & Team', description: 'Monthly targets & commission progress' },
  { label: 'Organization Chart', path: '/hr/manage?tab=orgchart', icon: Users, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Staff & Team', description: 'Company reporting hierarchy tree' },
  { label: 'Daily Attendance', path: '/hr/manage?tab=attendance', icon: Clock, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Attendance & Operations', description: 'Biometric punches & shift logs' },
  { label: 'Travel & KM Approvals', path: '/hr/manage?tab=travel', icon: Gauge, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Attendance & Operations', description: 'Field travel & KM allowance reviews' },
  { label: 'SO Field Visits', path: '/hr/manage?tab=visits', icon: MapPin, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Attendance & Operations', description: 'Track where Sales Officers go throughout the day & beat stops' },
  { label: 'Spend & Bill Approvals', path: '/hr/manage?tab=expenses', icon: Receipt, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Attendance & Operations', description: 'Staff reimbursement approvals' },
  { label: 'Leave Management', path: '/hr/manage?tab=leaves', icon: CalendarCheck, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Attendance & Operations', description: 'Leave approvals & holiday tracker' },
  { label: 'Employee Ledger', path: '/hr/manage?tab=ledger', icon: Wallet, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Payroll & Statutory', description: 'Staff advance salary & running balances' },
  { label: 'Payroll & Slips', path: '/hr/manage?tab=payroll', icon: FileBarChart, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Payroll & Statutory', description: 'Salary calculations & payslip generation' },
  { label: 'HR Config', path: '/hr/manage?tab=config', icon: FileText, feature: 'view_inventory_dashboard', domain: 'HR', subgroup: 'Payroll & Statutory', description: 'HR policy settings & compliance parameters' },

  // 6. Administration
  { label: 'Admin Panels', path: '/admin', icon: ShieldCheck, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Master control dashboard' },
  { label: 'Party Ledgers', path: '/finance/ledger', icon: Wallet, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Live statements, sales billing, returns, and transaction ledger' },
  { label: 'CN & Discount Approvals', path: '/finance/cn-requests', icon: Percent, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Examine & approve credit notes, special discounts & ledger write-offs' },
  { label: 'Manage Staff', path: '/admin/users', icon: Users, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Staff logins, roles & warehouse permissions' },
  { label: 'Dealers', path: '/admin/dealers', icon: Store, feature: 'manage_customers', domain: 'ADMIN', description: 'Manage retail shops, dealers and credit limits' },
  { label: 'Distributors', path: '/admin/distributors', icon: Users, feature: 'manage_customers', domain: 'ADMIN', description: 'Manage wholesale distributor networks' },
  { label: 'Product Recipes', path: '/admin/bom', icon: ClipboardList, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Bill of Materials & manufacturing recipes' },
  { label: 'SO Territory', path: '/admin/so-mapping', icon: UserCheck, feature: 'manage_customers', domain: 'ADMIN', description: 'Assign sales officers to pin codes and beats' },
  { label: 'Onboarding Approvals', path: '/admin/onboarding', icon: UserCheck, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Review submitted party KYC documents' },
  { label: 'Activity & Audit Logs', path: '/admin/activity-logs', icon: Activity, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'System security audit trail & change history' },
  { label: 'Cancelled Orders', path: '/admin/rejected', icon: XCircle, feature: 'view_admin_dashboard', domain: 'ADMIN', description: 'Rejected or cancelled order archive' },
  { label: 'Sales Reports', path: '/reports', icon: BarChart3, feature: 'view_reports', domain: 'ADMIN', description: 'Comprehensive business analytics & exports' },
  { label: 'App Settings', path: '/admin/settings', icon: Settings, feature: 'access_settings', domain: 'ADMIN', description: 'System configuration, financial years & master data' },
];

interface DomainSection {
  id: 'SALES' | 'FIELD' | 'FINANCE' | 'SUPPLY_CHAIN' | 'HR' | 'ADMIN';
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeClass?: string;
  iconColor?: string;
  dividerAbove?: boolean;
  dividerLabel?: string;
}

const DOMAIN_SECTIONS: DomainSection[] = [
  { 
    id: 'SALES', 
    label: 'Sales & Revenue', 
    icon: ShoppingCart,
    iconColor: 'text-emerald-500',
  },
  { 
    id: 'FIELD', 
    label: 'Field & Customer Ops', 
    icon: MapPin,
    iconColor: 'text-amber-500',
  },
  { 
    id: 'FINANCE', 
    label: 'Finance & Billing', 
    icon: Receipt,
    iconColor: 'text-blue-500',
  },
  { 
    id: 'SUPPLY_CHAIN', 
    label: 'Supply Chain & Stock', 
    icon: Truck,
    iconColor: 'text-indigo-500',
  },
  { 
    id: 'HR', 
    label: 'HR & Payroll', 
    icon: Briefcase,
    badge: 'HR Suite',
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    iconColor: 'text-teal-500',
    dividerAbove: true,
    dividerLabel: 'HR & Payroll',
  },
  { 
    id: 'ADMIN', 
    label: 'Administration', 
    icon: ShieldCheck,
    badge: 'Admin',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    iconColor: 'text-purple-500',
    dividerAbove: true,
    dividerLabel: 'System Control',
  },
];

export interface SubPageSearchItem {
  id: string;
  label: string;
  group: string;
  path: string;
  icon: React.ElementType;
  keywords: string;
  description: string;
}

export const INVENTORY_SUB_PAGES: SubPageSearchItem[] = [
  // Overview
  {
    id: 'inv_dashboard',
    label: 'Dashboard',
    group: 'Inventory • Overview',
    path: '/inventory/manage?tab=dashboard',
    icon: BarChart3,
    keywords: 'inventory dashboard metrics stock overview live summary kpi analytics',
    description: 'Overview of stock metrics, valuation & warehouse health',
  },
  {
    id: 'inv_total_stock',
    label: 'Total Stock',
    group: 'Inventory • Overview',
    path: '/inventory/manage?tab=total_stock',
    icon: Package,
    keywords: 'total stock current quantity on hand available inventory levels batches valuation warehouse stock',
    description: 'Current on-hand quantities, available stock & batch valuation',
  },
  {
    id: 'inv_stock_ledger',
    label: 'Stock Ledger',
    group: 'Inventory • Overview',
    path: '/inventory/manage?tab=stock_ledger',
    icon: ClipboardList,
    keywords: 'stock ledger live audit movements in out balance sku movements batches bin card report statement',
    description: 'Item-by-item movement ledger, audit trail & opening/closing balance',
  },
  // Masters
  {
    id: 'inv_products',
    label: 'Products',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=products',
    icon: Package,
    keywords: 'products items skus master catalog pricing hsn sac gst rates',
    description: 'Finished goods, raw materials and packaging catalog',
  },
  {
    id: 'inv_bom',
    label: 'BOM (Recipes)',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=bom',
    icon: ClipboardList,
    keywords: 'bom recipes bill of materials formula composition production recipe standard cost manufacturing',
    description: 'Production recipes, raw material bill of materials & formulas',
  },
  {
    id: 'inv_categories',
    label: 'Categories',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=categories',
    icon: Sliders,
    keywords: 'categories item categories product classification grouping taxonomy',
    description: 'Product category taxonomy and classifications',
  },
  {
    id: 'inv_sub_categories',
    label: 'Sub Categories',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=sub_categories',
    icon: ClipboardList,
    keywords: 'sub categories product sub classifications secondary grouping',
    description: 'Secondary item classifications and grouping',
  },
  {
    id: 'inv_brands',
    label: 'Brands',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=brands',
    icon: Package,
    keywords: 'brands brand master manufacturer label names trademarks',
    description: 'Registered product brands and manufacturer names',
  },
  {
    id: 'inv_units',
    label: 'Units',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=units',
    icon: Sliders,
    keywords: 'units uom measurement kg pcs boxes bags litres metrics scale',
    description: 'Units of measurement (UOM) and conversion scales',
  },
  {
    id: 'inv_suppliers',
    label: 'Suppliers',
    group: 'Inventory • Masters',
    path: '/inventory/manage?tab=suppliers',
    icon: Truck,
    keywords: 'suppliers vendors procurement vendor master contacts gst address phone',
    description: 'Approved vendor & raw material supplier master',
  },
  // Admin
  {
    id: 'inv_settings',
    label: 'Settings',
    group: 'Inventory • Admin',
    path: '/inventory/manage?tab=settings',
    icon: Settings,
    keywords: 'inventory settings configuration warehouse rules defaults parameters',
    description: 'Inventory rules, negative stock toggles & defaults',
  },
  // Transactions
  {
    id: 'inv_purchase_orders',
    label: 'Purchase Orders',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=purchase_orders',
    icon: ClipboardList,
    keywords: 'purchase orders po procurement supplier orders pending purchase vendor indent order',
    description: 'Generate and track purchase orders sent to vendors',
  },
  {
    id: 'inv_purchases',
    label: 'Purchases',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=purchases',
    icon: ShoppingCart,
    keywords: 'purchases inward grn goods receipt note vendor bills stock entry purchase invoices',
    description: 'Goods receipt notes (GRN) & inward stock entries',
  },
  {
    id: 'inv_sales',
    label: 'Sales',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=sales',
    icon: DollarSign,
    keywords: 'sales outward billing customer invoices dispatch stock deduction inventory sales',
    description: 'Outward sales billing and stock depletion logs',
  },
  {
    id: 'inv_production',
    label: 'Production',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=productions',
    icon: Factory,
    keywords: 'production manufacturing batch processing conversion work order daily manufacturing factory',
    description: 'Manufacturing work orders & raw material conversions',
  },
  {
    id: 'inv_deleted_production',
    label: 'Deleted Production',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=deleted_productions',
    icon: Trash2,
    keywords: 'deleted production cancelled manufacturing batches discarded log audit trail removed batches',
    description: 'Audit log of cancelled or removed production batches',
  },
  {
    id: 'inv_production_approvals',
    label: 'Production Approvals',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=production_approvals',
    icon: UserCheck,
    keywords: 'production approvals verify batch qc quality check manager signoff manufactured goods approval',
    description: 'Quality check and manager approval for manufactured batches',
  },
  {
    id: 'inv_adjustments',
    label: 'Adjustments',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=adjustments',
    icon: ClipboardList,
    keywords: 'adjustments stock adjustment physical count variance reconciliation write off wastage damage discrepancy',
    description: 'Physical count corrections, stock damage and wastage write-offs',
  },
  {
    id: 'inv_approvals',
    label: 'Approvals',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=approvals',
    icon: ClipboardList,
    keywords: 'inventory approvals pending authorizations purchase approvals manager review transaction signoff',
    description: 'Pending transaction approvals and warehouse authorizations',
  },
  {
    id: 'inv_purchase_returns',
    label: 'Purchase Returns',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=purchase_returns',
    icon: ShoppingCart,
    keywords: 'purchase returns debit note return to vendor rtv rejected goods refund debit note supplier return',
    description: 'Goods returned to suppliers & debit note adjustments',
  },
  {
    id: 'inv_sales_returns',
    label: 'Sales Returns',
    group: 'Inventory • Transactions',
    path: '/inventory/manage?tab=sales_returns',
    icon: ShoppingCart,
    keywords: 'sales returns credit note customer returns damaged stock inward reversal credit note return',
    description: 'Customer returns, damaged product receipts & credit notes',
  },
];

export const HR_SUB_PAGES: SubPageSearchItem[] = [
  {
    id: 'hr_workspace_main',
    label: 'HR Workspace',
    group: 'HR Overview',
    path: '/hr/manage?tab=dashboard',
    icon: LayoutDashboard,
    keywords: 'hr workspace human resources workforce management payroll dashboard overview staff operations team kpis',
    description: 'Comprehensive HR, payroll and staff operations dashboard',
  },
  {
    id: 'hr_dashboard',
    label: 'Staff Dashboard',
    group: 'HR Suite',
    path: '/hr/manage?tab=dashboard',
    icon: LayoutDashboard,
    keywords: 'staff dashboard hr overview workforce team summary stats kpis attendance travel approvals payroll',
    description: 'Workforce KPI overview, pending travel/expense reviews & payroll readiness',
  },
  {
    id: 'hr_employees',
    label: 'Employee Master',
    group: 'HR Suite',
    path: '/hr/manage?tab=employees',
    icon: Users,
    keywords: 'employee master staff list directory employee profiles kyc bank pan aadhaar salary joining personal details',
    description: 'Staff directory, personal profiles, salary details & KYC',
  },
  {
    id: 'hr_documents',
    label: 'Employee Letters',
    group: 'HR Suite',
    path: '/hr/manage?tab=documents',
    icon: Award,
    keywords: 'employee letters offer letter appointment letter relieving experience certificate sales incentive notice letter official letters studio archive',
    description: 'Employment letters, appointment notices, ID badges & issued letters archive',
  },
  {
    id: 'hr_targets',
    label: 'Sales Targets & KPIs',
    group: 'HR Suite',
    path: '/hr/manage?tab=targets',
    icon: Target,
    keywords: 'sales targets kpis quota achievements commissions incentives performance metrics monthly targets score',
    description: 'Sales quotas, field incentives & monthly performance KPIs',
  },
  {
    id: 'hr_orgchart',
    label: 'Organization Chart',
    group: 'HR Suite',
    path: '/hr/manage?tab=orgchart',
    icon: Users,
    keywords: 'organization chart org hierarchy reporting structure manager team tree department breakdown chain',
    description: 'Hierarchical company reporting chain and team structures',
  },
  {
    id: 'hr_attendance',
    label: 'Daily Attendance',
    group: 'HR Suite',
    path: '/hr/manage?tab=attendance',
    icon: Clock,
    keywords: 'daily attendance biometric punch check in out shifts punch logs late coming overtime attendance register',
    description: 'Shift rosters, biometric punches and late arrival tracking',
  },
  {
    id: 'hr_travel',
    label: 'Travel & KM Approvals',
    group: 'HR Suite',
    path: '/hr/manage?tab=travel',
    icon: Gauge,
    keywords: 'travel km approvals odometer readings distance route verified kilometers travel claim field allowance review',
    description: 'Field officer odometer verification & KM allowance approvals',
  },
  {
    id: 'hr_field_visits',
    label: 'SO Field Visits',
    group: 'HR Suite',
    path: '/hr/manage?tab=visits',
    icon: MapPin,
    keywords: 'field visits so visits sales officer dealer visits stops tracker location beat stops route daily timeline',
    description: 'Track where Sales Officers go throughout the day, dealer visits & beat stops',
  },
  {
    id: 'hr_expenses',
    label: 'Spend & Bill Approvals',
    group: 'HR Suite',
    path: '/hr/manage?tab=expenses',
    icon: Receipt,
    keywords: 'spend bill approvals expense claims reimbursements vouchers food hotel travel bills review approve claims',
    description: 'Field bills verification & staff reimbursement authorizations',
  },
  {
    id: 'hr_leaves',
    label: 'Leave Management',
    group: 'HR Suite',
    path: '/hr/manage?tab=leaves',
    icon: CalendarCheck,
    keywords: 'leave management leave application casual leave sick leave paid leave holiday balance approvals vacations',
    description: 'Leave applications, company holiday schedules & balances',
  },
  {
    id: 'hr_ledger',
    label: 'Employee Ledger',
    group: 'HR Suite',
    path: '/hr/manage?tab=ledger',
    icon: Wallet,
    keywords: 'employee ledger staff account advance salary loan deductions repayments ledger statement balance dues',
    description: 'Staff advances, loan balances and running ledger statements',
  },
  {
    id: 'hr_payroll',
    label: 'Payroll & Slips',
    group: 'HR Suite',
    path: '/hr/manage?tab=payroll',
    icon: FileBarChart,
    keywords: 'payroll slips payslip salary generation net pay basic hra pf esic epfo deductions bank transfer payout',
    description: 'Salary slip generation, PF/ESIC deductions & monthly payouts',
  },
  {
    id: 'hr_config',
    label: 'HR Config',
    group: 'HR Suite',
    path: '/hr/manage?tab=config',
    icon: FileText,
    keywords: 'hr config settings attendance rules shifts working days company policies leave quota statutory setup',
    description: 'HR policy settings, shift timings & statutory compliance rules',
  },
];



const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [hideTopBar, setHideTopBar] = useState(false);
  const [subscriptionDismissed, setSubscriptionDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('sub_alert_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const { user, logout, updateCurrentUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && !user.employeePhoto) {
      userService.getProfileDetails()
        .then(res => {
          const photo = res.data?.data?.employee?.employee_photo || res.data?.data?.user?.employeePhoto;
          if (photo) {
            updateCurrentUser({ employeePhoto: photo });
          }
        })
        .catch(() => {});
    }
  }, [user?.id, user?.employeePhoto, updateCurrentUser]);

  const subscriptionAlert = useMemo(() => {
    if (!user?.validUntil) return null;
    try {
      const expDate = new Date(user.validUntil);
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const formattedDate = expDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (diffDays <= 0 || user.isSubscriptionActive === false) {
        return {
          type: 'EXPIRED' as const,
          days: 0,
          formattedDate,
          message: `Your organization's subscription has expired on ${formattedDate}. Backend operations are restricted. Please contact platform administration to renew.`,
          bg: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200',
          badgeBg: 'bg-rose-600 text-white',
        };
      }

      if (diffDays <= 7) {
        return {
          type: 'WARNING' as const,
          days: diffDays,
          formattedDate,
          message: `Subscription Renewal Reminder: Your company's subscription will expire in ${diffDays} day${diffDays === 1 ? '' : 's'} (on ${formattedDate}). Renew promptly to ensure uninterrupted access.`,
          bg: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
          badgeBg: 'bg-amber-600 text-white',
        };
      }

      return null;
    } catch {
      return null;
    }
  }, [user?.validUntil, user?.isSubscriptionActive]);

  // Track collapsed accordions in sidebar (all open by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nav_collapsed_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Track collapsed subgroups within domains (e.g., Masters, Transactions)
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nav_collapsed_subgroups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('nav_collapsed_sections', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const toggleSubgroup = (subgroupId: string) => {
    setCollapsedSubgroups(prev => {
      const next = { ...prev, [subgroupId]: !prev[subgroupId] };
      try {
        localStorage.setItem('nav_collapsed_subgroups', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar, Ctrl+K or Cmd+K for Command Palette, Esc for Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth >= 1024) {
          toggleDesktopSidebar();
        } else {
          setSidebarOpen(prev => !prev);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
      if (e.key === 'Escape' && hideTopBar) {
        setHideTopBar(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideTopBar]);

  // Touch swipe to open/close sidebar on mobile
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (touchStartX < 45 && diffX > 50) {
          setSidebarOpen(true);
        }
        if (sidebarOpen && diffX < -50) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen]);

  if (!user) return null;

  const filteredNav = navItems.filter(item => {
    if (item.path === '/finance/ledger' || item.path === '/finance/cn-requests') {
      return ['SUPERADMIN', 'ADMIN', 'SALES', 'ACCOUNTANT', 'MANAGER'].includes(user.role) || can(item.feature);
    }
    if (item.path === '/admin/global-inventory') return user.role === 'SUPERADMIN';
    if (item.path === '/admin/activity-logs') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/ledger-requests') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/payments') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/onboarding') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/reports') return user.role === 'SUPERADMIN';
    if (item.path === '/hr/manage?tab=dashboard') {
      const roleUpper = (user.role || '').toUpperCase();
      return ['SUPERADMIN', 'ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleUpper);
    }
    if (item.domain === 'HR' || item.path.startsWith('/hr')) return ['SUPERADMIN', 'ADMIN', 'HR'].includes(user.role);
    if (item.domain === 'ADMIN' || item.path.startsWith('/admin')) return ['SUPERADMIN', 'ADMIN'].includes(user.role);
    if (user.role === 'PRODUCTION') {
      const allowedProdTabs = [
        '/inventory/manage?tab=dashboard',
        '/inventory/manage?tab=total_stock',
        '/inventory/manage?tab=stock_ledger',
        '/inventory/manage?tab=products',
        '/inventory/manage?tab=bom',
        '/inventory/manage?tab=productions',
        '/inventory/manage?tab=deleted_productions'
      ];
      if (item.path.startsWith('/inventory/manage')) return allowedProdTabs.includes(item.path);
    }
    if (item.path === '/inventory/manage?tab=bom') {
      return ['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user.role);
    }
    if (item.path === '/inventory/manage?tab=production_approvals') {
      return ['SUPERADMIN', 'ADMIN', 'INVENTORY'].includes(user.role);
    }
    return can(item.feature);
  });

  // Group nav items into enterprise domains prioritized by user domain
  const domainGroups = useMemo(() => {
    const rawGroups = DOMAIN_SECTIONS.map(section => {
      return {
        ...section,
        items: filteredNav.filter(item => item.domain === section.id)
      };
    }).filter(group => group.items.length > 0);

    const roleUpper = (user?.role || '').toUpperCase();
    if (roleUpper.startsWith('INVENTORY') || roleUpper === 'PRODUCTION') {
      return [...rawGroups].sort((a, b) => {
        const order = ['SUPPLY_CHAIN', 'FINANCE', 'SALES', 'FIELD', 'HR', 'ADMIN'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
    } else if (roleUpper.startsWith('HR')) {
      return [...rawGroups].sort((a, b) => {
        const order = ['HR', 'FINANCE', 'SALES', 'FIELD', 'SUPPLY_CHAIN', 'ADMIN'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
    }
    return rawGroups;
  }, [filteredNav, user?.role]);

  const areAllCollapsed = useMemo(() => {
    return domainGroups.length > 0 && domainGroups.every(g => Boolean(collapsedSections[g.id]));
  }, [domainGroups, collapsedSections]);

  const toggleAllSections = () => {
    if (areAllCollapsed) {
      setCollapsedSections({});
      setCollapsedSubgroups({});
      try {
        localStorage.removeItem('nav_collapsed_sections');
        localStorage.removeItem('nav_collapsed_subgroups');
      } catch {
        // ignore
      }
    } else {
      const all: Record<string, boolean> = {};
      domainGroups.forEach(g => {
        all[g.id] = true;
      });
      setCollapsedSections(all);
      try {
        localStorage.setItem('nav_collapsed_sections', JSON.stringify(all));
      } catch {
        // ignore
      }
    }
  };

  // Auto-expand section and subgroup on navigation when active route changes
  const lastLocationRef = useRef(location.pathname + location.search);
  useEffect(() => {
    const currentLoc = location.pathname + location.search;
    if (lastLocationRef.current !== currentLoc) {
      lastLocationRef.current = currentLoc;

      // Find active group
      const activeGroup = domainGroups.find(g => g.items.some(i => isItemActive(i.path)));
      if (activeGroup && collapsedSections[activeGroup.id]) {
        setCollapsedSections(prev => {
          const next = { ...prev, [activeGroup.id]: false };
          try {
            localStorage.setItem('nav_collapsed_sections', JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      // Also ensure active item's subgroup is expanded if it has one
      if (activeGroup) {
        const activeItem = activeGroup.items.find(i => isItemActive(i.path));
        if (activeItem?.subgroup) {
          const subgroupId = `${activeGroup.id}_${activeItem.subgroup}`;
          if (collapsedSubgroups[subgroupId]) {
            setCollapsedSubgroups(prev => {
              const next = { ...prev, [subgroupId]: false };
              try {
                localStorage.setItem('nav_collapsed_subgroups', JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        }
      }
    }
  }, [location.pathname, location.search, domainGroups, collapsedSections, collapsedSubgroups]);

  const isItemActive = (itemPath: string) => {
    const [itemBase, itemQuery] = itemPath.split('?');
    const exactRoots = ['/sales', '/admin', '/hr', '/inventory'];
    const isBaseMatch = exactRoots.includes(itemBase)
      ? location.pathname === itemBase
      : location.pathname === itemBase || location.pathname.startsWith(itemBase + '/');

    if (!isBaseMatch) return false;

    if (itemQuery) {
      const itemParams = new URLSearchParams(itemQuery);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, value] of itemParams.entries()) {
        const currentVal = currentParams.get(key);
        const defaultHrTab = user?.role === 'SUPERADMIN' ? 'dashboard' : 'employees';
        if (!currentVal && itemBase === '/hr/manage' && key === 'tab' && value === defaultHrTab) {
          continue;
        }
        // Default tab on /inventory/manage is dashboard
        if (!currentVal && itemBase === '/inventory/manage' && key === 'tab' && value === 'dashboard') {
          continue;
        }
        if (currentVal !== value) return false;
      }
      return true;
    }

    const currentParams = new URLSearchParams(location.search);
    const hasMoreSpecificMatch = navItems.some(other => {
      if (other.path === itemPath || !other.path.startsWith(itemBase + '?')) return false;
      const otherQuery = other.path.split('?')[1];
      if (!otherQuery) return false;
      const otherParams = new URLSearchParams(otherQuery);
      for (const [k, v] of otherParams.entries()) {
        if (currentParams.get(k) !== v) return false;
      }
      return true;
    });

    return !hasMoreSpecificMatch;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <FinancialYearProvider>
      <div className="h-screen print:h-auto w-full flex bg-background overflow-hidden print:overflow-visible">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Global Command Palette Dialog */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Search actions, pages, and modules (Ctrl+K)..." />
          <CommandList className="max-h-[70vh]">
            <CommandEmpty>No matching actions or pages found.</CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="⚡ Quick Actions">
              {can('create_order') && (
                <CommandItem
                  value="quick action create new sales order book order"
                  onSelect={() => {
                    navigate('/sales/order');
                    setCommandOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 mr-2 text-primary" />
                  <span>Create New Sales Order</span>
                </CommandItem>
              )}
              {can('track_visits') && (
                <CommandItem
                  value="quick action log customer visit gps checkin"
                  onSelect={() => {
                    navigate('/sales/visits');
                    setCommandOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  <span>Log Customer Visit</span>
                </CommandItem>
              )}
              {can('manage_expenses') && (
                <CommandItem
                  value="quick action submit expense claim travel bill reimbursement"
                  onSelect={() => {
                    navigate('/sales/expenses');
                    setCommandOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Receipt className="w-4 h-4 mr-2 text-primary" />
                  <span>Submit Expense Claim</span>
                </CommandItem>
              )}
              {can('view_inventory_dashboard') && (
                <CommandItem
                  value="quick action check inventory stock ledger live"
                  onSelect={() => {
                    navigate('/inventory/manage');
                    setCommandOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Package className="w-4 h-4 mr-2 text-primary" />
                  <span>Check Inventory & Stock Ledger</span>
                </CommandItem>
              )}
              <CommandItem
                value="quick action view company website public landing page kamla conchem"
                onSelect={() => {
                  window.open('/', '_blank');
                  setCommandOpen(false);
                }}
                className="cursor-pointer"
              >
                <Globe className="w-4 h-4 mr-2 text-primary" />
                <span>Open Public Website (New Tab)</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />

            {/* Inventory Management Modules & Sub-Tabs */}
            {can('view_inventory_dashboard') && (
              <CommandGroup heading="📦 Inventory Management (Modules & Sub-Tabs)">
                {INVENTORY_SUB_PAGES.map(item => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.group} ${item.keywords} ${item.path}`}
                    onSelect={() => {
                      navigate(item.path);
                      setCommandOpen(false);
                    }}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <item.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-foreground shrink-0">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-muted-foreground/70 truncate hidden md:inline">
                          — {item.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {item.group.replace('Inventory • ', '')}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* HR & Workforce Suite Modules & Sub-Tabs */}
            {(can('view_inventory_dashboard') || can('view_hr_dashboard') || ['SUPERADMIN', 'ADMIN', 'HR'].includes(user?.role || '')) && (
              <CommandGroup heading="👥 HR & Workforce Suite (Modules & Sub-Tabs)">
                {HR_SUB_PAGES.filter(item => {
                  if (item.path === '/hr/manage?tab=dashboard') {
                    const roleUpper = (user?.role || '').toUpperCase();
                    return ['SUPERADMIN', 'ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleUpper);
                  }
                  return true;
                }).map(item => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.group} ${item.keywords} ${item.path}`}
                    onSelect={() => {
                      navigate(item.path);
                      setCommandOpen(false);
                    }}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <item.icon className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="font-medium text-foreground shrink-0">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-muted-foreground/70 truncate hidden md:inline">
                          — {item.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        {item.group}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Navigation Items grouped by section */}
            {domainGroups.map(group => (
              <CommandGroup key={group.id} heading={group.label}>
                {group.items.map(item => (
                  <CommandItem
                    key={item.path}
                    value={`${group.label} ${item.label} ${item.description || ''}`}
                    onSelect={() => {
                      navigate(item.path);
                      setCommandOpen(false);
                    }}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground shrink-0">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-muted-foreground/70 truncate hidden sm:inline">
                          — {item.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground">
                        {group.label.split(' ')[0]}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static top-0 left-0 z-50 h-full bg-sidebar flex flex-col transition-all duration-300 shrink-0 print:hidden border-r border-sidebar-border",
            sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:border-r-0" : "w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center font-bold text-primary-foreground text-xs shadow-xs shrink-0">
              <span>
                {(user.companyName || 'SU')
                  .split(' ')
                  .filter(Boolean)
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'SU'}
              </span>
              <span 
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar ring-1 ring-emerald-500/20" 
                title={user.schemaName ? `Connected to isolated schema: ${user.schemaName}` : "Connected to database"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate" title={user.companyName || 'Simply Useful ERP'}>
                {user.companyName || 'Simply Useful ERP'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide uppercase",
                  user.role === 'SUPERADMIN' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                  user.role === 'ADMIN' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                  user.role === 'SALES' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                  user.role === 'INVENTORY' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                  user.role === 'HR' && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
                  !['SUPERADMIN', 'ADMIN', 'SALES', 'INVENTORY', 'HR'].includes(user.role) && "bg-sidebar-accent text-sidebar-foreground"
                )}>
                  {user.role}
                </span>
                {user.skuPrefix && (
                  <span className="text-[10px] text-sidebar-muted font-mono" title="Default SKU Prefix">
                    [{user.skuPrefix}]
                  </span>
                )}
              </div>
            </div>
            {/* Mobile close button */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground p-1 hover:bg-sidebar-accent rounded cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            {/* Desktop collapse button */}
            <button
              onClick={toggleDesktopSidebar}
              title="Collapse sidebar (Ctrl+B)"
              className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground p-1 hover:bg-sidebar-accent rounded transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items grouped into collapsible enterprise domains */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-sidebar-muted/70">
                Menu
              </span>
              <button
                type="button"
                onClick={toggleAllSections}
                className="text-[10px] font-semibold text-sidebar-muted hover:text-sidebar-foreground transition-colors cursor-pointer hover:underline"
                title={areAllCollapsed ? "Expand all sections" : "Collapse all sections"}
              >
                {areAllCollapsed ? "Expand All" : "Collapse All"}
              </button>
            </div>

            {domainGroups.map(group => {
              const hasActiveChild = group.items.some(i => isItemActive(i.path));
              const isCollapsed = Boolean(collapsedSections[group.id]);
              const isHR = group.id === 'HR';
              const isAdmin = group.id === 'ADMIN';

              // Group items by subgroup if any items have a subgroup defined
              const subgroups: { name: string; items: typeof group.items }[] = [];
              const subgroupMap = new Map<string, typeof group.items>();
              group.items.forEach(item => {
                const sg = item.subgroup || '';
                if (!subgroupMap.has(sg)) {
                  const arr: typeof group.items = [];
                  subgroupMap.set(sg, arr);
                  subgroups.push({ name: sg, items: arr });
                }
                subgroupMap.get(sg)!.push(item);
              });

              return (
                <div key={group.id} className="space-y-1">
                  {/* Distinct Section Divider Above Dedicated Suites */}
                  {group.dividerAbove && (
                    <div className="pt-2 pb-1">
                      <div className="flex items-center gap-2 px-2.5">
                        <span className="text-[9px] font-extrabold tracking-wider uppercase text-sidebar-muted/70">
                          {group.dividerLabel}
                        </span>
                        <div className="flex-1 h-px bg-sidebar-border/60" />
                      </div>
                    </div>
                  )}

                  {/* Domain Header Accordion Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer",
                      isHR
                        ? "text-teal-600 dark:text-teal-400 bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 shadow-2xs"
                        : isAdmin
                        ? "text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 shadow-2xs"
                        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <group.icon className={cn("w-3.5 h-3.5 shrink-0", group.iconColor || "text-primary/70")} />
                      <span className="truncate">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {group.badge && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-normal uppercase",
                          group.badgeClass
                        )}>
                          {group.badge}
                        </span>
                      )}
                      {hasActiveChild && isCollapsed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Active page inside" />
                      )}
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                      )}
                    </div>
                  </button>

                  {/* Domain Children Links */}
                  {!isCollapsed && (
                    <div className={cn(
                      "space-y-1 pl-1.5 pt-0.5",
                      isHR && "border-l-2 border-teal-500/30 ml-2 pl-2"
                    )}>
                      {subgroups.map(sg => {
                        // Direct items without subgroup
                        if (!sg.name) {
                          return (
                            <div key="direct_items" className="space-y-0.5">
                              {sg.items.map(item => {
                                const active = isItemActive(item.path);
                                return (
                                  <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                      'sidebar-link text-xs py-1.5',
                                      active && 'sidebar-link-active font-semibold',
                                      isHR && active && 'text-teal-600 dark:text-teal-400 font-semibold'
                                    )}
                                  >
                                    <item.icon className={cn(
                                      "w-3.5 h-3.5 shrink-0",
                                      isHR && active ? "text-teal-500" : ""
                                    )} />
                                    <span className="truncate">{item.label}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          );
                        }

                        // Subgroup with header and collapsible items
                        const subgroupId = `${group.id}_${sg.name}`;
                        const isSubCollapsed = Boolean(collapsedSubgroups[subgroupId]);
                        const hasActiveInSub = sg.items.some(i => isItemActive(i.path));

                        return (
                          <div key={subgroupId} className="space-y-0.5 pt-1">
                            <button
                              type="button"
                              onClick={() => toggleSubgroup(subgroupId)}
                              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded transition-colors cursor-pointer group/sg"
                              title={isSubCollapsed ? `Expand ${sg.name}` : `Collapse ${sg.name}`}
                            >
                              <span className="truncate group-hover/sg:text-sidebar-foreground">
                                {sg.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasActiveInSub && isSubCollapsed && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Active page inside" />
                                )}
                                <span className="text-[9px] text-sidebar-muted/60 font-semibold px-1 py-0.2 bg-sidebar-accent/50 rounded">
                                  {sg.items.length}
                                </span>
                                {isSubCollapsed ? (
                                  <ChevronRight className="w-3 h-3 text-sidebar-muted/70 group-hover/sg:text-sidebar-foreground transition-transform" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-sidebar-muted/70 group-hover/sg:text-sidebar-foreground transition-transform" />
                                )}
                              </div>
                            </button>

                            {!isSubCollapsed && (
                              <div className="space-y-0.5 pl-1.5">
                                {sg.items.map(item => {
                                  const active = isItemActive(item.path);
                                  return (
                                    <NavLink
                                      key={item.path}
                                      to={item.path}
                                      onClick={() => setSidebarOpen(false)}
                                      className={cn(
                                        'sidebar-link text-xs py-1.5',
                                        active && 'sidebar-link-active font-semibold',
                                        isHR && active && 'text-teal-600 dark:text-teal-400 font-semibold'
                                      )}
                                    >
                                      <item.icon className={cn(
                                        "w-3.5 h-3.5 shrink-0",
                                        isHR && active ? "text-teal-500" : ""
                                      )} />
                                      <span className="truncate">{item.label}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-sidebar-border p-3 shrink-0">
            {/* User Profile Pill button */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              title="Click to view & edit your profile, employee master details, or change password"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 mb-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border/40 hover:border-sidebar-border transition-all cursor-pointer text-left group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                {user.employeePhoto || user.photo ? (
                  <img
                    src={user.employeePhoto || user.photo}
                    alt={user.name || user.email}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                  {user.name || user.email}
                </p>
                <p className="text-[10px] text-sidebar-muted truncate">{user.email}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-sidebar-muted group-hover:text-sidebar-foreground transition-colors shrink-0 opacity-70" />
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden print:block print:h-auto">
          {/* Top bar */}
          {!hideTopBar ? (
            <header className="flex-none h-14 bg-card border-b border-border flex items-center justify-between px-2 sm:px-4 lg:px-6 w-full z-30 print:hidden transition-all duration-300 gap-1.5 sm:gap-2">
              {/* Left side: Hamburger Toggle Button + Mobile Brand */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      toggleDesktopSidebar();
                    } else {
                      setSidebarOpen(true);
                    }
                  }}
                  title="Toggle navigation sidebar (Ctrl+B)"
                  aria-label="Toggle navigation sidebar"
                  className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-muted/40 sm:bg-transparent hover:bg-muted text-foreground transition-colors flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 border border-border/40 sm:border-transparent shadow-xs sm:shadow-none"
                >
                  {sidebarCollapsed ? (
                    <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  ) : (
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
                <div className="hidden xs:flex items-center gap-1">
                  <span className="font-black text-xs sm:text-sm tracking-tight text-foreground">Kamla</span>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-md">OTS</span>
                </div>
              </div>

              {/* Center: Global Command Palette Quick Launcher (Desktop lg+ only) */}
              <div className="hidden lg:flex flex-1 max-w-xs xl:max-w-sm mx-2 xl:mx-4 items-center">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 hover:bg-muted border border-border/60 rounded-lg transition-colors cursor-pointer w-full group shadow-2xs"
                  title="Search pages and actions (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  <span className="flex-1 text-left truncate">Search & actions...</span>
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground font-semibold shrink-0">
                    <span>Ctrl</span>K
                  </kbd>
                </button>
              </div>

              {/* Right side controls */}
              <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 min-w-0">
                {/* Search Icon button on mobile/tablet */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors h-8 w-8 flex items-center justify-center shrink-0 border border-border/40"
                  title="Quick search (Ctrl+K)"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                <WarehouseSwitcher />
                <FYSelector />
                <NotificationDropdown />

                {/* Hide top bar button (Focus mode on desktop/tablet) */}
                <button
                  onClick={() => setHideTopBar(true)}
                  title="Hide top bar (Focus mode)"
                  className="hidden md:flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </header>
          ) : (
            /* Floating restore pill when top bar is hidden */
            <div className="fixed top-3 right-4 z-50 print:hidden flex items-center gap-2 animate-in fade-in duration-200">
              {sidebarCollapsed && (
                <button
                  onClick={toggleDesktopSidebar}
                  className="p-1.5 text-xs font-medium bg-card/90 hover:bg-card border border-border shadow-md rounded-full text-foreground backdrop-blur transition-all hover:scale-105"
                  title="Toggle Sidebar (Ctrl+B)"
                >
                  <PanelLeft className="w-4 h-4 text-primary" />
                </button>
              )}
              <button
                onClick={() => setHideTopBar(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card/90 hover:bg-card border border-border shadow-md rounded-full text-foreground backdrop-blur transition-all hover:scale-105"
                title="Restore navigation bar (or press Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5 text-primary" />
                <span>Show Nav</span>
              </button>
            </div>
          )}

          {/* Subscription Expiry Alert Banner */}
          {subscriptionAlert && !subscriptionDismissed && (
            <div className={cn(
              "px-4 py-2.5 border-b flex items-center justify-between text-xs sm:text-sm font-medium z-20 transition-all duration-300 print:hidden",
              subscriptionAlert.bg
            )}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0", subscriptionAlert.badgeBg)}>
                  {subscriptionAlert.type === 'EXPIRED' ? 'Subscription Expired' : `${subscriptionAlert.days} Days Left`}
                </span>
                <span className="truncate">
                  {subscriptionAlert.message}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => {
                    setSubscriptionDismissed(true);
                    try { sessionStorage.setItem('sub_alert_dismissed', 'true'); } catch {}
                  }}
                  className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss alert for this session"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 min-h-0 h-full p-3 sm:p-4 lg:p-6 overflow-x-hidden overflow-y-auto min-w-0 print:p-0 print:overflow-visible">
            {children}
          </main>
        </div>
        {/* User Profile, Employee Master Details, and Password Modal */}
        <UserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      </div>
    </FinancialYearProvider>
  );
};

export default AppLayout;
