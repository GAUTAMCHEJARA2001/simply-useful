import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Users, MapPin, Receipt,
  Package, BarChart3, Settings, LogOut, Menu, X, Building2,
  UserCheck, ClipboardList, Warehouse, ChevronDown, RefreshCw, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  feature: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/sales', icon: LayoutDashboard, feature: 'view_sales_dashboard' },
  { label: 'New Order', path: '/sales/order', icon: ShoppingCart, feature: 'create_order' },
  { label: 'My Orders', path: '/sales/orders', icon: ClipboardList, feature: 'view_own_orders' },
  { label: 'Visit Tracking', path: '/sales/visits', icon: MapPin, feature: 'track_visits' },
  { label: 'Expenses', path: '/sales/expenses', icon: Receipt, feature: 'manage_expenses' },
  { label: 'Admin Dashboard', path: '/admin', icon: Settings, feature: 'view_admin_dashboard' },
  { label: 'Rejected Orders', path: '/admin/rejected', icon: XCircle, feature: 'view_admin_dashboard' },
  { label: 'Dealers', path: '/admin/dealers', icon: Users, feature: 'manage_customers' },
  { label: 'Distributors', path: '/admin/distributors', icon: Users, feature: 'manage_customers' },
  { label: 'HR Dashboard', path: '/hr', icon: Users, feature: 'view_reports' },
  { label: 'Inventory', path: '/inventory', icon: Package, feature: 'view_inventory_dashboard' },
  { label: 'Inv. Management', path: '/inventory/manage', icon: Package, feature: 'view_inventory_dashboard' },
  { label: 'Returned Orders', path: '/inventory/returns', icon: RefreshCw, feature: 'view_inventory_dashboard' },
  { label: 'Warehouse Master', path: '/admin/warehouses', icon: Warehouse, feature: 'access_settings' },
  { label: 'Reports', path: '/reports', icon: BarChart3, feature: 'view_reports' },
  { label: 'Settings', path: '/admin/settings', icon: Settings, feature: 'access_settings' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

  if (!user) return null;

  const filteredNav = navItems.filter(item => can(item.feature));

  // Group nav items
  const groups: { label: string; items: NavItem[] }[] = [];
  const salesItems = filteredNav.filter(i => i.path.startsWith('/sales'));
  const adminItems = filteredNav.filter(i => i.path.startsWith('/admin'));
  const otherItems = filteredNav.filter(i => !i.path.startsWith('/sales') && !i.path.startsWith('/admin'));

  if (salesItems.length > 0) groups.push({ label: 'Sales', items: salesItems });
  if (adminItems.length > 0) groups.push({ label: 'Administration', items: adminItems });
  if (otherItems.length > 0) groups.push({ label: 'Other', items: otherItems });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
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
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-sidebar-foreground truncate">TileAdhesive ERP</h2>
            <p className="text-[10px] text-sidebar-muted truncate">{user.role}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
            <X className="w-5 h-5" />
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
            className="sidebar-link w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center px-4 lg:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">
            {user.name} &middot; {user.role}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
