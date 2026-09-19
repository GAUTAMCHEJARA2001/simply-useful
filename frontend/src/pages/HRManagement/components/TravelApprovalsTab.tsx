import React, { useState, useEffect } from 'react';
import { travelService, DailyTravelLogItem } from '@/api/services/travel.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Gauge, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Camera, 
  Filter, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit3, 
  ArrowRight, 
  AlertTriangle,
  Bike,
  Car,
  Store,
  IndianRupee,
  ShoppingBag,
  FileText,
  Award,
  Target,
  Compass
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const TravelApprovalsTab: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DailyTravelLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected for verification dialog
  const [selectedLog, setSelectedLog] = useState<DailyTravelLogItem | null>(null);
  const [approvedKm, setApprovedKm] = useState<string>('');
  const [hrNotes, setHrNotes] = useState<string>('');
  const [savingAction, setSavingAction] = useState(false);

  // Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedMonth) params.month = selectedMonth;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await travelService.getHRLogs(params);
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch HR travel logs:', err);
      toast({ title: 'Failed to load travel logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMonth, statusFilter]);

  const openVerifyDialog = (log: DailyTravelLogItem) => {
    setSelectedLog(log);
    setApprovedKm(String(log.approved_km !== null && log.approved_km !== undefined ? log.approved_km : log.total_km));
    setHrNotes(log.hr_notes || '');
  };

  const handleVerify = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedLog) return;

    if (action === 'APPROVE') {
      if (!approvedKm || isNaN(Number(approvedKm)) || Number(approvedKm) < 0) {
        toast({ title: 'Invalid Approved KM', description: 'Please enter a valid approved distance', variant: 'destructive' });
        return;
      }
    }

    try {
      setSavingAction(true);
      await travelService.verifyLog(selectedLog.id, {
        action,
        approved_km: action === 'APPROVE' ? Number(approvedKm) : undefined,
        hr_notes: hrNotes,
      });

      toast({
        title: action === 'APPROVE' ? 'Travel Approved & Synced' : 'Travel Rejected',
        description: action === 'APPROVE' 
          ? `${approvedKm} KM approved and synced to Daily Attendance for payroll`
          : 'Record marked as rejected',
      });

      setSelectedLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err.response?.data?.message || 'Server error',
        variant: 'destructive',
      });
    } finally {
      setSavingAction(false);
    }
  };

  // Filtered in memory by search query
  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.user_name.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q)
    );
  });

  // KPI stats
  const totalPending = logs.filter(l => l.status === 'PENDING').length;
  const totalApproved = logs.filter(l => l.status === 'APPROVED').length;
  const totalKmApproved = logs.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + (l.approved_km || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{totalPending}</h3>
            </div>
            <div className="p-3 bg-amber-500/15 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved Records</p>
              <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{totalApproved}</h3>
            </div>
            <div className="p-3 bg-emerald-500/15 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Total Approved KM</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{totalKmApproved.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">KM</span></h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Gauge className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="w-4 h-4" /> Filter:
              </div>

              {/* Month selector */}
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-background"
              />

              {/* Status tabs */}
              <div className="flex items-center border rounded-lg overflow-hidden text-xs">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-3 py-1.5 transition-colors font-medium",
                      statusFilter === st ? "bg-primary text-white" : "hover:bg-muted"
                    )}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search Sales Officer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Sales Officer Travel Submissions</CardTitle>
            <CardDescription className="text-xs">
              Verify start &amp; end odometer readings, adjust KM if needed, and push to payroll
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading travel records...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No travel logs found for the selected month/filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Sales Officer</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Start KM</th>
                    <th className="px-4 py-3 font-semibold">End KM</th>
                    <th className="px-4 py-3 font-semibold">Distance</th>
                    <th className="px-4 py-3 font-semibold">Approved KM</th>
                    <th className="px-4 py-3 font-semibold">Photos</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">HR Note</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {item.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{item.user_name}</div>
                        <div className="text-[11px] text-muted-foreground">{item.user_email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {item.vehicle_type === 'CAR' ? '🚗 Car' : '🏍️ Bike'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {item.start_km}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {item.end_km !== null ? item.end_km : <span className="text-amber-500 italic">In progress</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold">
                        {item.total_km} KM
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-black">
                        {item.status === 'APPROVED' ? (
                          <span className={item.approved_km !== item.total_km ? 'text-amber-600' : 'text-emerald-600'}>
                            {item.approved_km} KM
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {item.start_photo && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(item.start_photo || null)}
                              className="w-7 h-7 rounded border overflow-hidden hover:opacity-80 transition-opacity"
                              title="Start Meter Photo"
                            >
                              <img src={item.start_photo} alt="Start" className="w-full h-full object-cover" />
                            </button>
                          )}
                          {item.end_photo && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(item.end_photo || null)}
                              className="w-7 h-7 rounded border border-amber-400 overflow-hidden hover:opacity-80 transition-opacity"
                              title="End Meter Photo"
                            >
                              <img src={item.end_photo} alt="End" className="w-full h-full object-cover" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge 
                          variant={item.status === 'APPROVED' ? 'default' : item.status === 'REJECTED' ? 'destructive' : 'secondary'}
                          className={cn(
                            "text-[11px] font-medium",
                            item.status === 'APPROVED' && "bg-emerald-600 text-white",
                            item.status === 'PENDING' && "bg-amber-500/15 text-amber-700 border-amber-300"
                          )}
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={item.hr_notes || ''}>
                        {item.hr_notes || '--'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button 
                          size="sm" 
                          variant={item.status === 'PENDING' ? 'default' : 'outline'}
                          className="h-8 text-xs font-semibold"
                          onClick={() => openVerifyDialog(item)}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          {item.status === 'PENDING' ? 'Verify / Approve' : 'Correct / Review'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VERIFY & CORRECT MODAL */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                <span>Verify Travel Log: {selectedLog?.user_name}</span>
              </DialogTitle>
              {selectedLog?.performance_rating && selectedLog.performance_rating !== 'PENDING' && (
                <Badge 
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5",
                    selectedLog.performance_rating === 'OUTSTANDING' && "bg-emerald-600 text-white",
                    selectedLog.performance_rating === 'TARGET_ACHIEVED' && "bg-blue-600 text-white",
                    selectedLog.performance_rating === 'PARTIAL' && "bg-amber-500 text-white",
                    selectedLog.performance_rating === 'UNDERPERFORMED' && "bg-rose-600 text-white"
                  )}
                >
                  {selectedLog.performance_rating} ({selectedLog.target_achievement_pct}%)
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Date: {selectedLog?.date} &middot; Vehicle: {selectedLog?.vehicle_type}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              {/* Photos Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Start Meter ({selectedLog.start_km} KM)</span>
                  {selectedLog.start_photo ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(selectedLog.start_photo || null)}
                      className="w-full h-36 rounded-xl overflow-hidden border block hover:opacity-90 transition-opacity bg-black/5"
                    >
                      <img src={selectedLog.start_photo} alt="Start Meter" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-36 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No Photo
                    </div>
                  )}
                  {selectedLog.start_time && (
                    <p className="text-[11px] text-muted-foreground">
                      Time: {new Date(selectedLog.start_time).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">End Meter ({selectedLog.end_km ?? '--'} KM)</span>
                  {selectedLog.end_photo ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(selectedLog.end_photo || null)}
                      className="w-full h-36 rounded-xl overflow-hidden border block hover:opacity-90 transition-opacity bg-black/5"
                    >
                      <img src={selectedLog.end_photo} alt="End Meter" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-36 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No Photo
                    </div>
                  )}
                  {selectedLog.end_time && (
                    <p className="text-[11px] text-muted-foreground">
                      Time: {new Date(selectedLog.end_time).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Submissions summary */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl border text-center text-xs">
                <div>
                  <span className="text-muted-foreground">Start KM:</span>
                  <div className="font-bold text-sm">{selectedLog.start_km}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">End KM:</span>
                  <div className="font-bold text-sm">{selectedLog.end_km ?? '--'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Claimed Total:</span>
                  <div className="font-black text-sm text-primary">{selectedLog.total_km} KM</div>
                </div>
              </div>

              {/* Tour Plan Targets Fulfillment Summary */}
              {((selectedLog.total_stops_planned || 0) > 0 || (selectedLog.total_target_bags || 0) > 0 || (selectedLog.total_target_collection || 0) > 0) && (
                <div className="p-3 rounded-xl border bg-purple-50/30 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-purple-600" /> Tour Plan vs Actual Targets
                    </span>
                    <span className="text-[11px] font-semibold">
                      Day Score: {selectedLog.target_achievement_pct || 0}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/70 dark:bg-purple-900/40 p-2 rounded-lg border border-purple-100 dark:border-purple-800">
                      <span className="text-muted-foreground text-[10px]">Stops Visited</span>
                      <div className="font-bold text-xs">{selectedLog.total_stops_visited || 0} / {selectedLog.total_stops_planned || 0}</div>
                    </div>
                    <div className="bg-white/70 dark:bg-purple-900/40 p-2 rounded-lg border border-purple-100 dark:border-purple-800">
                      <span className="text-muted-foreground text-[10px]">Bags Booked</span>
                      <div className="font-bold text-xs text-purple-600">{selectedLog.total_actual_bags || 0} / {selectedLog.total_target_bags || 0}</div>
                    </div>
                    <div className="bg-white/70 dark:bg-purple-900/40 p-2 rounded-lg border border-purple-100 dark:border-purple-800">
                      <span className="text-muted-foreground text-[10px]">Collection</span>
                      <div className="font-bold text-xs text-emerald-600">₹{Number(selectedLog.total_actual_collection || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Planned vs Actual Stops Table */}
                  {selectedLog.stops && selectedLog.stops.length > 0 && (
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-muted/40 font-semibold text-muted-foreground border-b text-[10px]">
                          <tr>
                            <th className="px-2.5 py-1">Dealer</th>
                            <th className="px-2.5 py-1">Target</th>
                            <th className="px-2.5 py-1">Actual</th>
                            <th className="px-2.5 py-1">Status / Shortfall</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedLog.stops.map((s, idx) => (
                            <tr key={idx} className="hover:bg-muted/10">
                              <td className="px-2.5 py-1.5 font-medium">
                                {s.dealer_name}
                                {s.is_unplanned && <span className="ml-1 text-[9px] text-blue-600 font-bold">(Spot)</span>}
                              </td>
                              <td className="px-2.5 py-1.5 text-muted-foreground">
                                {(s.target_order_bags || 0) > 0 && <div>{s.target_order_bags} bags</div>}
                                {(s.target_collection_value || 0) > 0 && <div>₹{Number(s.target_collection_value).toLocaleString('en-IN')}</div>}
                                {!(s.target_order_bags || 0) && !(s.target_collection_value || 0) && '--'}
                              </td>
                              <td className="px-2.5 py-1.5 font-bold">
                                {(s.actual_order_bags || 0) > 0 && <div className="text-purple-600">{s.actual_order_bags} bags</div>}
                                {(s.actual_collection_value || 0) > 0 && <div className="text-emerald-600">₹{Number(s.actual_collection_value).toLocaleString('en-IN')}</div>}
                                {!(s.actual_order_bags || 0) && !(s.actual_collection_value || 0) && 'Nil'}
                              </td>
                              <td className="px-2.5 py-1.5">
                                <span className="text-[10px] font-semibold block">{s.actual_status}</span>
                                {s.shortfall_reason && <span className="text-[10px] text-muted-foreground italic">{s.shortfall_reason}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sales Officer 3 Activity Summaries */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sales Officer Activity Punch
                </p>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 mb-1">
                      <Store className="w-3.5 h-3.5" />
                      <span>Daily Visit Summary:</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 pl-5">
                      {selectedLog.visit_summary || 'N/A'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Payment Collection:</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 pl-5">
                      {selectedLog.collection_summary || 'Nil'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 mb-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order Summary:</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 pl-5">
                      {selectedLog.order_summary || 'Nil'}
                    </p>
                  </div>
                </div>

                {selectedLog.so_notes && (
                  <div className="p-2 rounded-lg bg-muted/30 border text-xs">
                    <span className="font-semibold text-muted-foreground">Route Notes / Remarks:</span> {selectedLog.so_notes}
                  </div>
                )}
              </div>

              {/* Correction Input */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="approvedKm" className="text-xs font-bold text-foreground">
                    Approved KM for Payroll Calculation *
                  </Label>
                  {Number(approvedKm) !== selectedLog.total_km && (
                    <span className="text-xs text-amber-600 font-semibold">
                      (Corrected from {selectedLog.total_km} KM)
                    </span>
                  )}
                </div>
                <Input
                  id="approvedKm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={approvedKm}
                  onChange={(e) => setApprovedKm(e.target.value)}
                  className="font-bold text-base"
                />
                <p className="text-[11px] text-muted-foreground">
                  This distance will be recorded into the employee's Daily Attendance and multiplied by their allowance rate in payroll.
                </p>
              </div>

              {/* HR Note */}
              <div className="space-y-2">
                <Label htmlFor="hrNotes" className="text-xs font-semibold">
                  HR Note / Reason for Correction (Visible to SO)
                </Label>
                <Textarea
                  id="hrNotes"
                  placeholder="e.g. Verified odometer photo. Deducted 5 km for private detour."
                  rows={2}
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
            <Button
              variant="destructive"
              onClick={() => handleVerify('REJECT')}
              disabled={savingAction}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reject
            </Button>
            <Button
              onClick={() => handleVerify('APPROVE')}
              disabled={savingAction || !approvedKm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve &amp; Sync to Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-0">
          <DialogHeader className="p-2">
            <DialogTitle className="text-white text-sm">Meter Photo</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center max-h-[80vh]">
              <img src={previewImage} alt="Meter Preview" className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelApprovalsTab;
