import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  Bell, BellRing, CheckCircle2, Volume2, AlertTriangle,
  ShoppingCart, Package, Clock, ClipboardList, MapPin, Receipt, X,
  ExternalLink, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';

const DISMISSED_STORAGE_KEY = 'kamla_dismissed_notifications';
const ALERTED_STORAGE_KEY = 'kamla_alerted_notifications';

const readStoredIds = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

const writeStoredIds = (key: string, ids: string[]) => {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
};

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
  link?: string;
  category?: 'orders' | 'alerts' | 'dispatches' | 'general';
}

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const { orders, visits, products, expenses } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'dispatches' | 'orders' | 'alerts'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readStoredIds(DISMISSED_STORAGE_KEY));
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 380, maxHeight: 520 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasNotificationSnapshotRef = useRef(false);

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(viewportWidth < 640 ? viewportWidth - 32 : 410, 420);
    let left = rect.right - width;
    if (left < 16) left = 16;
    if (left + width > viewportWidth - 16) left = viewportWidth - width - 16;

    const top = rect.bottom + 10;
    const maxHeight = Math.min(560, viewportHeight - top - 24);

    setDropdownPosition({ top, left, width, maxHeight });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    const handleResizeOrScroll = () => updateDropdownPosition();
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, updateDropdownPosition]);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/broadcasts');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setBroadcasts(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load broadcasts', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        const portalEl = document.getElementById('notification-portal-root');
        if (portalEl && portalEl.contains(e.target as Node)) return;
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

  // 1. SALES OFFICER / SALES: Order status updates & Scheduled visits
  if (role === 'SALES' || role === 'SALES_OFFICER') {
    orders.forEach(o => {
      const email = o.soEmail || o.so_email || '';
      if (email.toLowerCase() === user.email.toLowerCase()) {
        if (o.status !== 'Pending') {
          const statusText = o.status === 'Cancelled' ? 'Rejected' : o.status;
          let icon = Clock;
          let color = 'text-amber-600 bg-amber-500/15 dark:text-amber-400 dark:bg-amber-950/60';

          if (o.status === 'Approved') {
            icon = CheckCircle2;
            color = 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-950/60';
          } else if (o.status === 'Dispatched') {
            icon = Package;
            color = 'text-blue-600 bg-blue-500/15 dark:text-blue-400 dark:bg-blue-950/60';
          } else if (o.status === 'Completed') {
            icon = CheckCircle2;
            color = 'text-teal-600 bg-teal-500/15 dark:text-teal-400 dark:bg-teal-950/60';
          } else if (o.status === 'Cancelled' || o.status === 'Returned') {
            icon = AlertTriangle;
            color = 'text-rose-600 bg-rose-500/15 dark:text-rose-400 dark:bg-rose-950/60';
          }

          rawNotifications.push({
            id: `sales-order-status-${o.id}-${o.status}`,
            title: `Order Status Updated`,
            message: `Your order #${o.id?.toString().slice(-6).toUpperCase()} status was changed to ${statusText}.`,
            date: o.date || new Date().toISOString(),
            icon,
            color,
            link: '/orders',
            category: 'orders'
          });
        }
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    visits.forEach(v => {
      const email = v.soEmail || v.so_email || '';
      if (email.toLowerCase() === user.email.toLowerCase()) {
        const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || v.visit_status?.toUpperCase() === 'PENDING';
        if (isPending && v.date?.startsWith(todayStr)) {
          rawNotifications.push({
            id: `sales-visit-today-${v.id}`,
            title: `Visit Scheduled Today`,
            message: `You have a visit scheduled today at ${(v as any).partyName || 'Dealer'}.`,
            date: v.date || new Date().toISOString(),
            icon: MapPin,
            color: 'text-sky-600 bg-sky-500/15 dark:text-sky-400 dark:bg-sky-950/60',
            link: '/sales/visits',
            category: 'general'
          });
        }
      }
    });
  }

  // 2. INVENTORY OFFICER & PRODUCTION: Approved orders ready for dispatch & Low stock alerts
  if (role === 'INVENTORY' || role === 'PRODUCTION') {
    orders.forEach(o => {
      if (o.status === 'Approved') {
        rawNotifications.push({
          id: `inventory-new-order-${o.id}`,
          title: `New Dispatch Request`,
          message: `Order #${o.id?.toString().slice(-6).toUpperCase()} has been approved. Ready for dispatch packaging.`,
          date: o.date || new Date().toISOString(),
          icon: ShoppingCart,
          color: 'text-indigo-600 bg-indigo-500/15 dark:text-indigo-400 dark:bg-indigo-950/60',
          link: '/inventory/dispatch',
          category: 'dispatches'
        });
      }
    });

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
          color: 'text-orange-600 bg-orange-500/15 dark:text-orange-400 dark:bg-orange-950/60',
          link: '/inventory',
          category: 'alerts'
        });
      }
    });
  }

  // 3. ADMIN / SUPERADMIN: New Orders awaiting approval & Out of Stock alerts
  if (role === 'ADMIN' || role === 'SUPERADMIN') {
    orders.forEach(o => {
      if (o.status === 'Pending') {
        rawNotifications.push({
          id: `admin-new-order-${o.id}`,
          title: `New Order Pending Approval`,
          message: `Order #${o.id?.toString().slice(-6).toUpperCase()} submitted by ${o.soEmail ? o.soEmail.split('@')[0] : 'Sales Executive'} is awaiting your approval.`,
          date: o.date || new Date().toISOString(),
          icon: Clock,
          color: 'text-amber-600 bg-amber-500/15 dark:text-amber-400 dark:bg-amber-950/60',
          link: '/orders',
          category: 'orders'
        });
      }
    });

    products.forEach(p => {
      const stock = p.availableStock ?? 0;
      if (stock <= 0) {
        rawNotifications.push({
          id: `admin-out-of-stock-${p.id}`,
          title: `Out of Stock Alert`,
          message: `${p.name} is completely depleted. Please review supply.`,
          date: new Date().toISOString(),
          icon: AlertTriangle,
          color: 'text-rose-600 bg-rose-500/15 dark:text-rose-400 dark:bg-rose-950/60',
          link: '/inventory',
          category: 'alerts'
        });
      }
    });
  }

  // 4. HR: Unverified visits & Pending expenses
  if (role === 'HR') {
    visits.forEach(v => {
      const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || v.visit_status?.toUpperCase() === 'PENDING';
      if (isPending) {
        rawNotifications.push({
          id: `hr-verify-visit-${v.id}`,
          title: `Verify Field Visit`,
          message: `Field visit report by ${v.soEmail ? v.soEmail.split('@')[0] : 'Sales Executive'} awaits verification.`,
          date: v.date || new Date().toISOString(),
          icon: ClipboardList,
          color: 'text-rose-600 bg-rose-500/15 dark:text-rose-400 dark:bg-rose-950/60',
          link: '/sales/visits',
          category: 'general'
        });
      }
    });

    expenses.forEach(e => {
      if (e.status?.toUpperCase() === 'PENDING') {
        rawNotifications.push({
          id: `hr-verify-expense-${e.id}`,
          title: `Verify Expense Claim`,
          message: `Expense claim of ₹${(e.amount || 0).toLocaleString('en-IN')} by ${(e as any).userName || 'Staff'} is awaiting verification.`,
          date: (e as any).createdAt || new Date().toISOString(),
          icon: Receipt,
          color: 'text-teal-600 bg-teal-500/15 dark:text-teal-400 dark:bg-teal-950/60',
          link: '/hr',
          category: 'general'
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
        color: 'text-amber-600 bg-amber-500/15 dark:text-amber-400 dark:bg-amber-950/60',
        link: '/admin',
        category: 'general'
      });
    }
  });

  // Sort unified notification list by date descending
  rawNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter out notifications that have already been dismissed/read
  const activeNotifications = rawNotifications.filter(n => !dismissedIds.includes(n.id));

  // Category Filtered items
  const filteredNotifications = activeNotifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'dispatches') return n.category === 'dispatches';
    if (activeTab === 'orders') return n.category === 'orders';
    if (activeTab === 'alerts') return n.category === 'alerts';
    return true;
  });

  const dispatchesCount = activeNotifications.filter(n => n.category === 'dispatches').length;
  const ordersCount = activeNotifications.filter(n => n.category === 'orders').length;
  const alertsCount = activeNotifications.filter(n => n.category === 'alerts').length;

  const dismissNotification = (id: string) => {
    const updated = Array.from(new Set([...dismissedIds, id]));
    writeStoredIds(DISMISSED_STORAGE_KEY, updated);
    setDismissedIds(updated);
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    dismissNotification(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const dismissAll = () => {
    const activeIds = activeNotifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...activeIds]));
    writeStoredIds(DISMISSED_STORAGE_KEY, updated);
    setDismissedIds(updated);
    setIsOpen(false);
  };

  const showNativeNotification = (title: string, body: string, tag?: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/icon-192.png',
            tag: tag || title
          });
        });
      } else {
        new Notification(title, { body, tag });
      }
    } catch (e) {
      console.error('Failed to trigger native push notification', e);
    }
  };

  useEffect(() => {
    const currentIds = new Set(activeNotifications.map(n => n.id));
    if (!hasNotificationSnapshotRef.current) {
      hasNotificationSnapshotRef.current = true;
      writeStoredIds(ALERTED_STORAGE_KEY, Array.from(currentIds));
      return;
    }

    const previousAlertedIds = readStoredIds(ALERTED_STORAGE_KEY);
    const newNotifs = activeNotifications.filter(
      n => !previousAlertedIds.includes(n.id)
    );

    if (newNotifs.length > 0) {
      newNotifs.forEach(n => {
        showNativeNotification(n.title, n.message, n.id);
      });
      const updatedAlerted = Array.from(
        new Set([...previousAlertedIds, ...newNotifs.map(n => n.id)])
      );
      writeStoredIds(ALERTED_STORAGE_KEY, updatedAlerted);
    }
  }, [activeNotifications]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return 'Just now';
      const day = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
      return `${day}, ${time}`;
    } catch {
      return 'Just now';
    }
  };

  const dropdown = isOpen ? createPortal(
    <AnimatePresence>
      <motion.div
        id="notification-portal-root"
        initial={{ opacity: 0, scale: 0.96, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[9999]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: dropdownPosition.maxHeight,
          transformOrigin: 'top right',
        }}
      >
        {/* Modern Header matching user reference design */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/20 shrink-0">
          <div>
            <h3 className="font-black text-base text-foreground tracking-tight flex items-center gap-2">
              Notifications
              {activeNotifications.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  Live
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {activeNotifications.length === 0 ? 'All caught up' : `${activeNotifications.length} pending items`}
            </p>
          </div>

          {activeNotifications.length > 0 && (
            <button
              onClick={dismissAll}
              className="text-xs font-black text-amber-500 hover:text-amber-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-500/10 active:scale-95"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Interactive Filter Category Tabs */}
        {activeNotifications.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/10 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                activeTab === 'all'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              All ({activeNotifications.length})
            </button>
            {dispatchesCount > 0 && (
              <button
                onClick={() => setActiveTab('dispatches')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'dispatches'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Dispatches ({dispatchesCount})
              </button>
            )}
            {ordersCount > 0 && (
              <button
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'orders'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Orders ({ordersCount})
              </button>
            )}
            {alertsCount > 0 && (
              <button
                onClick={() => setActiveTab('alerts')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'alerts'
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Alerts ({alertsCount})
              </button>
            )}
          </div>
        )}

        {/* Interactive Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1.5">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2.5 opacity-80" />
              <p className="text-sm font-bold text-foreground">No pending notifications</p>
              <p className="text-xs text-muted-foreground mt-1 leading-normal max-w-[220px]">
                {activeTab === 'all'
                  ? 'Your alerts have been reviewed and cleared!'
                  : `No notifications in ${activeTab} section.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="p-3.5 rounded-2xl flex gap-3.5 items-start bg-card hover:bg-accent/40 border border-border/40 transition-all duration-200 cursor-pointer relative group shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                {/* Modern Pill Icon Container matching reference design */}
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105",
                  notif.color
                )}>
                  <notif.icon className="w-5 h-5" />
                </div>

                {/* Content Box */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                      {notif.title}
                    </p>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium break-words">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-mono mt-2 font-semibold">
                    {formatDateLabel(notif.date)}
                  </p>
                </div>

                {/* Individual Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="absolute right-2.5 top-3 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative z-50 shrink-0">
      <button
        ref={buttonRef}
        onClick={() => {
          updateDropdownPosition();
          setIsOpen(open => !open);
        }}
        className={cn(
          "relative p-2.5 rounded-xl border transition-all duration-300 outline-none flex items-center justify-center",
          isOpen
            ? "bg-primary/10 border-primary text-primary shadow-sm"
            : "bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        aria-label="Open notifications"
        aria-expanded={isOpen}
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

      {dropdown}
    </div>
  );
};
