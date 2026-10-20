import React, { useState, useEffect, useRef, useMemo } from 'react';
import { travelService, DailyTravelLogItem } from '@/api/services/travel.service';
import { useHRUsers, useHREmployees } from '@/hooks/hr/useHR';
import { SmartDatePicker } from '@/components/ui/SmartDatePicker';
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
  Compass,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Check,
  X,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from '@/components/ImageViewerModal';

export const TravelApprovalsTab: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DailyTravelLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Users for manual entry selection
  const { data: users = [] } = useHRUsers();
  const { data: employees = [] } = useHREmployees();

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

  // Selected for Admin Edit / In-Progress Completion dialog
  const [editingLog, setEditingLog] = useState<DailyTravelLogItem | null>(null);
  const [editStartKm, setEditStartKm] = useState<string>('');
  const [editEndKm, setEditEndKm] = useState<string>('');
  const [editTotalKm, setEditTotalKm] = useState<string>('');
  const [editApprovedKm, setEditApprovedKm] = useState<string>('');
  const [editVehicleType, setEditVehicleType] = useState<'BIKE' | 'CAR' | 'OTHER'>('BIKE');
  const [editStatus, setEditStatus] = useState<'APPROVED' | 'PENDING' | 'REJECTED'>('APPROVED');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Manual Trip Creation Dialog (For SO field network issues)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [soSearchQuery, setSoSearchQuery] = useState('');
  const [soDropdownOpen, setSoDropdownOpen] = useState(false);
  const [onlyEligibleFilter, setOnlyEligibleFilter] = useState(true);
  const soDropdownRef = useRef<HTMLDivElement>(null);

  // Close SO dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (soDropdownRef.current && !soDropdownRef.current.contains(event.target as Node)) {
        setSoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered & mapped Travel-Eligible Sales Officers list
  const eligibleOfficers = useMemo(() => {
    return users.map((u: any) => {
      const emp = employees.find((e: any) => 
        (e.user_id && e.user_id === u.id) ||
        (e.contactinfo && u.email && e.contactinfo.toLowerCase().includes(u.email.toLowerCase())) ||
        (e.name && u.name && e.name.trim().toLowerCase() === u.name.trim().toLowerCase())
      );

      const roleUpper = (u.role || '').toUpperCase();
      const isSalesRole = roleUpper === 'SALES' || roleUpper === 'SO' || roleUpper === 'SALES_OFFICER' || roleUpper === 'SALES OFFICER';
      const isKmEligible = emp ? (
        emp.is_km_eligible === true ||
        (Number(emp.bike_allowance_per_km || 0) > 0) ||
        (Number(emp.car_allowance_per_km || 0) > 0) ||
        (emp.department || '').toUpperCase().includes('SALES') ||
        (emp.designation || '').toUpperCase().includes('SALES')
      ) : false;

      // An SO user with travel allowance eligibility:
      const isEligible = isSalesRole || isKmEligible;

      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role || 'SALES',
        department: emp?.department || (isSalesRole ? 'SALES' : 'STAFF'),
        designation: emp?.designation || (isSalesRole ? 'SALES OFFICER' : (u.role || 'STAFF')),
        is_km_eligible: emp?.is_km_eligible ?? isEligible,
        bike_rate: emp?.bike_allowance_per_km || 3.0,
        car_rate: emp?.car_allowance_per_km || 8.0,
        labour_id: emp?.id,
        isEligible,
      };
    });
  }, [users, employees]);

  const searchedOfficers = useMemo(() => {
    let list = eligibleOfficers;
    if (onlyEligibleFilter) {
      list = list.filter(o => o.isEligible);
    }
    if (!soSearchQuery.trim()) return list;
    const q = soSearchQuery.toLowerCase().trim();
    return list.filter(o => 
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.designation && o.designation.toLowerCase().includes(q))
    );
  }, [eligibleOfficers, onlyEligibleFilter, soSearchQuery]);

  const selectedOfficer = useMemo(() => {
    return eligibleOfficers.find(o => o.id === manualUserId);
  }, [eligibleOfficers, manualUserId]);

  const [manualDate, setManualDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [manualVehicleType, setManualVehicleType] = useState<'BIKE' | 'CAR'>('BIKE');
  const [manualStartKm, setManualStartKm] = useState('');
  const [manualEndKm, setManualEndKm] = useState('');
  const [manualTotalKm, setManualTotalKm] = useState('');
  const [manualApprovedKm, setManualApprovedKm] = useState('');
  const [manualAdminNotes, setManualAdminNotes] = useState('SO faced network connectivity issue on field. Travel entry recorded & approved by Admin.');
  const [savingManual, setSavingManual] = useState(false);

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

  const openEditDialog = (log: DailyTravelLogItem) => {
    setEditingLog(log);
    const start = String(log.start_km ?? 0);
    const end = log.end_km !== null && log.end_km !== undefined ? String(log.end_km) : '';
    setEditStartKm(start);
    setEditEndKm(end);
    setEditTotalKm(String(log.total_km ?? 0));
    setEditApprovedKm(String(log.approved_km !== null && log.approved_km !== undefined ? log.approved_km : (log.total_km || '')));
    setEditVehicleType(log.vehicle_type || 'BIKE');
    setEditStatus((log.status as any) || 'APPROVED');
    setEditAdminNotes(log.admin_notes || log.hr_notes || (log.end_km === null ? 'Completed trip by Admin (SO had network issue on field)' : 'Updated by Admin'));
  };

  const handleEditEndKmChange = (val: string) => {
    setEditEndKm(val);
    const s = Number(editStartKm);
    const e = Number(val);
    if (!isNaN(s) && !isNaN(e) && val !== '' && e >= s) {
      const diff = Math.max(0, Math.round((e - s) * 10) / 10);
      setEditTotalKm(String(diff));
      setEditApprovedKm(String(diff));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    if (editStartKm === '' || isNaN(Number(editStartKm)) || Number(editStartKm) < 0) {
      toast({ title: 'Invalid Start KM', description: 'Please enter a valid Start KM reading', variant: 'destructive' });
      return;
    }
    if (editEndKm === '' || isNaN(Number(editEndKm))) {
      toast({ title: 'Invalid End KM', description: 'Please enter the End KM odometer reading to complete this trip', variant: 'destructive' });
      return;
    }
    if (Number(editEndKm) < Number(editStartKm)) {
      toast({ title: 'End KM Mismatch', description: 'End KM cannot be less than Start KM', variant: 'destructive' });
      return;
    }

    try {
      setSavingEdit(true);
      await travelService.updateHRLog(editingLog.id, {
        start_km: Number(editStartKm),
        end_km: Number(editEndKm),
        total_km: editTotalKm ? Number(editTotalKm) : Math.max(0, Number(editEndKm) - Number(editStartKm)),
        approved_km: editApprovedKm ? Number(editApprovedKm) : undefined,
        vehicle_type: editVehicleType,
        status: editStatus,
        admin_notes: editAdminNotes || 'Updated by Admin (EDITED BY ADMIN)',
        hr_notes: editAdminNotes || 'Updated by Admin (EDITED BY ADMIN)',
      });

      toast({
        title: 'Trip Updated & Synced',
        description: `Travel record marked EDITED BY ADMIN with ${editApprovedKm || editTotalKm} KM approved and pushed to payroll!`,
      });
      setEditingLog(null);
      fetchLogs();
    } catch (err: any) {
      toast({
        title: 'Failed to update travel log',
        description: err.response?.data?.message || 'Server error occurred',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const openManualDialog = () => {
    setManualUserId('');
    setSoSearchQuery('');
    setSoDropdownOpen(false);
    setOnlyEligibleFilter(true);
    setManualDate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    setManualVehicleType('BIKE');
    setManualStartKm('');
    setManualEndKm('');
    setManualTotalKm('');
    setManualApprovedKm('');
    setManualAdminNotes('SO faced network connectivity issue on field. Travel entry recorded & approved by Admin.');
    setManualModalOpen(true);
  };

  const handleManualEndKmChange = (val: string) => {
    setManualEndKm(val);
    const s = Number(manualStartKm);
    const e = Number(val);
    if (!isNaN(s) && !isNaN(e) && val !== '' && e >= s) {
      const diff = Math.max(0, Math.round((e - s) * 10) / 10);
      setManualTotalKm(String(diff));
      setManualApprovedKm(String(diff));
    }
  };

  const handleSaveManual = async () => {
    if (!manualUserId) {
      toast({ title: 'Select Sales Officer', description: 'Please select an employee / Sales Officer', variant: 'destructive' });
      return;
    }
    if (!manualDate) {
      toast({ title: 'Date Required', description: 'Please choose the travel date', variant: 'destructive' });
      return;
    }
    if (manualStartKm === '' || isNaN(Number(manualStartKm)) || Number(manualStartKm) < 0) {
      toast({ title: 'Invalid Start KM', description: 'Please enter valid Start KM', variant: 'destructive' });
      return;
    }
    if (manualEndKm === '' || isNaN(Number(manualEndKm))) {
      toast({ title: 'Invalid End KM', description: 'Please enter valid End KM', variant: 'destructive' });
      return;
    }
    if (Number(manualEndKm) < Number(manualStartKm)) {
      toast({ title: 'End KM Mismatch', description: 'End KM cannot be less than Start KM', variant: 'destructive' });
      return;
    }

    try {
      setSavingManual(true);
      await travelService.createManualLog({
        user_id: manualUserId,
        labour_id: selectedOfficer?.labour_id,
        date: manualDate,
        vehicle_type: manualVehicleType,
        start_km: Number(manualStartKm),
        end_km: Number(manualEndKm),
        total_km: manualTotalKm ? Number(manualTotalKm) : Math.max(0, Number(manualEndKm) - Number(manualStartKm)),
        approved_km: manualApprovedKm ? Number(manualApprovedKm) : undefined,
        admin_notes: manualAdminNotes || 'Manual entry created by Admin (SO network issue on field)',
        hr_notes: manualAdminNotes || 'Manual entry created by Admin (SO network issue on field)',
      });

      toast({
        title: 'Manual Travel Entry Created',
        description: `Trip recorded with badge EDITED BY ADMIN and synced into monthly attendance for payroll!`,
      });
      setManualModalOpen(false);
      setManualUserId('');
      setManualStartKm('');
      setManualEndKm('');
      setManualTotalKm('');
      setManualApprovedKm('');
      fetchLogs();
    } catch (err: any) {
      toast({
        title: 'Failed to create manual entry',
        description: err.response?.data?.message || 'Server error occurred',
        variant: 'destructive',
      });
    } finally {
      setSavingManual(false);
    }
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
          ? `${approvedKm} KM approved and synced to Daily Attendance for payroll (EDITED BY ADMIN)`
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
              Verify start &amp; end odometer readings, adjust KM if needed, complete stuck trips, or add manual field logs
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={openManualDialog}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5 shadow-sm h-8"
            >
              <Plus className="w-4 h-4" /> Add Travel Log (Manual)
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
            </Button>
          </div>
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
                        {item.is_admin_edited && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[9px] px-1.5 py-0 tracking-wider uppercase shadow-xs flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              {item.is_manual_entry ? 'CREATED BY ADMIN (MANUAL)' : 'EDITED BY ADMIN'}
                            </Badge>
                            {item.edited_by_admin_name && (
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                                ({item.edited_by_admin_name})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {item.vehicle_type === 'CAR' ? '🚗 Car' : '🏍️ Bike'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {item.start_km}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.end_km !== null ? (
                          <span className="font-medium text-foreground">{item.end_km}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Clock className="w-3 h-3" /> In progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold">
                        {item.total_km} KM
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-black">
                        {item.status === 'APPROVED' ? (
                          <div>
                            <span className={item.approved_km !== item.total_km ? 'text-amber-600' : 'text-emerald-600'}>
                              {item.approved_km} KM
                            </span>
                            {item.is_admin_edited && (
                              <div className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-tight">
                                EDITED BY ADMIN
                              </div>
                            )}
                          </div>
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
                        {item.is_admin_edited && (
                          <div className="text-[10px] text-purple-700 dark:text-purple-400 font-bold mt-0.5 flex items-center gap-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" /> EDITED BY ADMIN
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={item.admin_notes || item.hr_notes || ''}>
                        {item.admin_notes || item.hr_notes || '--'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.end_km === null ? (
                            <Button 
                              size="sm" 
                              className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1"
                              onClick={() => openEditDialog(item)}
                              title="Enter End KM and complete this in-progress trip"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Complete Trip
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs font-semibold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1"
                              onClick={() => openEditDialog(item)}
                              title="Edit KM, Vehicle, or override trip"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant={item.status === 'PENDING' ? 'default' : 'ghost'}
                            className="h-8 text-xs font-semibold"
                            onClick={() => openVerifyDialog(item)}
                          >
                            {item.status === 'PENDING' ? 'Verify' : 'Review'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. ADMIN EDIT / COMPLETE IN-PROGRESS TRIP MODAL */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <span>Admin Trip Override &amp; Completion</span>
              </DialogTitle>
              <Badge className="bg-purple-600 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> EDITED BY ADMIN
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Complete trips interrupted by network issues, or correct odometer readings directly from the Admin portal.
            </DialogDescription>
          </DialogHeader>

          {editingLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Officer and Date info bar */}
              <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-foreground">{editingLog.user_name}</div>
                  <div className="text-[11px] text-muted-foreground">{editingLog.user_email}</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs">{editingLog.date}</span>
                  <div className="text-[10px] text-muted-foreground">Original Status: {editingLog.status}</div>
                </div>
              </div>

              {/* In-progress warning banner */}
              {editingLog.end_km === null && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Trip Stuck In Progress:</strong> The Sales Officer started this trip at Start KM {editingLog.start_km}, but could not complete it on the field (network issue or offline). Enter their final End KM below to complete and push to payroll.
                  </div>
                </div>
              )}

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <Label className="font-bold">Vehicle Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVehicleType('BIKE')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-semibold transition-all",
                      editVehicleType === 'BIKE' ? "bg-primary text-white border-primary" : "hover:bg-muted"
                    )}
                  >
                    <Bike className="w-4 h-4" /> 🏍️ Bike
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVehicleType('CAR')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-semibold transition-all",
                      editVehicleType === 'CAR' ? "bg-primary text-white border-primary" : "hover:bg-muted"
                    )}
                  >
                    <Car className="w-4 h-4" /> 🚗 Car
                  </button>
                </div>
              </div>

              {/* Start KM & End KM */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editStartKm" className="font-bold">Start KM *</Label>
                  <Input
                    id="editStartKm"
                    type="number"
                    step="0.1"
                    value={editStartKm}
                    onChange={(e) => {
                      setEditStartKm(e.target.value);
                      const s = Number(e.target.value);
                      const endVal = Number(editEndKm);
                      if (!isNaN(s) && !isNaN(endVal) && editEndKm !== '' && endVal >= s) {
                        const diff = Math.max(0, Math.round((endVal - s) * 10) / 10);
                        setEditTotalKm(String(diff));
                        setEditApprovedKm(String(diff));
                      }
                    }}
                    className="font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editEndKm" className="font-bold text-primary flex items-center justify-between">
                    <span>End KM *</span>
                    {editingLog.end_km === null && <span className="text-[10px] text-amber-600 font-normal">(Required)</span>}
                  </Label>
                  <Input
                    id="editEndKm"
                    type="number"
                    step="0.1"
                    placeholder="Enter end meter reading"
                    value={editEndKm}
                    onChange={(e) => handleEditEndKmChange(e.target.value)}
                    className="font-bold border-primary/50 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Distance Summary Card */}
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Calculated Distance:</span>
                  <span className="font-black text-lg text-purple-700 dark:text-purple-300">
                    {editTotalKm || '0'} <span className="text-xs font-normal">KM</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[11px] block">Approved for Salary:</span>
                  <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                    {editApprovedKm || editTotalKm || '0'} <span className="text-xs font-normal">KM</span>
                  </span>
                </div>
              </div>

              {/* Approved KM Override */}
              <div className="space-y-1.5">
                <Label htmlFor="editApprovedKm" className="font-bold flex items-center justify-between">
                  <span>Approved KM for Monthly Salary Calculation *</span>
                  <span className="text-[10px] text-muted-foreground">Syncs directly to Daily Attendance</span>
                </Label>
                <Input
                  id="editApprovedKm"
                  type="number"
                  step="0.1"
                  value={editApprovedKm}
                  onChange={(e) => setEditApprovedKm(e.target.value)}
                  className="font-bold"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="font-bold">Status</Label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-background"
                >
                  <option value="APPROVED">APPROVED (Include in Monthly Salary)</option>
                  <option value="PENDING">PENDING (Review Later)</option>
                  <option value="REJECTED">REJECTED (Exclude from Salary)</option>
                </select>
              </div>

              {/* Admin Note / Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="editAdminNotes" className="font-bold flex items-center gap-1">
                  <span>Reason for Admin Override (Audit Note)</span>
                  <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-300">EDITED BY ADMIN</Badge>
                </Label>
                <Textarea
                  id="editAdminNotes"
                  rows={2}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="e.g. Sales Officer had network issues on field. Completed trip from phone verification."
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 gap-2">
            <Button variant="ghost" onClick={() => setEditingLog(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit || !editEndKm}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Changes (EDITED BY ADMIN)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. MANUAL TRAVEL ENTRY MODAL (Network failure on field) */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Plus className="w-5 h-5 text-primary" />
                <span>Add Travel Log (Manual Entry)</span>
              </DialogTitle>
              <Badge className="bg-purple-600 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> EDITED BY ADMIN
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Record retroactive travel distance for Sales Officers unable to log via phone due to poor network or app issue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Sales Officer selection with searchable search bar & Travel Allowance filter */}
            <div className="space-y-1.5" ref={soDropdownRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="manualUserId" className="font-bold flex items-center gap-1.5">
                  <span>Select Sales Officer *</span>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 text-[9px] font-bold py-0">
                    Travel Allowance Eligible Only
                  </Badge>
                </Label>
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyEligibleFilter}
                    onChange={(e) => setOnlyEligibleFilter(e.target.checked)}
                    className="rounded border text-primary w-3 h-3 cursor-pointer"
                  />
                  <span>Only SOs</span>
                </label>
              </div>

              {/* Selected card or Search input */}
              <div className="relative">
                {!soDropdownOpen && selectedOfficer ? (
                  <div
                    onClick={() => {
                      setSoDropdownOpen(true);
                      setSoSearchQuery('');
                    }}
                    className="w-full border-2 border-primary/30 rounded-lg p-2.5 text-xs bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary text-white font-black flex items-center justify-center text-xs shadow-xs">
                        {selectedOfficer.name?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="text-sm">{selectedOfficer.name}</span>
                          <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 py-0">
                            {selectedOfficer.designation || 'Sales Officer'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{selectedOfficer.email}</span>
                          <span>&bull;</span>
                          <span className="text-primary font-medium">Bike: ₹{selectedOfficer.bike_rate}/km &middot; Car: ₹{selectedOfficer.car_rate}/km</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="text-[11px] font-medium underline">Change</span>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Type to search Sales Officer by name or email..."
                      value={soSearchQuery}
                      onChange={(e) => {
                        setSoSearchQuery(e.target.value);
                        if (!soDropdownOpen) setSoDropdownOpen(true);
                      }}
                      onFocus={() => setSoDropdownOpen(true)}
                      className="pl-9 pr-8 text-xs h-9 bg-background font-medium border-primary/40 focus-visible:ring-primary"
                      autoFocus={soDropdownOpen}
                    />
                    {soSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSoSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Dropdown Options List */}
                {soDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border-2 border-primary/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
                    <div className="p-2 border-b bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Travel-Eligible Sales Officers ({searchedOfficers.length})
                      </span>
                      <span className="text-[10px] lowercase font-normal text-muted-foreground">click to select</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y">
                      {searchedOfficers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          <div>No travel-eligible Sales Officer found matching "{soSearchQuery}".</div>
                          {onlyEligibleFilter && (
                            <button
                              type="button"
                              className="mt-1.5 text-[11px] text-primary font-bold hover:underline"
                              onClick={() => setOnlyEligibleFilter(false)}
                            >
                              Show all company users instead
                            </button>
                          )}
                        </div>
                      ) : (
                        searchedOfficers.map((officer) => {
                          const isSelected = manualUserId === officer.id;
                          return (
                            <button
                              key={officer.id}
                              type="button"
                              onClick={() => {
                                setManualUserId(officer.id);
                                setSoDropdownOpen(false);
                                setSoSearchQuery('');
                              }}
                              className={cn(
                                "w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between hover:bg-muted/60",
                                isSelected && "bg-primary/10 text-primary font-bold"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  {officer.name?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span>{officer.name}</span>
                                    <Badge variant="outline" className="text-[9px] py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 font-bold">
                                      {officer.designation || 'Sales Officer'}
                                    </Badge>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">{officer.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right text-[10px] text-muted-foreground">
                                  <div>Bike: ₹{officer.bike_rate}/km</div>
                                  <div>Car: ₹{officer.car_rate}/km</div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="p-1.5 border-t bg-muted/20 flex items-center justify-between px-3">
                      <span className="text-[10px] text-muted-foreground">
                        {onlyEligibleFilter ? 'Filtered: SO & KM Eligible Only' : 'Showing all staff'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => setSoDropdownOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date and Vehicle Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-bold">Travel Date *</Label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Vehicle Type</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualVehicleType('BIKE')}
                    className={cn(
                      "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all",
                      manualVehicleType === 'BIKE' ? "bg-primary text-white border-primary" : "hover:bg-muted"
                    )}
                  >
                    <Bike className="w-3.5 h-3.5" /> Bike
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualVehicleType('CAR')}
                    className={cn(
                      "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all",
                      manualVehicleType === 'CAR' ? "bg-primary text-white border-primary" : "hover:bg-muted"
                    )}
                  >
                    <Car className="w-3.5 h-3.5" /> Car
                  </button>
                </div>
              </div>
            </div>

            {/* Start KM and End KM */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manualStartKm" className="font-bold">Start KM *</Label>
                <Input
                  id="manualStartKm"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 181660"
                  value={manualStartKm}
                  onChange={(e) => {
                    setManualStartKm(e.target.value);
                    const s = Number(e.target.value);
                    const endVal = Number(manualEndKm);
                    if (!isNaN(s) && !isNaN(endVal) && manualEndKm !== '' && endVal >= s) {
                      const diff = Math.max(0, Math.round((endVal - s) * 10) / 10);
                      setManualTotalKm(String(diff));
                      setManualApprovedKm(String(diff));
                    }
                  }}
                  className="font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manualEndKm" className="font-bold text-primary">End KM *</Label>
                <Input
                  id="manualEndKm"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 181725"
                  value={manualEndKm}
                  onChange={(e) => handleManualEndKmChange(e.target.value)}
                  className="font-bold border-primary/50"
                />
              </div>
            </div>

            {/* Distance Summary Card */}
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">Calculated Distance:</span>
                <span className="font-black text-lg text-purple-700 dark:text-purple-300">
                  {manualTotalKm || '0'} <span className="text-xs font-normal">KM</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[11px] block">Approved for Salary:</span>
                <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                  {manualApprovedKm || manualTotalKm || '0'} <span className="text-xs font-normal">KM</span>
                </span>
              </div>
            </div>

            {/* Approved KM for Payroll */}
            <div className="space-y-1.5">
              <Label htmlFor="manualApprovedKm" className="font-bold">
                Approved KM for Monthly Salary *
              </Label>
              <Input
                id="manualApprovedKm"
                type="number"
                step="0.1"
                value={manualApprovedKm}
                onChange={(e) => setManualApprovedKm(e.target.value)}
                className="font-bold"
              />
            </div>

            {/* Admin Note */}
            <div className="space-y-1.5">
              <Label htmlFor="manualAdminNotes" className="font-bold flex items-center gap-1">
                <span>Admin Remarks / Reason</span>
                <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-300">EDITED BY ADMIN</Badge>
              </Label>
              <Textarea
                id="manualAdminNotes"
                rows={2}
                value={manualAdminNotes}
                onChange={(e) => setManualAdminNotes(e.target.value)}
                placeholder="Reason for manual entry by Admin..."
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 gap-2">
            <Button variant="ghost" onClick={() => setManualModalOpen(false)} disabled={savingManual}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveManual}
              disabled={savingManual || !manualUserId || !manualEndKm}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save &amp; Push to Payroll (EDITED BY ADMIN)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* VERIFY & CORRECT MODAL */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                <span>Verify Travel Log: {selectedLog?.user_name}</span>
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                {selectedLog?.is_admin_edited && (
                  <Badge className="bg-purple-600 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> EDITED BY ADMIN
                  </Badge>
                )}
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
            </div>
            <DialogDescription className="text-xs">
              Date: {selectedLog?.date} &middot; Vehicle: {selectedLog?.vehicle_type}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              {/* In-progress helper banner */}
              {selectedLog.end_km === null && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Trip is <strong>In Progress</strong> (SO had network issue on field).</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-7 text-xs"
                    onClick={() => {
                      const log = selectedLog;
                      setSelectedLog(null);
                      openEditDialog(log);
                    }}
                  >
                    Complete Trip Now
                  </Button>
                </div>
              )}

              {/* Admin Note if edited */}
              {selectedLog.admin_notes && (
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
                  <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1 mb-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Admin Audit / Override Note (EDITED BY ADMIN):</span>
                  </div>
                  <p className="text-foreground/90 pl-4">{selectedLog.admin_notes}</p>
                </div>
              )}

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

      {/* Zoomable Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
        title="Odometer Meter Reading Photo"
      />
    </div>
  );
};

export default TravelApprovalsTab;
