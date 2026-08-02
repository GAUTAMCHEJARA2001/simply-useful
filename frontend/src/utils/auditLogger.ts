import { api } from '@/api/client';

export type LogType = 'ACTION' | 'ERROR' | 'PERMISSION' | 'WARN';

interface LogPayload {
  logType: LogType;
  feature: string;
  action: string;
  details?: any;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

const logBuffer: LogPayload[] = [];
let flushTimer: any = null;

// ── Console message capture ──────────────────────────────────────
// Keep a rolling buffer of the last 20 console messages so we can
// attach them to any log entry that happens around the same time.
const consoleBuffer: string[] = [];
const MAX_CONSOLE_BUFFER = 20;

if (typeof window !== 'undefined') {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  const capture = (level: string, args: any[]) => {
    try {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      // Don't capture our own audit logger messages
      if (msg.includes('[AuditLogger]')) return;
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      consoleBuffer.push(`[${ts}] ${level}: ${msg.slice(0, 200)}`);
      if (consoleBuffer.length > MAX_CONSOLE_BUFFER) consoleBuffer.shift();
    } catch (_) { /* safety */ }
  };

  console.log = (...args: any[]) => { capture('info', args); origLog.apply(console, args); };
  console.warn = (...args: any[]) => { capture('warn', args); origWarn.apply(console, args); };
  console.error = (...args: any[]) => { capture('error', args); origError.apply(console, args); };
}

// ── Helper: get the friendly page name from the current URL ──────
function getCurrentPageName(): string {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;

  const pageMap: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/inventory': 'Inventory Management',
    '/sales': 'Sales',
    '/purchases': 'Purchases',
    '/production': 'Production',
    '/dealers': 'Dealers',
    '/suppliers': 'Suppliers',
    '/products': 'Products',
    '/reports': 'Reports',
    '/settings': 'Settings',
    '/users': 'User Management',
    '/crm': 'CRM & Leads',
    '/expenses': 'Expenses',
    '/visits': 'Sales Visits',
    '/audit-logs': 'Audit Logs',
    '/broadcasts': 'Broadcasts',
  };

  // Check exact matches first
  if (pageMap[path]) return pageMap[path];

  // Check partial matches (e.g., /inventory/stock-ledger)
  for (const [key, name] of Object.entries(pageMap)) {
    if (key !== '/' && path.startsWith(key)) return name;
  }

  // Fallback: convert path to readable name
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts.map(p => p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' > ');
  }
  return 'Unknown Page';
}

// ── Helper: get recent console messages ──────────────────────────
function getRecentConsoleMessages(): string[] {
  return [...consoleBuffer];
}

// ── Last clicked button tracking ─────────────────────────────────
let lastClickedButton = '';
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Walk up to find the nearest button, a, or clickable element
    let el: HTMLElement | null = target;
    for (let i = 0; i < 5 && el; i++) {
      const tag = el.tagName?.toLowerCase();
      if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'menuitem') {
        const text = (el.textContent || '').trim().slice(0, 60);
        if (text) {
          lastClickedButton = text;
          return;
        }
      }
      el = el.parentElement;
    }
    // For other clickable things, try to get text
    const text = (target.textContent || '').trim().slice(0, 60);
    if (text) lastClickedButton = text;
  }, true);
}

// ── Flush logs to backend ────────────────────────────────────────
const flushLogs = async () => {
  if (logBuffer.length === 0) return;
  const items = [...logBuffer];
  logBuffer.length = 0;

  try {
    const userStr = localStorage.getItem('user');
    let userEmail = '';
    let userName = '';
    let userRole = '';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        userEmail = u.email || '';
        userName = u.name || u.email || '';
        userRole = u.role || '';
      } catch (e) {
        // Ignore parse error
      }
    }

    const payload = items.map(item => ({
      ...item,
      userEmail: item.userEmail || userEmail,
      userName: item.userName || userName,
      userRole: item.userRole || userRole,
    }));

    await api.post('/system/logs', payload);
  } catch (err) {
    // Avoid infinite loop if logging fails
    console.warn('[AuditLogger] Failed to dispatch logs:', err);
  }
};

export const recordLog = (payload: LogPayload) => {
  // Automatically enrich every log with page, button, time, and console
  const enrichedDetails = {
    ...(typeof payload.details === 'object' && payload.details ? payload.details : {}),
    page: getCurrentPageName(),
    button: lastClickedButton || '—',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    console: getRecentConsoleMessages().slice(-5).join('\n') || 'No console messages',
  };

  // If details was a string, preserve it as 'reason'
  if (payload.details && typeof payload.details === 'string') {
    (enrichedDetails as any).reason = payload.details;
  }

  logBuffer.push({ ...payload, details: enrichedDetails });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushLogs, 1500);
};

export const logUserAction = (feature: string, action: string, details?: any) => {
  recordLog({ logType: 'ACTION', feature, action, details });
};

export const logUserError = (feature: string, action: string, details?: any) => {
  recordLog({ logType: 'ERROR', feature, action, details });
};

export const logPermissionError = (feature: string, action: string, details?: any) => {
  recordLog({ logType: 'PERMISSION', feature, action, details });
};

// Setup global error listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logUserError('App Error', `Something went wrong on the page. The app encountered an unexpected error.`, {
      reason: event.message || 'Unknown error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'object' && reason ? (reason.message || 'Unknown') : String(reason);
    logUserError('App Error', `A background operation failed unexpectedly. Reason: ${msg}`, {
      reason: msg,
    });
  });
}
