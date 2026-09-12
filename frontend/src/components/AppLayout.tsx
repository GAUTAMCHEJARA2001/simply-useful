import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Users, MapPin, Receipt,
  Package, BarChart3, Settings, LogOut, Menu, X, Building2,
  ClipboardList, Warehouse, RefreshCw, XCircle, Globe, UserCheck, Store, BookOpen, Activity, FileText,
  PanelLeftClose, PanelLeft, Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { FinancialYearProvider } from '@/contexts/FinancialYearContext';
import FYSelector from '@/components/FYSelector';
import { WarehouseSwitcher } from '@/components/WarehouseSwitcher';
import { NotificationDropdown } from './NotificationDropdown';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  feature: string;
}

const navItems: NavItem[] = [
  { label: 'Main Overview', path: '/sales', icon: LayoutDashboard, feature: 'view_sales_dashboard' },
  { label: 'New Order', path: '/sales/order', icon: ShoppingCart, feature: 'create_order' },
  { label: 'Saved Estimates', path: '/sales/estimates', icon: FileText, feature: 'create_order' },
  { label: 'Order List', path: '/sales/orders', icon: ClipboardList, feature: 'view_own_orders' },
  { label: 'My Ledger Requests', path: '/sales/ledger-requests', icon: FileText, feature: 'view_sales_dashboard' },
  { label: 'Customer Visits', path: '/sales/visits', icon: MapPin, feature: 'track_visits' },
  { label: 'Spending & Bills', path: '/sales/expenses', icon: Receipt, feature: 'manage_expenses' },
  { label: 'Submit Payment', path: '/sales/payments/new', icon: Receipt, feature: 'view_sales_dashboard' },
  { label: 'CRM Leads', path: '/sales/crm', icon: Users, feature: 'track_visits' },
  { label: 'My Territory', path: '/sales/territory', icon: Store, feature: 'track_visits' },
  { label: 'Party Onboarding', path: '/sales/onboarding', icon: UserCheck, feature: 'view_sales_dashboard' },
  { label: 'Admin Panels', path: '/admin', icon: Settings, feature: 'view_admin_dashboard' },
  { label: 'Global Stock', path: '/admin/global-inventory', icon: Globe, feature: 'view_admin_dashboard' },
  { label: 'Cancelled Orders', path: '/admin/rejected', icon: XCircle, feature: 'view_admin_dashboard' },
  { label: 'Dealers', path: '/admin/dealers', icon: Users, feature: 'manage_customers' },
  { label: 'Distributors', path: '/admin/distributors', icon: Users, feature: 'manage_customers' },
  { label: 'SO Territory', path: '/admin/so-mapping', icon: UserCheck, feature: 'manage_customers' },
  { label: 'Activity & Audit Logs', path: '/admin/activity-logs', icon: Activity, feature: 'view_admin_dashboard' },
  { label: 'Ledger Fulfillment', path: '/admin/ledger-requests', icon: FileText, feature: 'view_admin_dashboard' },
  { label: 'Payment Approvals', path: '/admin/payments', icon: Receipt, feature: 'view_admin_dashboard' },
  { label: 'Onboarding Approvals', path: '/admin/onboarding', icon: UserCheck, feature: 'view_admin_dashboard' },
  { label: 'Staff Dashboard', path: '/hr', icon: Users, feature: 'view_reports' },
  { label: 'Order and Dispatch Room', path: '/inventory', icon: Package, feature: 'view_inventory_dashboard' },
  { label: 'Manage Stock', path: '/inventory/manage', icon: Package, feature: 'view_inventory_dashboard' },
  { label: 'HR Module', path: '/hr/manage', icon: Users, feature: 'view_inventory_dashboard' },
  { label: 'Returns', path: '/inventory/returns', icon: RefreshCw, feature: 'view_inventory_dashboard' },
  { label: 'Warehouse List', path: '/admin/warehouses', icon: Warehouse, feature: 'access_settings' },
  { label: 'Sales Reports', path: '/reports', icon: BarChart3, feature: 'view_reports' },
  { label: 'App Settings', path: '/admin/settings', icon: Settings, feature: 'access_settings' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [hideTopBar, setHideTopBar] = useState(false);
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

  // Persist sidebar collapsed state
  const toggleDesktopSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar, Esc to exit Zen Mode
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
      if (e.key === 'Escape' && hideTopBar) {
        setHideTopBar(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideTopBar]);

  // Touch swipe to open sidebar from left edge or swipe to close on mobile
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

      // Only horizontal gestures (not vertical scrolling)
      if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        // Swipe right from left edge (first 45px) opens sidebar
        if (touchStartX < 45 && diffX > 50) {
          setSidebarOpen(true);
        }
        // Swipe left when open closes sidebar
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
    if (item.path === '/admin/global-inventory') return user.role === 'SUPERADMIN';
    if (item.path === '/admin/activity-logs') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/ledger-requests') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/payments') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/admin/onboarding') return user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (item.path === '/reports') return user.role === 'SUPERADMIN';
    if (item.path === '/hr' || item.path === '/hr/manage') return ['SUPERADMIN', 'ADMIN', 'HR'].includes(user.role);
    return can(item.feature);
  });

  // Group nav items
  const groups: { label: string; items: NavItem[] }[] = [];
  const salesItems = filteredNav.filter(i => i.path.startsWith('/sales'));
  const adminItems = filteredNav.filter(i => i.path.startsWith('/admin'));
  const otherItems = filteredNav.filter(i => !i.path.startsWith('/sales') && !i.path.startsWith('/admin'));

  if (salesItems.length > 0) groups.push({ label: 'Sales & Orders', items: salesItems });
  if (adminItems.length > 0) groups.push({ label: 'Admin Tools', items: adminItems });
  if (otherItems.length > 0) groups.push({ label: 'More Options', items: otherItems });

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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static top-0 left-0 z-50 h-full bg-sidebar flex flex-col transition-all duration-300 shrink-0 print:hidden border-r border-sidebar-border",
          sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:border-r-0" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-sidebar-foreground truncate">Kamla OTS</h2>
            <p className="text-[10px] text-sidebar-muted truncate">{user.role}</p>
          </div>
          {/* Mobile close button */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground p-1 hover:bg-sidebar-accent rounded">
            <X className="w-5 h-5" />
          </button>
          {/* Desktop collapse button */}
          <button
            onClick={toggleDesktopSidebar}
            title="Collapse sidebar (Ctrl+B)"
            className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground p-1 hover:bg-sidebar-accent rounded transition-colors"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/sales' || item.path === '/admin' || item.path === '/hr' || item.path === '/inventory'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn('sidebar-link', isActive && 'sidebar-link-active')
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground text-sm font-semibold">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-sidebar-muted truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 print:block">
        {/* Top bar */}
        {!hideTopBar ? (
          <header className="flex-none h-14 bg-card border-b border-border flex items-center justify-between px-2.5 sm:px-4 lg:px-6 w-full z-30 print:hidden transition-all duration-300">
            {/* Left side: Hamburger Toggle Button (ALWAYS visible & accessible, never shrunk) */}
            <div className="flex items-center shrink-0">
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
                className="shrink-0 p-2 rounded-lg bg-muted/50 sm:bg-transparent hover:bg-muted text-foreground transition-colors flex items-center justify-center h-9 w-9 border border-border/40 sm:border-transparent mr-2 shadow-xs sm:shadow-none"
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5 text-primary" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Right side controls (compact & responsive on mobile) */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-3 shrink-0 overflow-x-auto no-scrollbar min-w-0">
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
              <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[150px]">
                {user.name} &middot; {user.role}
              </span>
            </div>
          </header>
        ) : (
          /* Floating restore pill when top bar is hidden */
          <div className="fixed top-3 right-4 z-50 print:hidden flex items-center gap-2 animate-in fade-in duration-200">
            {/* If sidebar is also collapsed, provide quick sidebar toggle too */}
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

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden overflow-y-auto min-w-0 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
    </FinancialYearProvider>
  );
};

export default AppLayout;
