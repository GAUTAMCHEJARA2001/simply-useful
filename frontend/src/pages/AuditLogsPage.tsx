import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Activity, AlertTriangle, ShieldAlert, CheckCircle, Search, RefreshCw, 
  Trash2, Download, Filter, UserCheck, Eye, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

export interface AuditLogItem {
  id: string;
  companyId?: string;
  userEmail: string;
  userName: string;
  userRole: string;
  logType: 'ACTION' | 'ERROR' | 'PERMISSION' | 'WARN';
  feature: string;
  action: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

const typeStyles: Record<string, string> = {
  ERROR: 'bg-red-500/10 text-red-600 border-red-500/20 font-bold',
  PERMISSION: 'bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold',
  ACTION: 'bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold',
  WARN: 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold',
};

const typeIcons: Record<string, any> = {
  ERROR: AlertTriangle,
  PERMISSION: ShieldAlert,
  ACTION: Activity,
  WARN: AlertTriangle,
};

export const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [logTypeFilter, setLogTypeFilter] = useState<string>('ALL');
  const [featureFilter, setFeatureFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['audit-logs', logTypeFilter, featureFilter, searchTerm, startDate, endDate, page],
    queryFn: async () => {
      const params: any = { page, limit: 100 };
      if (logTypeFilter !== 'ALL') params.logType = logTypeFilter;
      if (featureFilter !== 'ALL') params.feature = featureFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/system/logs/list', { params });
      return res.data?.data || { logs: [], meta: { total: 0, pages: 1 } };
    },
    enabled: isSuperAdmin,
  });

  const logs: AuditLogItem[] = data?.logs || [];
  const meta = data?.meta || { total: 0, pages: 1 };

  // Calculate quick summary metrics
  const metrics = useMemo(() => {
    let errors = 0;
    let permissions = 0;
    let actions = 0;
    const uniqueUsers = new Set<string>();

    logs.forEach(l => {
      if (l.userEmail) uniqueUsers.add(l.userEmail);
      if (l.logType === 'ERROR') errors++;
      else if (l.logType === 'PERMISSION') permissions++;
      else if (l.logType === 'ACTION') actions++;
    });

    return {
      totalLogs: meta.total || logs.length,
      errors,
      permissions,
      actions,
      usersCount: uniqueUsers.size,
    };
  }, [logs, meta]);

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear audit logs? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete('/system/logs/clear');
      toast({ title: 'Logs Cleared', description: 'All activity and error logs have been reset.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Clear Failed', description: err.message || 'Failed to clear logs', variant: 'destructive' });
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User Name', 'User Email', 'Role', 'Log Type', 'Feature', 'Action', 'IP Address'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleString(),
      `"${l.userName || ''}"`,
      `"${l.userEmail || ''}"`,
      l.userRole,
      l.logType,
      `"${l.feature || ''}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      l.ipAddress || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-header">Activity Log</h1>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
              Super Admin Only
            </span>
          </div>
          <p className="page-subheader">
            See what every user is doing — who created, edited, or deleted records, and any issues that occurred
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          {user?.role === 'SUPERADMIN' && (
            <Button variant="destructive" size="sm" onClick={handleClearLogs} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear Logs
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Activities', value: metrics.totalLogs, icon: Activity, color: 'bg-primary/10 text-primary' },
          { label: 'Errors Found', value: metrics.errors, icon: AlertTriangle, color: 'bg-red-500/10 text-red-600' },
          { label: 'Access Denied', value: metrics.permissions, icon: ShieldAlert, color: 'bg-orange-500/10 text-orange-600' },
          { label: 'Active Users', value: metrics.usersCount, icon: UserCheck, color: 'bg-green-500/10 text-green-600' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${kpi.color} flex items-center justify-center shrink-0`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search action, email, error..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Log Type Filter */}
            <Select value={logTypeFilter} onValueChange={val => { setLogTypeFilter(val); setPage(1); }}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Filter by Severity / Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="ERROR">🔥 Errors</SelectItem>
                <SelectItem value="PERMISSION">🛡️ Access Denied</SelectItem>
                <SelectItem value="ACTION">⚡ User Activities</SelectItem>
                <SelectItem value="WARN">⚠️ Warnings</SelectItem>
              </SelectContent>
            </Select>

            {/* Feature Filter */}
            <Select value={featureFilter} onValueChange={val => { setFeatureFilter(val); setPage(1); }}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Filter by Feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sections</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Purchases">Purchases</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Products">Products</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Recipes">Recipes (BOM)</SelectItem>
                <SelectItem value="User Management">Users</SelectItem>
                <SelectItem value="Dealers">Dealers</SelectItem>
                <SelectItem value="Suppliers">Suppliers</SelectItem>
                <SelectItem value="CRM">CRM & Leads</SelectItem>
                <SelectItem value="App Error">App Errors</SelectItem>
              </SelectContent>
            </Select>

            {/* Start Date */}
            <Input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="text-xs"
            />

            {/* End Date */}
            <Input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Activity Log
            </CardTitle>
            <CardDescription className="text-xs">Page {page} of {meta.pages || 1} — {meta.total || logs.length} records</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span>Fetching audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic text-sm">
              No audit logs found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground font-bold">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Who</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">What Happened</th>
                    <th className="px-4 py-3 text-right">More</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logs.map((log) => {
                    const IconComp = typeIcons[log.logType] || Activity;
                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                          {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{log.userName || log.userEmail}</span>
                            <span className="text-[10px] text-muted-foreground">{log.userRole}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${typeStyles[log.logType] || typeStyles.ACTION}`}>
                            <IconComp className="w-3 h-3" />
                            {log.logType === 'ACTION' ? 'Activity' : log.logType === 'ERROR' ? 'Error' : log.logType === 'PERMISSION' ? 'Access Denied' : 'Warning'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {log.feature}
                        </td>
                        <td className="px-4 py-3 max-w-[350px]" title={log.action}>
                          <span className="text-foreground font-medium">{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.pages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {meta.pages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.pages}
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-primary" /> Activity Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Full information about this activity
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* WHO & WHEN */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border border-border">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-0.5">👤 User</p>
                  <p className="font-semibold">{selectedLog.userName}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-0.5">🏷️ Role</p>
                  <p className="font-semibold">{selectedLog.userRole}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-0.5">📅 Date & Time</p>
                  <p className="font-semibold">{new Date(selectedLog.createdAt).toLocaleDateString()} {new Date(selectedLog.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-0.5">🔖 Type</p>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${typeStyles[selectedLog.logType]}`}>
                    {selectedLog.logType === 'ACTION' ? '✅ Activity' : selectedLog.logType === 'ERROR' ? '❌ Error' : selectedLog.logType === 'PERMISSION' ? '🚫 Access Denied' : '⚠️ Warning'}
                  </span>
                </div>
              </div>

              {/* WHAT HAPPENED */}
              <div>
                <p className="font-bold text-foreground mb-1.5">📝 What Happened:</p>
                <p className="bg-card p-3 rounded-md border border-border text-foreground text-sm">{selectedLog.action}</p>
              </div>

              {/* PAGE, BUTTON, TIME — extracted from details */}
              {(() => {
                let d: any = {};
                try {
                  d = typeof selectedLog.details === 'object' && selectedLog.details
                    ? selectedLog.details
                    : (selectedLog.details ? JSON.parse(selectedLog.details) : {});
                } catch { d = {}; }

                const page = d.page || '—';
                const button = d.button || '—';
                const time = d.time || '—';
                const consoleText = d.console || '';
                const reason = d.reason || '';

                // Collect remaining details (excluding the known keys)
                const knownKeys = new Set(['page', 'button', 'time', 'console', 'reason']);
                const otherEntries = Object.entries(d).filter(([k]) => !knownKeys.has(k));

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-blue-600 mb-0.5">📄 Page</p>
                        <p className="font-semibold text-foreground text-sm">{page}</p>
                      </div>
                      <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-purple-600 mb-0.5">🖱️ Button Clicked</p>
                        <p className="font-semibold text-foreground text-sm">{button}</p>
                      </div>
                      <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-green-600 mb-0.5">🕐 Exact Time</p>
                        <p className="font-semibold text-foreground text-sm">{time}</p>
                      </div>
                    </div>

                    {reason && (
                      <div>
                        <p className="font-bold text-foreground mb-1.5">💡 Reason:</p>
                        <p className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-md text-foreground text-sm">{reason}</p>
                      </div>
                    )}

                    {otherEntries.length > 0 && (
                      <div>
                        <p className="font-bold text-foreground mb-1.5">ℹ️ Other Details:</p>
                        <div className="bg-muted/50 p-3 rounded-md border border-border text-sm space-y-1">
                          {otherEntries.map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-semibold text-muted-foreground capitalize min-w-[100px]">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-foreground">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {consoleText && consoleText !== 'No console messages' && (
                      <div>
                        <p className="font-bold text-foreground mb-1.5">🖥️ Console Messages (at that time):</p>
                        <div className="bg-slate-100 dark:bg-slate-900 border border-border rounded-lg p-3 text-xs space-y-0.5 max-h-[200px] overflow-y-auto">
                          {consoleText.split('\n').filter(Boolean).map((line: string, i: number) => (
                            <div key={i} className={`py-0.5 ${line.includes('error') ? 'text-red-600 font-semibold' : line.includes('warn') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {selectedLog.ipAddress && (
              <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                IP Address: {selectedLog.ipAddress}
              </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AuditLogsPage;
