import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { 
  Bell, BellRing, CheckCircle2, Volume2, AlertTriangle, 
  ShoppingCart, Package, Clock, ClipboardList, MapPin, Receipt, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface Broadcast {
  id: string;
  message: string;
  date: string;
  targetRole: string;
  author: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  icon: React.ElementType;
  color: string;
}

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const { orders, products, visits, expenses } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  // Load broadcasts from backend API and dismissed list from localStorage
  const loadNotifications = async () => {
    try {
      const { crudApi } = await import('@/api/crud');
      const { API_ENDPOINTS } = await import('@/api/endpoints');
      const role = user?.role?.toUpperCase() || '';
      const data = await crudApi.list(API_ENDPOINTS.BROADCASTS + `?role=${role}`);
      setBroadcasts(Array.isArray(data) ? data.map((b: any) => ({
        id: b.id,
        message: b.message,
        date: b.createdAt || b.created_at || new Date().toISOString(),
        targetRole: b.targetRole || b.target_role || 'ALL',
        author: b.author || 'Admin',
      })) : []);
    } catch (e) {
      // Fallback: keep existing broadcasts if API fails
      console.error('Failed to load broadcasts:', e);
    }

    try {
      const rawDismissed = localStorage.getItem('kamla_dismissed_notifications');
      const loadedDismissed = rawDismissed ? JSON.parse(rawDismissed) : [];
      setDismissedIds(loadedDismissed);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll API for broadcast changes every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const role = user.role.toUpperCase();

  // Generate dynamic, discrete notification list based on active user role
  const rawNotifications: NotificationItem[] = [];

  // 1. SALES OFFICER / SALES: Order status updates & Scheduled visits today
  if (role === 'SALES' || role === 'SALES_OFFICER') {
    // Dynamic status update notifications for their own orders
    orders.forEach(o => {
      const email = o.soEmail || o.so_email || '';
      if (email.toLowerCase() === user.email.toLowerCase()) {
        if (o.status !== 'Pending') {
          const statusText = o.status === 'Cancelled' ? 'Rejected' : o.status;
          let icon = Clock;
          let color = 'text-amber-500 bg-amber-500/10';

          if (o.status === 'Approved') {
            icon = CheckCircle2;
            color = 'text-emerald-500 bg-emerald-500/10';
          } else if (o.status === 'Dispatched') {
            icon = Package;
            color = 'text-blue-500 bg-blue-500/10';
          } else if (o.status === 'Completed') {
            icon = CheckCircle2;
            color = 'text-teal-500 bg-teal-500/10';
          } else if (o.status === 'Cancelled' || o.status === 'Returned') {
            icon = AlertTriangle;
            color = 'text-rose-500 bg-rose-500/10';
          }

          rawNotifications.push({
            id: `sales-order-status-${o.id}-${o.status}`,
            title: `Order Status Updated`,
            message: `Your order #${o.id.slice(-6).toUpperCase()} status was changed to ${statusText}.`,
            date: o.date || new Date().toISOString(),
            icon,
            color
          });
        }
      }
    });

    // Scheduled visits for today
    const todayStr = new Date().toISOString().split('T')[0];
    visits.forEach(v => {
      const email = v.soEmail || v.so_email || '';
      if (email.toLowerCase() === user.email.toLowerCase()) {
        const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || v.visit_status?.toUpperCase() === 'PENDING';
        if (isPending && v.date?.startsWith(todayStr)) {
          rawNotifications.push({
            id: `sales-visit-today-${v.id}`,
            title: `Visit Scheduled Today`,
            message: `You have a visit scheduled today at ${v.partyName || 'Dealer'}.`,
            date: v.date || new Date().toISOString(),
            icon: MapPin,
            color: 'text-sky-500 bg-sky-500/10'
          });
        }
      }
    });
  }

  // 2. INVENTORY OFFICER: Approved orders ready for dispatch & Low stock alerts
  if (role === 'INVENTORY') {
    // New Order ready for dispatch
    orders.forEach(o => {
      if (o.status === 'Approved') {
        rawNotifications.push({
          id: `inventory-new-order-${o.id}`,
          title: `New Dispatch Request`,
          message: `Order #${o.id.slice(-6).toUpperCase()} has been approved. Ready for dispatch packaging.`,
          date: o.date || new Date().toISOString(),
          icon: ShoppingCart,
          color: 'text-indigo-500 bg-indigo-500/10'
        });
      }
    });

    // Low stock product alerts
    products.forEach(p => {
      const stock = p.availableStock ?? 0;
      const min = p.minimumStock ?? 5;
      if (stock <= min) {
        rawNotifications.push({
          id: `inventory-low-stock-${p.id}-${stock}`,
          title: `Low Stock Alert`,
          message: `${p.name} stock level is low: ${stock} remaining (Min: ${min}).`,
          date: new Date().toISOString(),
          icon: Package,
          color: 'text-orange-500 bg-orange-500/10'
        });
      }
    });
  }

  // 3. ADMIN / SUPERADMIN: New Orders awaiting approval & Out of Stock alerts
  if (role === 'ADMIN' || role === 'SUPERADMIN') {
    // New orders awaiting approval
    orders.forEach(o => {
      if (o.status === 'Pending') {
        rawNotifications.push({
          id: `admin-new-order-${o.id}`,
          title: `New Order Pending Approval`,
          message: `Order #${o.id.slice(-6).toUpperCase()} submitted by ${o.soEmail ? o.soEmail.split('@')[0] : 'Sales Executive'} is awaiting your approval.`,
          date: o.date || new Date().toISOString(),
          icon: Clock,
          color: 'text-amber-500 bg-amber-500/10'
        });
      }
    });

    // Out of Stock alerts
    products.forEach(p => {
      const stock = p.availableStock ?? 0;
      if (stock <= 0) {
        rawNotifications.push({
          id: `admin-out-of-stock-${p.id}`,
          title: `Out of Stock Alert`,
          message: `${p.name} is completely depleted. Please review supply.`,
          date: new Date().toISOString(),
          icon: AlertTriangle,
          color: 'text-rose-600 bg-rose-500/10'
        });
      }
    });
  }

  // 4. HR: Unverified visits & Pending expenses
  if (role === 'HR') {
    // Unverified visits
    visits.forEach(v => {
      const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || v.visit_status?.toUpperCase() === 'PENDING';
      if (isPending) {
        rawNotifications.push({
          id: `hr-verify-visit-${v.id}`,
          title: `Verify Field Visit`,
          message: `Field visit report by ${v.soEmail ? v.soEmail.split('@')[0] : 'Sales Executive'} awaits verification.`,
          date: v.date || new Date().toISOString(),
          icon: ClipboardList,
          color: 'text-rose-500 bg-rose-500/10'
        });
      }
    });

    // Pending expense reviews
    expenses.forEach(e => {
      if (e.status?.toUpperCase() === 'PENDING') {
        rawNotifications.push({
          id: `hr-verify-expense-${e.id}`,
          title: `Verify Expense Claim`,
          message: `Expense claim of ₹${(e.amount || 0).toLocaleString('en-IN')} by ${e.userName || 'Staff'} is awaiting verification.`,
          date: e.createdAt || new Date().toISOString(),
          icon: Receipt,
          color: 'text-teal-500 bg-teal-500/10'
        });
      }
    });
  }

  // Add broadcasts for target roles
  broadcasts.forEach(b => {
    if (b.targetRole === 'ALL' || b.targetRole.toUpperCase() === role) {
      rawNotifications.push({
        id: `broadcast-${b.id}`,
        title: `📢 Broadcast Announcement`,
        message: b.message,
        date: b.date,
        icon: Volume2,
        color: 'text-amber-600 bg-amber-500/10'
      });
    }
  });

  // Sort unified notification list by date descending
  rawNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter out notifications that have already been dismissed/read
  const activeNotifications = rawNotifications.filter(n => !dismissedIds.includes(n.id));

  // Dismiss notification helper
  const dismissNotification = (id: string) => {
    const updated = [...dismissedIds, id];
    localStorage.setItem('kamla_dismissed_notifications', JSON.stringify(updated));
    setDismissedIds(updated);
  };

  // Clear/Dismiss all current active notifications
  const dismissAll = () => {
    const activeIds = activeNotifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...activeIds]));
    localStorage.setItem('kamla_dismissed_notifications', JSON.stringify(updated));
    setDismissedIds(updated);
  };

  // Detect new notifications to play sound and show toast
  const activeIdsString = activeNotifications.map(n => n.id).join(',');
  useEffect(() => {
    const currentIds = new Set(activeNotifications.map(n => n.id));
    
    // Only alert if we already loaded initial data (prevIdsRef is not empty)
    if (prevIdsRef.current.size > 0) {
      const newNotifs = activeNotifications.filter(n => !prevIdsRef.current.has(n.id));
      if (newNotifs.length > 0) {
         try {
           // Short, pleasant notification sound
           const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
           audio.volume = 0.5;
           audio.play().catch(() => {});
         } catch (e) {}
         
         newNotifs.forEach(n => {
            toast({
              title: n.title,
              description: n.message,
            });
         });
      }
    }
    
    prevIdsRef.current = currentIds;
  }, [activeIdsString]);

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl border transition-all duration-300 outline-none flex items-center justify-center",
          isOpen 
            ? "bg-primary/10 border-primary text-primary" 
            : "bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
      >
        {activeNotifications.length > 0 ? (
          <BellRing className="w-5 h-5 text-amber-500 animate-swing" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {activeNotifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center shadow-lg border border-background">
            {activeNotifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 max-h-[480px] bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[9999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
              <div>
                <h3 className="font-extrabold text-sm text-foreground">Notifications</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {activeNotifications.length === 0 ? 'All caught up' : `${activeNotifications.length} pending items`}
                </p>
              </div>
              {activeNotifications.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-[10px] font-black text-amber-500 hover:text-amber-600 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40 max-h-[360px]">
              {activeNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2.5 opacity-80" />
                  <p className="text-xs font-bold text-foreground">No pending alerts</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-normal max-w-[200px]">
                    Your notifications have been reviewed and cleared!
                  </p>
                </div>
              ) : (
                activeNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className="p-3.5 flex gap-3 hover:bg-muted/30 transition-colors group relative"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", notif.color)}>
                      <notif.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <p className="text-xs font-extrabold text-foreground leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-[10.5px] text-foreground/90 mt-1 leading-relaxed font-medium">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-mono">
                        {new Date(notif.date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {/* Dismiss Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      className="absolute right-2.5 top-3.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
