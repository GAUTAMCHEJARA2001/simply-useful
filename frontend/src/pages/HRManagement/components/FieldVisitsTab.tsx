import React, { useState, useEffect, useMemo } from 'react';
import { travelService, FieldVisitItem } from '@/api/services/travel.service';
import { useHRUsers } from '@/hooks/hr/useHR';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Store,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  Navigation,
  ExternalLink,
  Camera,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Filter,
  Sparkles,
  ChevronRight,
  List,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from '@/components/ImageViewerModal';

type DatePreset = 'ALL' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'TODAY' | 'YESTERDAY' | 'CUSTOM';
type ViewMode = 'TIMELINE' | 'FEED' | 'TABLE';

export const FieldVisitsTab: React.FC = () => {
  const [visits, setVisits] = useState<FieldVisitItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Users for SO dropdown
  const { data: users = [] } = useHRUsers();

  // Filters - Default to ALL so past visits always show on initial load
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('ALL');
  const [customDate, setCustomDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [selectedSO, setSelectedSO] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('TIMELINE');

  // Image Modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoTitle, setSelectedPhotoTitle] = useState<string>('Visit Proof Photo');

  // Eligible Sales Officers / Field Staff
  const salesOfficers = useMemo(() => {
    return users.filter(u => {
      const role = (u.role || '').toUpperCase();
      return role.includes('SO') || 
             role.includes('SALES') || 
             role.includes('MARKETING') || 
             role === 'ADMIN' || 
             role === 'SUPERADMIN';
    });
  }, [users]);

  // Compute active date parameters based on selected preset
  const dateParams = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (selectedPreset === 'ALL') {
      return {}; // No date filter: fetches all past and current visits
    }
    if (selectedPreset === 'TODAY') {
      const dStr = toYMD(today);
      return { date: dStr };
    }
    if (selectedPreset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const dStr = toYMD(y);
      return { date: dStr };
    }
    if (selectedPreset === 'LAST_7_DAYS') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      return {
        date_from: toYMD(past),
        date_to: toYMD(today)
      };
    }
    if (selectedPreset === 'LAST_30_DAYS') {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      return {
        date_from: toYMD(past),
        date_to: toYMD(today)
      };
    }
    if (selectedPreset === 'THIS_MONTH') {
      const monthStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
      return { month: monthStr };
    }
    // CUSTOM
    return { date: customDate };
  }, [selectedPreset, customDate]);

  // Fetch field visits
  const fetchVisits = async () => {
    setLoading(true);
    try {
      const params: any = { ...dateParams };
      if (selectedSO && selectedSO !== 'ALL') {
        params.user_id = selectedSO;
      }
      if (selectedPurpose && selectedPurpose !== 'ALL') {
        params.purpose = selectedPurpose;
      }
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await travelService.getFieldVisits(params);
      const data = (res as any)?.data?.data || (res as any)?.data || [];
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch field visits:', err);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [selectedPreset, customDate, selectedSO, selectedPurpose, selectedStatus]);

  // Local filtering for live search
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase().trim();
    return visits.filter(v =>
      (v.dealer_name && v.dealer_name.toLowerCase().includes(q)) ||
      (v.so_name && v.so_name.toLowerCase().includes(q)) ||
      (v.so_email && v.so_email.toLowerCase().includes(q)) ||
      (v.dealer_location && v.dealer_location.toLowerCase().includes(q)) ||
      (v.actual_notes && v.actual_notes.toLowerCase().includes(q)) ||
      (v.visit_purpose && v.visit_purpose.toLowerCase().includes(q))
    );
  }, [visits, searchQuery]);

  // Group visits by Sales Officer for Timeline View
  const groupedBySO = useMemo(() => {
    const map = new Map<string, { so_id: string; so_name: string; so_email: string; stops: FieldVisitItem[] }>();

    filteredVisits.forEach(v => {
      const key = v.so_id || v.so_email || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          so_id: v.so_id,
          so_name: v.so_name || 'Sales Officer',
          so_email: v.so_email,
          stops: []
        });
      }
      map.get(key)!.stops.push(v);
    });

    // Sort stops inside each group chronologically (stop_order ascending, then completed_at ascending)
    map.forEach(group => {
      group.stops.sort((a, b) => {
        if (a.date !== b.date) {
          return (a.date || '').localeCompare(b.date || '');
        }
        if (a.stop_order && b.stop_order) {
          return a.stop_order - b.stop_order;
        }
        const timeA = a.completed_at || a.created_at || '';
        const timeB = b.completed_at || b.created_at || '';
        return timeA.localeCompare(timeB);
      });
    });

    return Array.from(map.values());
  }, [filteredVisits]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = filteredVisits.length;
    const activeSOs = new Set(filteredVisits.map(v => v.so_id || v.so_email)).size;
    const totalBags = filteredVisits.reduce((acc, v) => acc + (Number(v.actual_order_bags) || 0), 0);
    const totalCollection = filteredVisits.reduce((acc, v) => acc + (Number(v.actual_collection_value) || 0), 0);
    const withGPS = filteredVisits.filter(v => Boolean(v.gps_location)).length;
    const gpsPercent = total > 0 ? Math.round((withGPS / total) * 100) : 0;
    const withPhoto = filteredVisits.filter(v => Boolean(v.visit_photo)).length;

    return { total, activeSOs, totalBags, totalCollection, gpsPercent, withPhoto };
  }, [filteredVisits]);

  // Helper: Format Time
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  // Helper: Format Date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr || '';
    }
  };

  // Helper: Open Google Maps
  const openGPSMap = (gpsLocation?: string | null) => {
    if (!gpsLocation) return;
    const coords = gpsLocation.trim();
    const url = `https://www.google.com/maps?q=${encodeURIComponent(coords)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper: Purpose Badge
  const renderPurposeBadge = (purpose?: string) => {
    const p = (purpose || 'ROUTINE').toUpperCase();
    if (p.includes('ORDER')) {
      return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Order Booking</Badge>;
    }
    if (p.includes('COLLECT')) {
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Payment Collection</Badge>;
    }
    if (p.includes('MEET') || p.includes('DEALER')) {
      return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Dealer Meet</Badge>;
    }
    if (p.includes('SITE') || p.includes('PROJECT')) {
      return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Site Visit</Badge>;
    }
    if (p.includes('NEW') || p.includes('ONBOARD')) {
      return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">New Counter</Badge>;
    }
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-xs">Routine Beat</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SO Field Visits & Beat Tracker</h1>
                <p className="text-xs sm:text-sm text-blue-200/80">
                  Track where Sales Officers go throughout the day, dealer visits, timestamps, orders booked & live locations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVisits}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 px-3 gap-1.5 backdrop-blur-sm"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Refresh Feed</span>
            </Button>
          </div>
        </div>

        {/* ── KEY METRICS STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-medium text-blue-200/80 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-300" />
              <span>Total Visits</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{metrics.total}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Dealer counter visits</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-medium text-blue-200/80 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>Field Officers</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{metrics.activeSOs}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Active on the beat</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-medium text-blue-200/80 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              <span>Orders Booked</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{metrics.totalBags.toLocaleString()} <span className="text-xs font-normal text-emerald-300">bags</span></div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">During field stops</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-medium text-blue-200/80 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-amber-300" />
              <span>Collections</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">₹{metrics.totalCollection.toLocaleString()}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Cheques & payments</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-blue-200/80 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-300" />
              <span>GPS Verified</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{metrics.gpsPercent}%</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">{metrics.withPhoto} photos captured</div>
          </div>
        </div>
      </div>

      {/* ── FILTER CONTROL PANEL ── */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Row 1: Date Presets & Custom Picker */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date:
              </span>
              {[
                { id: 'ALL', label: 'All Past Visits' },
                { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'CUSTOM', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id as DatePreset)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
                    selectedPreset === preset.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                >
                  {preset.label}
                </button>
              ))}

              {selectedPreset === 'CUSTOM' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-36 h-8 text-xs ml-1"
                />
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={cn(
                  "flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all",
                  viewMode === 'TIMELINE' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Grouped Chronological Timeline by SO"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Timeline by SO</span>
              </button>
              <button
                onClick={() => setViewMode('FEED')}
                className={cn(
                  "flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all",
                  viewMode === 'FEED' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Continuous Visit Feed"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Activity Feed</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={cn(
                  "flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-all",
                  viewMode === 'TABLE' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Tabular Data View"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Audit Table</span>
              </button>
            </div>
          </div>

          {/* Row 2: Dropdowns & Live Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* SO Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Sales Officer
              </label>
              <select
                value={selectedSO}
                onChange={(e) => setSelectedSO(e.target.value)}
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="ALL">All Sales Officers ({salesOfficers.length})</option>
                {salesOfficers.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.name || so.email} ({so.role || 'SO'})
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Visit Purpose
              </label>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="ALL">All Purposes</option>
                <option value="ORDER_BOOKING">Order Booking</option>
                <option value="COLLECTION">Payment Collection</option>
                <option value="DEALER_MEET">Dealer / Counter Meet</option>
                <option value="SITE_VISIT">Site Visit</option>
                <option value="NEW_COUNTER">New Counter Onboarding</option>
                <option value="ROUTINE">Routine Beat</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Visit Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Visited / Completed</option>
                <option value="UNPLANNED">Spot / Unplanned Visits</option>
                <option value="PENDING">Pending Stops</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Search Stops / Counters
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Dealer, SO, town, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── EMPTY STATE ── */}
      {!loading && filteredVisits.length === 0 && (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Field Visits Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No dealer visits or beat stops were logged matching the selected filters. Change the date or Sales Officer to see activity.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPreset('TODAY');
              setSelectedSO('ALL');
              setSelectedPurpose('ALL');
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-600">Loading field visits timeline...</p>
        </div>
      )}

      {/* ── VIEW 1: TIMELINE GROUPED BY SALES OFFICER ── */}
      {!loading && viewMode === 'TIMELINE' && groupedBySO.length > 0 && (
        <div className="space-y-6">
          {groupedBySO.map((group) => {
            const totalStops = group.stops.length;
            const bags = group.stops.reduce((acc, s) => acc + (Number(s.actual_order_bags) || 0), 0);
            const coll = group.stops.reduce((acc, s) => acc + (Number(s.actual_collection_value) || 0), 0);

            return (
              <Card key={group.so_id || group.so_email} className="shadow-sm border-slate-200 overflow-hidden">
                {/* SO Group Header */}
                <div className="bg-slate-50/80 px-4 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {group.so_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">{group.so_name}</h2>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-white text-slate-600">
                          {totalStops} {totalStops === 1 ? 'Stop' : 'Stops'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{group.so_email}</p>
                    </div>
                  </div>

                  {/* Summary Pills for SO */}
                  <div className="flex items-center gap-2.5 text-xs">
                    {bags > 0 && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium border border-emerald-100">
                        <ShoppingBag className="w-3.5 h-3.5" /> {bags} Bags
                      </span>
                    )}
                    {coll > 0 && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium border border-blue-100">
                        <IndianRupee className="w-3.5 h-3.5" /> ₹{coll.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stops Timeline */}
                <CardContent className="p-4 sm:p-6">
                  <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {group.stops.map((stop, idx) => {
                      const timeStr = formatTime(stop.completed_at || stop.created_at);
                      const isUnplanned = stop.is_unplanned;

                      return (
                        <div key={stop.id} className="relative group">
                          {/* Step Node Dot */}
                          <div
                            className={cn(
                              "absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform group-hover:scale-110",
                              stop.visited
                                ? "bg-emerald-600 text-white border-emerald-200"
                                : "bg-blue-600 text-white border-blue-200"
                            )}
                          >
                            {stop.stop_order || idx + 1}
                          </div>

                          {/* Stop Card */}
                          <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 transition-all shadow-sm hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Store className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span>{stop.dealer_name}</span>
                                  </h3>
                                  {isUnplanned && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                      Spot Visit
                                    </Badge>
                                  )}
                                  {renderPurposeBadge(stop.visit_purpose)}
                                </div>
                                {stop.dealer_location && (
                                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span>{stop.dealer_location}</span>
                                  </p>
                                )}
                              </div>

                              {/* Time & Date Badges */}
                              <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{formatDate(stop.date)}</span>
                                </span>
                                {timeStr && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    <span>{timeStr}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Commercial Results & Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Orders Booked</span>
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                  {stop.actual_order_bags > 0 ? (
                                    <span className="text-emerald-700">{stop.actual_order_bags} bags</span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">No order booked</span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Payment Collected</span>
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                                  {stop.actual_collection_value > 0 ? (
                                    <span className="text-blue-700">₹{stop.actual_collection_value.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">None</span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Visit Status</span>
                                <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="capitalize">{stop.actual_status ? stop.actual_status.toLowerCase() : 'Completed'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Remarks / Discussion Notes */}
                            {stop.actual_notes && (
                              <div className="mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
                                <span className="font-semibold text-slate-800">Visit Notes: </span>
                                {stop.actual_notes}
                              </div>
                            )}

                            {/* Footer actions: GPS location & Photo thumbnail */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              {/* GPS Checkpoint */}
                              <div className="flex items-center gap-2">
                                {stop.gps_location ? (
                                  <button
                                    onClick={() => openGPSMap(stop.gps_location)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                                  >
                                    <Navigation className="w-3 h-3 text-blue-600" />
                                    <span>Open GPS Coordinates</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-slate-300" /> No GPS tagged
                                  </span>
                                )}

                                {stop.next_visit_date && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-2">
                                    <Calendar className="w-3 h-3 text-slate-400" /> Next: {formatDate(stop.next_visit_date)}
                                  </span>
                                )}
                              </div>

                              {/* Photo Proof */}
                              {stop.visit_photo && (
                                <button
                                  onClick={() => {
                                    setSelectedPhoto(stop.visit_photo || null);
                                    setSelectedPhotoTitle(`${stop.dealer_name} - Visit Proof (${group.so_name})`);
                                  }}
                                  className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <Camera className="w-3 h-3 text-slate-600" />
                                  <span>View Photo Proof</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── VIEW 2: CONTINUOUS ACTIVITY FEED ── */}
      {!loading && viewMode === 'FEED' && filteredVisits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVisits.map((v) => {
            const timeStr = formatTime(v.completed_at || v.created_at);

            return (
              <Card key={v.id} className="shadow-sm border-slate-200 hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center">
                          {v.so_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{v.so_name}</span>
                        {v.is_unplanned && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                            Spot
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{v.dealer_name}</span>
                      </h4>
                      {v.dealer_location && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{v.dealer_location}</p>
                      )}
                    </div>

                    <div className="text-right">
                      {renderPurposeBadge(v.visit_purpose)}
                      <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{timeStr || formatDate(v.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commercial summary */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bags Booked</span>
                      <span className="font-semibold text-emerald-700">
                        {v.actual_order_bags > 0 ? `${v.actual_order_bags} bags` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Collection</span>
                      <span className="font-semibold text-blue-700">
                        {v.actual_collection_value > 0 ? `₹${v.actual_collection_value.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                      <span className="font-medium text-slate-700">{formatDate(v.date)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {v.actual_notes && (
                    <p className="text-xs text-slate-600 line-clamp-2 italic">
                      "{v.actual_notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    {v.gps_location ? (
                      <button
                        onClick={() => openGPSMap(v.gps_location)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Map Location</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No GPS</span>
                    )}

                    {v.visit_photo && (
                      <button
                        onClick={() => {
                          setSelectedPhoto(v.visit_photo || null);
                          setSelectedPhotoTitle(`${v.dealer_name} - Proof Photo`);
                        }}
                        className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Photo</span>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── VIEW 3: AUDIT TABLE VIEW ── */}
      {!loading && viewMode === 'TABLE' && filteredVisits.length > 0 && (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Sales Officer</th>
                  <th className="py-3 px-4">Dealer / Counter</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-right">Orders (Bags)</th>
                  <th className="py-3 px-4 text-right">Collection</th>
                  <th className="py-3 px-4 text-center">GPS</th>
                  <th className="py-3 px-4 text-center">Photo</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => {
                  const timeStr = formatTime(v.completed_at || v.created_at);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formatDate(v.date)}</div>
                        <div className="text-[11px] text-slate-400">{timeStr || '—'}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{v.so_name}</div>
                        <div className="text-[11px] text-slate-400">{v.so_email}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {v.dealer_name}
                        {v.is_unplanned && (
                          <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-200">
                            Spot
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{v.dealer_location || '—'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{renderPurposeBadge(v.visit_purpose)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {v.actual_order_bags > 0 ? `${v.actual_order_bags} bags` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-700">
                        {v.actual_collection_value > 0 ? `₹${v.actual_collection_value.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {v.gps_location ? (
                          <button
                            onClick={() => openGPSMap(v.gps_location)}
                            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 text-[11px] bg-blue-50 px-2 py-0.5 rounded"
                          >
                            <Navigation className="w-3 h-3" /> Map
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {v.visit_photo ? (
                          <button
                            onClick={() => {
                              setSelectedPhoto(v.visit_photo || null);
                              setSelectedPhotoTitle(`${v.dealer_name} - Proof Photo`);
                            }}
                            className="text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded"
                          >
                            <Camera className="w-3 h-3" /> View
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={v.actual_notes}>
                        {v.actual_notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── IMAGE VIEWER MODAL ── */}
      <ImageViewerModal
        isOpen={Boolean(selectedPhoto)}
        imageUrl={selectedPhoto}
        title={selectedPhotoTitle}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};
