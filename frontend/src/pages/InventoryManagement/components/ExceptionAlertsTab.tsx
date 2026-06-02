import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, Info, 
  UserCheck, AlertCircle, HelpCircle, Loader2,
  Calendar, Check, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const severityStyles: Record<string, { bg: string, text: string, border: string, icon: any }> = {
  CRITICAL: { bg: 'bg-rose-500/10 dark:bg-rose-500/5', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20 dark:border-rose-500/10', icon: ShieldAlert },
  WARNING: { bg: 'bg-amber-500/10 dark:bg-amber-500/5', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20 dark:border-amber-500/10', icon: AlertTriangle },
  INFO: { bg: 'bg-blue-500/10 dark:bg-blue-500/5', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20 dark:border-blue-500/10', icon: Info }
};

export const ExceptionAlertsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  // Fetch open and acknowledged alerts
  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: async () => {
      const res = await api.get('/analytics/alerts');
      return res.data?.data || res.data || [];
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Action mutation (Acknowledge / Resolve)
  const actionMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string, status: string, note?: string }) => {
      const res = await api.post(`/analytics/alerts/${id}/action`, {
        status,
        resolution_note: note
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === 'Acknowledged' ? "Alert Acknowledged" : "Alert Resolved",
        description: `Operational exception successfully marked as ${variables.status.toLowerCase()}.`,
        variant: "default",
      });
      // Invalidate alerts query
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      setIsResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNote('');
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err?.response?.data?.message || err?.message || "Failed to update alert state.",
        variant: "destructive",
      });
    }
  });

  const handleAcknowledge = (id: string) => {
    actionMutation.mutate({ id, status: 'Acknowledged' });
  };

  const openResolveDialog = (alert: any) => {
    setSelectedAlert(alert);
    setResolutionNote('');
    setIsResolveDialogOpen(true);
  };

  const handleResolve = () => {
    if (!selectedAlert) return;
    if (!resolutionNote.trim()) {
      toast({
        title: "Resolution Note Required",
        description: "Please specify why this exception is resolved or what action was taken.",
        variant: "destructive",
      });
      return;
    }
    actionMutation.mutate({
      id: selectedAlert.id,
      status: 'Resolved',
      note: resolutionNote
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce" />
          Exception Governance Center
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Active operational anomalies requiring administrative review & tracking.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Scanning Star Schema anomaly engine...</span>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Failed to load exceptions</span>
            <p className="mt-1">Anomaly scan pipeline encountered an operational error. Please trigger rebuilding warehouse above.</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 p-8 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full animate-pulse">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-black mt-2">Zero Active Exceptions</h3>
          <p className="text-xs max-w-sm text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
            Congratulations! All operational metrics (logistics TATs, sales officer budgets, safety stocks, and CRM leads) are operating well within established thresholds.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert: any) => {
              const style = severityStyles[alert.severity] || severityStyles.INFO;
              const SeverityIcon = style.icon;
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 border rounded-3xl bg-gradient-to-br ${style.bg} ${style.border} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-border/5 group`}
                >
                  <div className="flex gap-4 items-start sm:items-center">
                    <div className={`p-3 rounded-2xl bg-card border ${style.border} ${style.text} shadow-sm shrink-0`}>
                      <SeverityIcon className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${style.text} bg-card border ${style.border}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {alert.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Logged: {alert.created_at}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground mt-2 leading-snug">
                        {alert.resolution_note}
                      </p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground/80 mt-1.5 flex-wrap">
                        <span>Target Threshold: {alert.threshold}</span>
                        <span>&middot;</span>
                        <span className="font-bold">Current Metric Value: {alert.metric_value}</span>
                        {alert.status === 'Acknowledged' && (
                          <>
                            <span>&middot;</span>
                            <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                              <UserCheck className="w-3.5 h-3.5" /> Acknowledged State
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Controls */}
                  <div className="flex gap-2 self-stretch sm:self-center shrink-0 items-center justify-end sm:justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-border/10">
                    {alert.status === 'Open' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={actionMutation.isPending}
                        className="rounded-xl text-xs font-bold gap-1 h-9 hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Acknowledge
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => openResolveDialog(alert)}
                      disabled={actionMutation.isPending}
                      className="rounded-xl text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve Anomaly
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Resolution Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Resolve Operational Anomaly
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Document what corrective operational intervention was applied to close this anomaly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            {selectedAlert && (
              <div className="p-3.5 bg-muted/50 rounded-2xl border text-xs leading-relaxed">
                <span className="font-bold block mb-1 text-muted-foreground uppercase tracking-widest text-[9px]">Logged Exception:</span>
                <span className="font-bold text-foreground">{selectedAlert.resolution_note}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Operational Resolution Note:</label>
              <textarea 
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Specify details, e.g. 'Safety stock replenished from supplier PO #1002' or 'Audit complete, Sales Officer claim verified.'"
                rows={3}
                className="w-full p-3 text-xs bg-card border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsResolveDialogOpen(false)}
              className="rounded-xl text-xs font-bold h-10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={actionMutation.isPending}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 gap-1.5"
            >
              {actionMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
