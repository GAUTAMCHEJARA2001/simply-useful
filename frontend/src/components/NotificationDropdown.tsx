import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  Bell, BellRing, CheckCircle2, Volume2, VolumeX, AlertTriangle,
  ShoppingCart, Package, Clock, ClipboardList, MapPin, Receipt, X,
  ChevronRight, Search, CheckCheck, Trash2, ArrowRight,
  Flame, Check, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';

const DISMISSED_STORAGE_KEY = 'kamla_dismissed_notifications';
const READ_STORAGE_KEY = 'kamla_read_notifications';
const ALERTED_STORAGE_KEY = 'kamla_alerted_notifications';
const SOUND_STORAGE_KEY = 'kamla_notification_sound_enabled';

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
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
  } catch (e) {
    console.error(e);
  }
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
  actionLabel?: string;
  category: 'orders' | 'dispatches' | 'alerts' | 'broadcasts' | 'general';
  priority?: 'urgent' | 'high' | 'normal' | 'info';
  badgeLabel?: string;
}

const getDeliveryUrgency = (dateStr?: string) => {
  if (!dateStr) return null;
  const delivery = new Date(dateStr);
  if (isNaN(delivery.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  delivery.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'overdue', text: `${Math.abs(diffDays)}d overdue`, days: diffDays };
  if (diffDays === 0) return { status: 'today', text: 'Due today', days: 0 };
  if (diffDays <= 2) return { status: 'urgent', text: `Due in ${diffDays}d`, days: diffDays };
  return { status: 'normal', text: `${diffDays}d left`, days: diffDays };
};

const formatRelativeTime = (dateStr: string) => {
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return `Yesterday`;
    if (diffDay < 7) return `${diffDay}d ago`;

    const day = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    return `${day}, ${time}`;
  } catch {
    return 'Just now';
  }
};

const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio context issues
  }
};

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const { orders, visits, products, expenses } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [filterScope, setFilterScope] = useState<'all' | 'unread'>('unread');
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'dispatches' | 'alerts' | 'broadcasts' | 'general'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBanner, setActiveBanner] = useState<NotificationItem | null>(null);

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readStoredIds(DISMISSED_STORAGE_KEY));
  const [readIds, setReadIds] = useState<string[]>(() => readStoredIds(READ_STORAGE_KEY));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SOUND_STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 440, maxHeight: 600 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasNotificationSnapshotRef = useRef(false);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (next) playNotificationChime();
      return next;
    });
  };

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(viewportWidth < 640 ? viewportWidth - 24 : 440, 480);
    let left = rect.right - width;
    if (left < 12) left = 12;
    if (left + width > viewportWidth - 12) left = viewportWidth - width - 12;

    const top = rect.bottom + 8;
    const maxHeight = Math.min(620, Math.max(380, viewportHeight - top - 16));

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

  const role = user?.role ? user.role.toUpperCase() : '';

  // Generate notifications based on current role and application data
  const rawNotifications: NotificationItem[] = useMemo(() => {
    if (!user) return [];
    const list: NotificationItem[] = [];

    // 1. SALES OFFICER / SALES: Order status updates & Scheduled visits
    if (role === 'SALES' || role === 'SALES_OFFICER') {
      orders.forEach(o => {
        const email = o.soEmail || (o as any).so_email || '';
        if (email.toLowerCase() === user.email.toLowerCase()) {
          if (o.status !== 'Pending') {
            const statusText = o.status === 'Cancelled' ? 'Rejected' : o.status;
            let icon = Clock;
            let color = 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-950/50';
            let priority: NotificationItem['priority'] = 'normal';

            if (o.status === 'Approved') {
              icon = CheckCircle2;
              color = 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/50';
              priority = 'high';
            } else if (o.status === 'Dispatched') {
              icon = Package;
              color = 'text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-950/50';
              priority = 'high';
            } else if (o.status === 'Completed') {
              icon = CheckCircle2;
              color = 'text-teal-600 bg-teal-500/10 dark:text-teal-400 dark:bg-teal-950/50';
            } else if (o.status === 'Cancelled' || o.status === 'Returned') {
              icon = AlertTriangle;
              color = 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50';
              priority = 'urgent';
            }

            const oCode = (o.orderId || (o as any).order_id || o.id || '').toString().slice(-6).toUpperCase();
            list.push({
              id: `sales-order-status-${o.id}-${o.status}`,
              title: `Order #${oCode} ${statusText}`,
              message: `Order for ${o.partyName || 'Customer'} was updated to status: ${statusText}.`,
              date: o.date || (o as any).createdAt || new Date().toISOString(),
              icon,
              color,
              link: '/orders',
              actionLabel: 'View Order',
              category: 'orders',
              priority,
              badgeLabel: statusText.toUpperCase()
            });
          }
        }
      });

      const todayStr = new Date().toISOString().split('T')[0];
      visits.forEach(v => {
        const email = v.soEmail || (v as any).so_email || '';
        if (email.toLowerCase() === user.email.toLowerCase()) {
          const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || (v as any).visit_status?.toUpperCase() === 'PENDING';
          if (isPending && v.date?.startsWith(todayStr)) {
            list.push({
              id: `sales-visit-today-${v.id}`,
              title: `Visit Scheduled Today`,
              message: `Customer visit scheduled today with ${(v as any).partyName || (v as any).dealerName || 'Dealer'}.`,
              date: v.date || new Date().toISOString(),
              icon: MapPin,
              color: 'text-sky-600 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-950/50',
              link: '/sales/visits',
              actionLabel: 'Start Visit',
              category: 'general',
              priority: 'high',
              badgeLabel: 'TODAY'
            });
          }
        }
      });
    }

    // 2. INVENTORY OFFICER & PRODUCTION: Dispatch queue & Shortage Alerts
    if (role === 'INVENTORY' || role === 'PRODUCTION') {
      orders.forEach(o => {
        if (o.status === 'Approved' || o.status === 'Partially Dispatched') {
          const urg = getDeliveryUrgency(o.expectedDeliveryDate || (o as any).expected_delivery_date);
          const isUrgent = urg?.status === 'overdue' || urg?.status === 'today';
          const oCode = (o.orderId || (o as any).order_id || o.id || '').toString().slice(-6).toUpperCase();

          list.push({
            id: `inventory-dispatch-${o.id}`,
            title: isUrgent ? `🔥 Urgent Dispatch: #${oCode}` : `Ready for Dispatch: #${oCode}`,
            message: `${o.partyName || 'Customer'} · ${o.items?.length || 0} items${urg?.text ? ` (${urg.text})` : ''}`,
            date: o.date || (o as any).createdAt || new Date().toISOString(),
            icon: isUrgent ? Flame : ShoppingCart,
            color: isUrgent
              ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50'
              : 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-950/50',
            link: '/inventory/dashboard',
            actionLabel: 'Pack & Send',
            category: 'dispatches',
            priority: isUrgent ? 'urgent' : 'high',
            badgeLabel: urg?.text?.toUpperCase() || 'READY'
          });
        }
      });

      products.forEach(p => {
        const stock = p.availableStock ?? 0;
        const min = p.minimumStock ?? 5;
        if (stock <= 0) {
          list.push({
            id: `inventory-out-of-stock-${p.id}`,
            title: `Out of Stock: ${p.name}`,
            message: `Inventory is completely depleted. Reordering or production required immediately.`,
            date: new Date().toISOString(),
            icon: AlertTriangle,
            color: 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50',
            link: '/inventory',
            actionLabel: 'Check Stock',
            category: 'alerts',
            priority: 'urgent',
            badgeLabel: 'OUT OF STOCK'
          });
        } else if (stock <= min) {
          list.push({
            id: `inventory-low-stock-${p.id}-${stock}`,
            title: `Low Stock: ${p.name}`,
            message: `Only ${stock} units remaining in inventory (Threshold: ${min}).`,
            date: new Date().toISOString(),
            icon: Package,
            color: 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-950/50',
            link: '/inventory',
            actionLabel: 'View Stock',
            category: 'alerts',
            priority: 'high',
            badgeLabel: 'LOW STOCK'
          });
        }
      });
    }

    // 3. ADMIN / SUPERADMIN: Orders awaiting approval & Depleted items
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      orders.forEach(o => {
        if (o.status === 'Pending') {
          const urg = getDeliveryUrgency(o.expectedDeliveryDate || (o as any).expected_delivery_date);
          const isUrgent = urg?.status === 'overdue' || urg?.status === 'today';
          const oCode = (o.orderId || (o as any).order_id || o.id || '').toString().slice(-6).toUpperCase();
          const rep = o.soEmail ? o.soEmail.split('@')[0] : 'Sales Rep';
          const amt = (o.grandTotal ?? (o as any).grand_total ?? 0).toLocaleString('en-IN');

          list.push({
            id: `admin-new-order-${o.id}`,
            title: isUrgent ? `🔥 Urgent Order Approval: #${oCode}` : `Order Pending Approval: #${oCode}`,
            message: `${o.partyName || 'Customer'} · ₹${amt} submitted by ${rep}${urg?.text ? ` (${urg.text})` : ''}`,
            date: o.date || (o as any).createdAt || new Date().toISOString(),
            icon: isUrgent ? Flame : Clock,
            color: isUrgent
              ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50'
              : 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-950/50',
            link: '/admin?tab=orders',
            actionLabel: 'Review & Approve',
            category: 'orders',
            priority: isUrgent ? 'urgent' : 'high',
            badgeLabel: urg?.text?.toUpperCase() || 'APPROVAL'
          });
        }
      });

      // Products out of stock alert
      products.forEach(p => {
        const stock = p.availableStock ?? 0;
        if (stock <= 0) {
          list.push({
            id: `admin-out-of-stock-${p.id}`,
            title: `Critical Stock: ${p.name}`,
            message: `Product is completely out of stock across active warehouses.`,
            date: new Date().toISOString(),
            icon: AlertTriangle,
            color: 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50',
            link: '/inventory',
            actionLabel: 'Inspect Stock',
            category: 'alerts',
            priority: 'urgent',
            badgeLabel: '0 IN STOCK'
          });
        }
      });
    }

    // 4. HR: Unverified visits & Pending expenses
    if (role === 'HR' || role === 'SUPERADMIN' || role === 'ADMIN') {
      expenses.forEach(e => {
        if (e.status?.toUpperCase() === 'PENDING') {
          list.push({
            id: `hr-verify-expense-${e.id}`,
            title: `Expense Claim Pending`,
            message: `Claim of ₹${(e.amount || 0).toLocaleString('en-IN')} by ${(e as any).userName || (e as any).userEmail?.split('@')[0] || 'Staff'} awaits approval.`,
            date: (e as any).createdAt || (e as any).date || new Date().toISOString(),
            icon: Receipt,
            color: 'text-teal-600 bg-teal-500/10 dark:text-teal-400 dark:bg-teal-950/50',
            link: '/hr/manage?tab=expenses',
            actionLabel: 'Review Claim',
            category: 'general',
            priority: 'normal',
            badgeLabel: 'EXPENSE'
          });
        }
      });

      visits.forEach(v => {
        const isPending = v.visitStatus?.toUpperCase() === 'PENDING' || (v as any).visit_status?.toUpperCase() === 'PENDING';
        if (isPending && role === 'HR') {
          list.push({
            id: `hr-verify-visit-${v.id}`,
            title: `Field Visit Verification`,
            message: `Visit report for ${(v as any).partyName || 'Customer'} by ${v.soEmail ? v.soEmail.split('@')[0] : 'Sales Rep'} awaits review.`,
            date: v.date || (v as any).createdAt || new Date().toISOString(),
            icon: ClipboardList,
            color: 'text-violet-600 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-950/50',
            link: '/sales/visits',
            actionLabel: 'Verify Report',
            category: 'general',
            priority: 'normal',
            badgeLabel: 'VISIT'
          });
        }
      });
    }

    // 5. Broadcasts for target roles
    broadcasts.forEach(b => {
      if (b.targetRole === 'ALL' || b.targetRole.toUpperCase() === role) {
        list.push({
          id: `broadcast-${b.id}`,
          title: `Announcement from ${b.author || 'Admin'}`,
          message: b.message,
          date: b.date || new Date().toISOString(),
          icon: Volume2,
          color: 'text-primary bg-primary/10 dark:text-primary dark:bg-primary/20',
          link: '/admin',
          actionLabel: 'View Notice',
          category: 'broadcasts',
          priority: 'high',
          badgeLabel: 'BROADCAST'
        });
      }
    });

    // Sort: Urgent first, then by date descending
    list.sort((a, b) => {
      const priorityWeight = { urgent: 3, high: 2, normal: 1, info: 0 };
      const weightA = priorityWeight[a.priority || 'normal'];
      const weightB = priorityWeight[b.priority || 'normal'];
      if (weightA !== weightB) return weightB - weightA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return list;
  }, [user, orders, visits, products, expenses, broadcasts, role]);

  // Undismissed notifications
  const activeNotifications = useMemo(() => {
    return rawNotifications.filter(n => !dismissedIds.includes(n.id));
  }, [rawNotifications, dismissedIds]);

  // Unread notifications
  const unreadNotifications = useMemo(() => {
    return activeNotifications.filter(n => !readIds.includes(n.id));
  }, [activeNotifications, readIds]);

  // Filtered by Scope (Unread vs All), Active Tab, and Search Query
  const displayedNotifications = useMemo(() => {
    let list = filterScope === 'unread' ? unreadNotifications : activeNotifications;

    if (activeTab !== 'all') {
      list = list.filter(n => n.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.badgeLabel && n.badgeLabel.toLowerCase().includes(q))
      );
    }

    return list;
  }, [filterScope, unreadNotifications, activeNotifications, activeTab, searchQuery]);

  // Category counts based on active scope
  const counts = useMemo(() => {
    const base = filterScope === 'unread' ? unreadNotifications : activeNotifications;
    return {
      all: base.length,
      orders: base.filter(n => n.category === 'orders').length,
      dispatches: base.filter(n => n.category === 'dispatches').length,
      alerts: base.filter(n => n.category === 'alerts').length,
      broadcasts: base.filter(n => n.category === 'broadcasts').length,
      general: base.filter(n => n.category === 'general').length,
    };
  }, [filterScope, unreadNotifications, activeNotifications]);

  const markAsRead = (id: string) => {
    const updated = Array.from(new Set([...readIds, id]));
    writeStoredIds(READ_STORAGE_KEY, updated);
    setReadIds(updated);
  };

  const markAsUnread = (id: string) => {
    const updated = readIds.filter(item => item !== id);
    writeStoredIds(READ_STORAGE_KEY, updated);
    setReadIds(updated);
  };

  const markAllAsRead = () => {
    const allActiveIds = activeNotifications.map(n => n.id);
    const updated = Array.from(new Set([...readIds, ...allActiveIds]));
    writeStoredIds(READ_STORAGE_KEY, updated);
    setReadIds(updated);
    toast({
      title: '✓ All Marked as Read',
      description: 'Your unread notifications have been cleared.',
    });
  };

  const dismissNotification = (id: string) => {
    const updated = Array.from(new Set([...dismissedIds, id]));
    writeStoredIds(DISMISSED_STORAGE_KEY, updated);
    setDismissedIds(updated);
  };

  const dismissAll = () => {
    const allActiveIds = activeNotifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allActiveIds]));
    writeStoredIds(DISMISSED_STORAGE_KEY, updated);
    setDismissedIds(updated);
    toast({
      title: 'Notifications Cleared',
      description: 'All notifications have been removed.',
    });
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Your browser or device does not support native push notifications.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
      if (res === 'granted') {
        toast({
          title: '🔔 Device Alerts Activated',
          description: 'Notifications will now trigger your device alert tone & banners.',
        });
        showNativeNotification({
          id: `welcome-alert-${Date.now()}`,
          title: 'Kamla OTS Device Alerts Enabled',
          message: 'Your personal phone/device notification tone and banners are active.',
          date: new Date().toISOString(),
          icon: Bell,
          color: 'text-primary bg-primary/10',
          category: 'general',
          priority: 'high',
          badgeLabel: 'SYSTEM'
        });
      } else if (res === 'denied') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in site settings to receive device alerts.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error('Failed to request notification permission', e);
    }
  };

  // Push notifications triggering native device alert tone & displaying app branding
  const showNativeNotification = useCallback((notif: NotificationItem) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const origin = window.location.origin;
    const iconUrl = `${origin}/android-chrome-192x192.png`;
    const badgeUrl = `${origin}/android-chrome-192x192.png`;

    const options: NotificationOptions = {
      body: notif.message,
      icon: iconUrl,
      badge: badgeUrl,
      tag: notif.id,
      renotify: true,
      // silent: false instructs the mobile/desktop OS to play the user's customized device tone!
      silent: !soundEnabled,
      vibrate: [200, 100, 200],
      data: {
        url: notif.link || '/',
        id: notif.id
      }
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: notif.title,
          body: notif.message,
          icon: iconUrl,
          tag: notif.id,
          renotify: true,
          silent: !soundEnabled,
          data: { url: notif.link || '/', id: notif.id }
        });
      } else if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(notif.title, options);
        }).catch(() => {
          new Notification(notif.title, options);
        });
      } else {
        new Notification(notif.title, options);
      }
    } catch (e) {
      console.error('Failed to trigger native push notification', e);
    }
  }, [soundEnabled]);

  // Test device alert tone and in-app banner
  const testDeviceAlert = () => {
    const testItem: NotificationItem = {
      id: `test-alert-${Date.now()}`,
      title: '🔥 Urgent Order Approval: #OTS-88',
      message: 'Rajesh Traders · ₹45,000 awaiting dispatch verification',
      date: new Date().toISOString(),
      icon: Flame,
      color: 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-950/50',
      category: 'orders',
      priority: 'urgent',
      badgeLabel: 'DUE TODAY',
      link: '/admin?tab=orders',
      actionLabel: 'Review Order'
    };

    setActiveBanner(testItem);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        showNativeNotification(testItem);
      } else {
        requestNotificationPermission();
      }
    } else if (soundEnabled) {
      playNotificationChime();
    }
  };

  // Auto-dismiss active in-app banner after 6.5s
  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 6500);
    return () => clearTimeout(timer);
  }, [activeBanner]);

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
      // 1. Display professional In-App UI Banner for the highest priority item
      setActiveBanner(newNotifs[0]);

      // 2. Fire device-native notification (triggers personal device alert sound)
      newNotifs.forEach(n => {
        showNativeNotification(n);
      });

      // 3. Fallback sound: if native permission not granted, play web chime when sound enabled
      if (soundEnabled && (!('Notification' in window) || Notification.permission !== 'granted')) {
        playNotificationChime();
      }

      const updatedAlerted = Array.from(
        new Set([...previousAlertedIds, ...newNotifs.map(n => n.id)])
      );
      writeStoredIds(ALERTED_STORAGE_KEY, updatedAlerted);
    }
  }, [activeNotifications, soundEnabled, showNativeNotification]);

  if (!user) return null;

  const unreadCount = unreadNotifications.length;

  const dropdown = isOpen ? createPortal(
    <AnimatePresence>
      <motion.div
        id="notification-portal-root"
        initial={{ opacity: 0, scale: 0.96, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="fixed bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col z-[9999]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: dropdownPosition.maxHeight,
          transformOrigin: 'top right',
        }}
      >
        {/* Modern Professional Header */}
        <div className="p-3.5 border-b border-border/80 bg-muted/20 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 leading-none">
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="text-[10px] bg-primary text-primary-foreground font-black px-1.5 py-0.2 rounded-full">
                      {unreadCount}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                      All caught up
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {/* Header Actions Toolbar */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={testDeviceAlert}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1"
                title="Test notification sound & banner on this device"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Test Alert</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  soundEnabled
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                    : "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                )}
                title={soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}

              {activeNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={dismissAll}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Device Alert Permission Banner if not yet granted */}
          {permissionStatus !== 'granted' && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">
                    Enable Device Ringtone & Alerts
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Use your phone's personal notification sound for urgent alerts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
              >
                Turn On
              </button>
            </div>
          )}

          {/* Search & Scope Switcher Row */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search alerts, orders..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-border/80 bg-background/80 focus:bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scope Switcher: Unread vs All */}
            <div className="inline-flex p-0.5 bg-muted/60 rounded-lg shrink-0 border border-border/50">
              <button
                type="button"
                onClick={() => setFilterScope('unread')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all",
                  filterScope === 'unread'
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all",
                  filterScope === 'all'
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({activeNotifications.length})
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0",
                activeTab === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              All ({counts.all})
            </button>
            {counts.orders > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'orders'
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Orders ({counts.orders})
              </button>
            )}
            {counts.dispatches > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('dispatches')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'dispatches'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Dispatches ({counts.dispatches})
              </button>
            )}
            {counts.alerts > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'alerts'
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Stock ({counts.alerts})
              </button>
            )}
            {counts.broadcasts > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('broadcasts')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'broadcasts'
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Notices ({counts.broadcasts})
              </button>
            )}
            {counts.general > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 flex items-center gap-1",
                  activeTab === 'general'
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                HR & Field ({counts.general})
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {searchQuery
                  ? 'No matching notifications'
                  : filterScope === 'unread'
                    ? 'All caught up!'
                    : 'No notifications'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
                {searchQuery
                  ? `No alerts match "${searchQuery}". Try a different keyword.`
                  : filterScope === 'unread'
                    ? 'You have reviewed all pending notifications in this section.'
                    : 'Your notification inbox is currently clear.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs text-primary font-semibold hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            displayedNotifications.map((notif) => {
              const isUnread = !readIds.includes(notif.id);
              const isUrgent = notif.priority === 'urgent';
              const isHigh = notif.priority === 'high';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "group relative p-3 rounded-xl border transition-all duration-150 cursor-pointer flex gap-3 items-start",
                    isUnread
                      ? "bg-primary/[0.04] dark:bg-primary/[0.07] border-primary/20 hover:border-primary/40 shadow-xs"
                      : "bg-card/70 border-border/50 hover:bg-accent/40 opacity-80 hover:opacity-100",
                    isUrgent && "border-l-4 border-l-rose-500",
                    !isUrgent && isHigh && "border-l-4 border-l-amber-500",
                    !isUrgent && !isHigh && notif.category === 'dispatches' && "border-l-4 border-l-indigo-500",
                    !isUrgent && !isHigh && notif.category === 'broadcasts' && "border-l-4 border-l-purple-500"
                  )}
                >
                  {/* Left Icon Pill */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    notif.color
                  )}>
                    <notif.icon className="w-4 h-4" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {notif.badgeLabel && (
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.2 rounded tracking-wider uppercase",
                          isUrgent ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                          isHigh ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {notif.badgeLabel}
                        </span>
                      )}
                      <p className={cn(
                        "text-xs font-bold truncate tracking-tight text-foreground group-hover:text-primary transition-colors",
                        isUnread && "font-black"
                      )}>
                        {notif.title}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-normal line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground/75 font-mono">
                        {formatRelativeTime(notif.date)}
                      </span>

                      {notif.actionLabel && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          {notif.actionLabel}
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unread Glowing Dot & Actions */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0"
                        title="Unread"
                      />
                    )}

                    {/* Mark as read/unread button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isUnread) markAsRead(notif.id);
                        else markAsUnread(notif.id);
                      }}
                      className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                      title={isUnread ? "Mark as read" : "Mark as unread"}
                    >
                      <Check className="w-3 h-3" />
                    </button>

                    {/* Dismiss button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Dismiss notification"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Professional Footer */}
        <div className="px-3.5 py-2.5 border-t border-border/80 bg-muted/20 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-[11px] font-medium">
            {unreadCount > 0 ? `${unreadCount} unread of ${activeNotifications.length}` : 'All alerts caught up'}
          </span>

          <div className="flex items-center gap-2">
            {(role === 'ADMIN' || role === 'SUPERADMIN') && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin?tab=orders');
                }}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Approval Queue <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {(role === 'INVENTORY' || role === 'PRODUCTION') && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/inventory/dashboard');
                }}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Dispatch Room <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {(role === 'SALES' || role === 'SALES_OFFICER') && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/orders');
                }}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                My Orders <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  const inAppBannerPortal = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {activeBanner && (
        <motion.div
          key={activeBanner.id}
          initial={{ opacity: 0, y: -45, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', damping: 24, stiffness: 340 }}
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:w-[440px] z-[99999] pointer-events-auto bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
        >
          {/* Top Brand & Metadata Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <img
                src="/android-chrome-192x192.png"
                alt="Kamla Logo"
                className="w-5 h-5 rounded-md object-contain border border-border/40 bg-white dark:bg-slate-800 p-0.5 shadow-2xs"
              />
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Kamla OTS
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeBanner.badgeLabel && (
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                  activeBanner.priority === 'urgent'
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    : activeBanner.priority === 'high'
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
                )}>
                  {activeBanner.badgeLabel}
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveBanner(null)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Banner Body */}
          <div
            onClick={() => {
              const current = activeBanner;
              setActiveBanner(null);
              handleNotificationClick(current);
            }}
            className="p-3.5 cursor-pointer hover:bg-muted/30 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-current/20 shadow-xs",
                activeBanner.color
              )}>
                <activeBanner.icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                  {activeBanner.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {activeBanner.message}
                </p>
              </div>
            </div>

            {/* Banner Quick Actions */}
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground/80 font-medium">
                {formatRelativeTime(activeBanner.date)}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(activeBanner.id);
                    setActiveBanner(null);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Mark read
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const current = activeBanner;
                    setActiveBanner(null);
                    handleNotificationClick(current);
                  }}
                  className="px-3 py-1 text-[11px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-xs inline-flex items-center gap-1 transition-all"
                >
                  {activeBanner.actionLabel || 'View Details'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar auto-dismiss indicator */}
          <div className="h-1 w-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 6.5, ease: 'linear' }}
              className={cn(
                "h-full",
                activeBanner.priority === 'urgent'
                  ? "bg-rose-500"
                  : activeBanner.priority === 'high'
                  ? "bg-amber-500"
                  : "bg-primary"
              )}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative z-50 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateDropdownPosition();
          setIsOpen(open => !open);
        }}
        className={cn(
          "relative p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl border transition-all duration-200 outline-none flex items-center justify-center shrink-0",
          isOpen
            ? "bg-primary/10 border-primary text-primary shadow-xs ring-2 ring-primary/20"
            : "bg-card border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground shadow-2xs"
        )}
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-500 animate-swing" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center shadow-md border-2 border-background animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdown}
      {inAppBannerPortal}
    </div>
  );
};
