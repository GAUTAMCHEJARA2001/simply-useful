import React, { useState, useEffect, useMemo } from 'react';
import { travelService, FieldVisitItem } from '@/api/services/travel.service';
import { useHRUsers } from '@/hooks/hr/useHR';
import { Card, CardContent } from '@/components/ui/card';
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
  Layers,
  Trophy,
  ChevronRight,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from '@/components/ImageViewerModal';

type DatePreset = 'ALL' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'TODAY' | 'YESTERDAY' | 'CUSTOM';
type ViewMode = 'SPLIT' | 'LEADERBOARD' | 'TABLE';
type SoSortOption = 'STOPS' | 'BAGS' | 'COLLECTION' | 'NAME';

interface SOGroupSummary {
  so_id: string;
  so_name: string;
  so_email: string;
  stops: FieldVisitItem[];
  totalStops: number;
  totalBags: number;
  totalCollection: number;
  orderStopsCount: number;
  gpsCount: number;
  gpsPercent: number;
  photoCount: number;
  firstStopTime: string | null;
  lastStopTime: string | null;
  workSpanText: string | null;
  locationsCovered: string[];
}

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
  const [viewMode, setViewMode] = useState<ViewMode>('SPLIT');

  // Split View specific states
  const [selectedSOId, setSelectedSOId] = useState<string | null>(null);
  const [soSearchQuery, setSoSearchQuery] = useState<string>('');
  const [soSortBy, setSoSortBy] = useState<SoSortOption>('STOPS');
  const [routeSearchQuery, setRouteSearchQuery] = useState<string>('');
  const [routePurposeFilter, setRoutePurposeFilter] = useState<string>('ALL');
  const [routeDensity, setRouteDensity] = useState<'DETAILED' | 'COMPACT'>('DETAILED');

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
      return {};
    }
    if (selectedPreset === 'TODAY') {
      return { date: toYMD(today) };
    }
    if (selectedPreset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { date: toYMD(y) };
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

  // Group visits by Sales Officer & compile deep productivity metrics
  const groupedSOs = useMemo<SOGroupSummary[]>(() => {
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

    const groups: SOGroupSummary[] = [];

    map.forEach(group => {
      // Sort stops chronologically
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

      const totalStops = group.stops.length;
      const totalBags = group.stops.reduce((acc, s) => acc + (Number(s.actual_order_bags) || 0), 0);
      const totalCollection = group.stops.reduce((acc, s) => acc + (Number(s.actual_collection_value) || 0), 0);
      const orderStopsCount = group.stops.filter(s => Number(s.actual_order_bags) > 0).length;
      const gpsCount = group.stops.filter(s => Boolean(s.gps_location)).length;
      const gpsPercent = totalStops > 0 ? Math.round((gpsCount / totalStops) * 100) : 0;
      const photoCount = group.stops.filter(s => Boolean(s.visit_photo)).length;

      // Extract work span (first check-in to last check-in)
      const validTimestamps = group.stops
        .map(s => s.completed_at || s.created_at)
        .filter(Boolean) as string[];

      let firstStopTime: string | null = null;
      let lastStopTime: string | null = null;
      let workSpanText: string | null = null;

      if (validTimestamps.length > 0) {
        const sortedDates = validTimestamps
          .map(t => new Date(t))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());

        if (sortedDates.length > 0) {
          const firstDate = sortedDates[0];
          const lastDate = sortedDates[sortedDates.length - 1];

          firstStopTime = firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          lastStopTime = lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const diffMs = lastDate.getTime() - firstDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          if (diffHours > 0 || diffMins > 0) {
            workSpanText = `${diffHours}h ${diffMins}m in field`;
          } else {
            workSpanText = 'Single timepoint';
          }
        }
      }

      // Collect unique town/area locations
      const locationsCovered = Array.from(
        new Set(
          group.stops
            .map(s => s.dealer_location?.trim())
            .filter((l): l is string => Boolean(l))
        )
      );

      groups.push({
        so_id: group.so_id,
        so_name: group.so_name,
        so_email: group.so_email,
        stops: group.stops,
        totalStops,
        totalBags,
        totalCollection,
        orderStopsCount,
        gpsCount,
        gpsPercent,
        photoCount,
        firstStopTime,
        lastStopTime,
        workSpanText,
        locationsCovered
      });
    });

    // Sort officers
    groups.sort((a, b) => {
      if (soSortBy === 'STOPS') return b.totalStops - a.totalStops;
      if (soSortBy === 'BAGS') return b.totalBags - a.totalBags;
      if (soSortBy === 'COLLECTION') return b.totalCollection - a.totalCollection;
      return a.so_name.localeCompare(b.so_name);
    });

    return groups;
  }, [filteredVisits, soSortBy]);

  // Keep first SO selected automatically if none is selected
  useEffect(() => {
    if (groupedSOs.length > 0) {
      if (!selectedSOId || !groupedSOs.some(g => (g.so_id || g.so_email) === selectedSOId)) {
        setSelectedSOId(groupedSOs[0].so_id || groupedSOs[0].so_email);
      }
    } else {
      setSelectedSOId(null);
    }
  }, [groupedSOs, selectedSOId]);

  // Active Selected Officer for Split View
  const activeSelectedOfficer = useMemo(() => {
    if (!selectedSOId) return groupedSOs[0] || null;
    return groupedSOs.find(g => (g.so_id || g.so_email) === selectedSOId) || groupedSOs[0] || null;
  }, [groupedSOs, selectedSOId]);

  // Filtered stops for the active officer route
  const activeOfficerStops = useMemo(() => {
    if (!activeSelectedOfficer) return [];
    return activeSelectedOfficer.stops.filter(s => {
      if (routePurposeFilter !== 'ALL') {
        const p = (s.visit_purpose || '').toUpperCase();
        if (routePurposeFilter === 'ORDER' && !p.includes('ORDER')) return false;
        if (routePurposeFilter === 'COLLECTION' && !p.includes('COLLECT')) return false;
        if (routePurposeFilter === 'SPOT' && !s.is_unplanned) return false;
      }
      if (routeSearchQuery.trim()) {
        const q = routeSearchQuery.toLowerCase().trim();
        return (
          (s.dealer_name && s.dealer_name.toLowerCase().includes(q)) ||
          (s.dealer_location && s.dealer_location.toLowerCase().includes(q)) ||
          (s.actual_notes && s.actual_notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeSelectedOfficer, routePurposeFilter, routeSearchQuery]);

  // Filtered SO list for roster
  const filteredRosterSOs = useMemo(() => {
    if (!soSearchQuery.trim()) return groupedSOs;
    const q = soSearchQuery.toLowerCase().trim();
    return groupedSOs.filter(so =>
      so.so_name.toLowerCase().includes(q) ||
      so.so_email.toLowerCase().includes(q) ||
      so.locationsCovered.some(l => l.toLowerCase().includes(q))
    );
  }, [groupedSOs, soSearchQuery]);

  // Overall Global KPI Metrics
  const metrics = useMemo(() => {
    const total = filteredVisits.length;
    const activeSOs = groupedSOs.length;
    const totalBags = filteredVisits.reduce((acc, v) => acc + (Number(v.actual_order_bags) || 0), 0);
    const totalCollection = filteredVisits.reduce((acc, v) => acc + (Number(v.actual_collection_value) || 0), 0);
    const withGPS = filteredVisits.filter(v => Boolean(v.gps_location)).length;
    const gpsPercent = total > 0 ? Math.round((withGPS / total) * 100) : 0;
    const withPhoto = filteredVisits.filter(v => Boolean(v.visit_photo)).length;

    return { total, activeSOs, totalBags, totalCollection, gpsPercent, withPhoto };
  }, [filteredVisits, groupedSOs]);

  // Purpose badge renderer
  const renderPurposeBadge = (purpose?: string) => {
    const p = (purpose || 'ROUTINE').toUpperCase();
    if (p.includes('ORDER')) {
      return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">Order Booking</Badge>;
    }
    if (p.includes('COLLECT')) {
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">Collection</Badge>;
    }
    if (p.includes('MEET') || p.includes('DEALER')) {
      return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">Dealer Meet</Badge>;
    }
    if (p.includes('SITE') || p.includes('PROJECT')) {
      return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">Site Visit</Badge>;
    }
    if (p.includes('NEW') || p.includes('ONBOARD')) {
      return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">New Counter</Badge>;
    }
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">Routine Beat</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* ── TOP EXECUTIVE BANNER & OVERALL METRICS ── */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>SO Field Visits & Beat Tracker</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200">
                    Executive Cockpit
                  </span>
                </h1>
                <p className="text-xs text-blue-200/80">
                  Real-time sales officer beat performance, counter coverage, order bookings, and verified GPS route timelines
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
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 px-3 gap-1.5 backdrop-blur-sm cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Refresh Feed</span>
            </Button>
          </div>
        </div>

        {/* ── METRICS RIBBON ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-blue-200/80 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-300" />
              <span>Total Visits</span>
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.total}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Counter beat stops</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-blue-200/80 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>Field Officers</span>
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.activeSOs}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Active on the beat</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-blue-200/80 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              <span>Orders Booked</span>
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.totalBags.toLocaleString()} <span className="text-xs font-normal text-emerald-300">bags</span></div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">During field stops</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-blue-200/80 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-amber-300" />
              <span>Collections</span>
            </div>
            <div className="text-xl font-black text-white mt-1">₹{metrics.totalCollection.toLocaleString()}</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">Cheques & payments</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-blue-200/80 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-300" />
              <span>GPS Verified</span>
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.gpsPercent}%</div>
            <div className="text-[10px] text-blue-200/60 mt-0.5">{metrics.withPhoto} photos captured</div>
          </div>
        </div>
      </div>

      {/* ── FILTER & VIEW MODE CONTROL PANEL ── */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          {/* Row 1: Date Presets & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date:
              </span>
              {[
                { id: 'ALL', label: 'All Past Visits' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'CUSTOM', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id as DatePreset)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
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
                  className="w-32 h-8 text-xs ml-1"
                />
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('SPLIT')}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer",
                  viewMode === 'SPLIT' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Split Master-Detail View: No scrolling fatigue!"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Split Route View</span>
              </button>
              <button
                onClick={() => setViewMode('LEADERBOARD')}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer",
                  viewMode === 'LEADERBOARD' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Side-by-side Officer Productivity Comparison"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Officer Comparison</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer",
                  viewMode === 'TABLE' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
                title="Full Tabular Audit View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Audit Table</span>
              </button>
            </div>
          </div>

          {/* Row 2: Secondary Filters & Global Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Filter Officer
              </label>
              <select
                value={selectedSO}
                onChange={(e) => setSelectedSO(e.target.value)}
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="ALL">All Sales Officers ({salesOfficers.length})</option>
                {salesOfficers.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.name || so.email} ({so.role || 'SO'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Visit Purpose
              </label>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="ALL">All Purposes</option>
                <option value="ORDER_BOOKING">Order Booking</option>
                <option value="COLLECTION">Payment Collection</option>
                <option value="DEALER_MEET">Dealer Meet</option>
                <option value="SITE_VISIT">Site Visit</option>
                <option value="NEW_COUNTER">New Counter</option>
                <option value="ROUTINE">Routine Beat</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Search Stops / Counters / Dealers
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <Input
                  placeholder="Dealer, town, SO, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-600">Loading field visits & itinerary data...</p>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && filteredVisits.length === 0 && (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Field Visits Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No dealer visits or beat stops were logged matching the selected filters. Change the date or Sales Officer to see activity.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPreset('ALL');
              setSelectedSO('ALL');
              setSelectedPurpose('ALL');
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
            className="mt-4 text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* ── VIEW 1: EXECUTIVE SPLIT ROUTE VIEW (SOLVES SCROLLING FATIGUE!) ── */}
      {!loading && viewMode === 'SPLIT' && groupedSOs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT PANE: SALES OFFICER ROSTER (35% Width) ── */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-3">
            <div className="bg-card border border-slate-200 rounded-xl p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Sales Officers ({filteredRosterSOs.length})
                  </span>
                </div>
                {/* Sort selector */}
                <select
                  value={soSortBy}
                  onChange={(e) => setSoSortBy(e.target.value as SoSortOption)}
                  className="text-[11px] font-semibold text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50"
                >
                  <option value="STOPS">Sort: Most Stops</option>
                  <option value="BAGS">Sort: Most Bags</option>
                  <option value="COLLECTION">Sort: Highest Recovery</option>
                  <option value="NAME">Sort: Name (A-Z)</option>
                </select>
              </div>

              {/* Roster search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <Input
                  placeholder="Filter officers or town..."
                  value={soSearchQuery}
                  onChange={(e) => setSoSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-7.5"
                />
              </div>
            </div>

            {/* Officer Cards List */}
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredRosterSOs.map((so) => {
                const isSelected = (activeSelectedOfficer?.so_id || activeSelectedOfficer?.so_email) === (so.so_id || so.so_email);

                return (
                  <div
                    key={so.so_id || so.so_email}
                    onClick={() => {
                      setSelectedSOId(so.so_id || so.so_email);
                      setRouteSearchQuery('');
                      setRoutePurposeFilter('ALL');
                    }}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all cursor-pointer text-left relative",
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                        : "bg-card border-slate-200 hover:border-blue-300 hover:bg-slate-50/70 shadow-sm"
                    )}
                  >
                    {/* Header: Avatar, Name, Email */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0",
                          isSelected ? "bg-blue-600 ring-2 ring-blue-300" : "bg-slate-600"
                        )}>
                          {so.so_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className={cn("text-xs font-bold truncate", isSelected ? "text-blue-950 font-black" : "text-slate-900")}>
                            {so.so_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">{so.so_email}</p>
                        </div>
                      </div>

                      {/* Stops Badge */}
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-xs",
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                      )}>
                        {so.totalStops} {so.totalStops === 1 ? 'Stop' : 'Stops'}
                      </span>
                    </div>

                    {/* KPI Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 text-[11px]">
                      {so.totalBags > 0 ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                          <ShoppingBag className="w-3 h-3 text-emerald-600" />
                          {so.totalBags} Bags
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">0 Bags</span>
                      )}

                      {so.totalCollection > 0 && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                          <IndianRupee className="w-3 h-3 text-blue-600" />
                          ₹{so.totalCollection.toLocaleString()}
                        </span>
                      )}

                      <span className="flex items-center gap-0.5 bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded text-[10px]">
                        <Navigation className="w-2.5 h-2.5 text-cyan-600" />
                        {so.gpsPercent}% GPS
                      </span>
                    </div>

                    {/* Working Span & Hours */}
                    {so.firstStopTime && (
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between bg-white/70 px-2 py-1 rounded border border-slate-100">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-2.5 h-2.5 text-blue-500" />
                          {so.firstStopTime} → {so.lastStopTime || '—'}
                        </span>
                        <span className="font-semibold text-indigo-700">{so.workSpanText}</span>
                      </div>
                    )}

                    {/* Active Selected Arrow Indicator */}
                    {isSelected && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hidden lg:block">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT PANE: SELECTED OFFICER ROUTE ITINERARY (65% Width) ── */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-3.5">
            {activeSelectedOfficer ? (
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                {/* Officer Itinerary Header */}
                <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-black text-base text-blue-200 shadow-inner">
                        {activeSelectedOfficer.so_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-black tracking-tight">
                            {activeSelectedOfficer.so_name}'s Beat Route
                          </h2>
                          <Badge className="bg-blue-500 text-white font-bold text-xs">
                            {activeSelectedOfficer.totalStops} Stops
                          </Badge>
                        </div>
                        <p className="text-xs text-blue-200/80 mt-0.5">
                          {activeSelectedOfficer.so_email}
                          {activeSelectedOfficer.locationsCovered.length > 0 && (
                            <span> • Areas: {activeSelectedOfficer.locationsCovered.slice(0, 3).join(', ')}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Time Span Badge */}
                    {activeSelectedOfficer.firstStopTime && (
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-right backdrop-blur-sm self-start sm:self-auto">
                        <div className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider">
                          Active Work Span
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5">
                          {activeSelectedOfficer.firstStopTime} → {activeSelectedOfficer.lastStopTime}
                        </div>
                        <div className="text-[10px] text-emerald-300 font-semibold">
                          {activeSelectedOfficer.workSpanText}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Route Summary Badges */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <span className="text-[10px] text-blue-200/70 block">Total Booked</span>
                      <span className="font-bold text-emerald-300 text-sm">
                        {activeSelectedOfficer.totalBags} bags
                      </span>
                      <span className="text-[10px] text-blue-200/60 block">({activeSelectedOfficer.orderStopsCount} order stops)</span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <span className="text-[10px] text-blue-200/70 block">Recovered</span>
                      <span className="font-bold text-blue-200 text-sm">
                        ₹{activeSelectedOfficer.totalCollection.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-blue-200/60 block">Collections</span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                      <span className="text-[10px] text-blue-200/70 block">GPS Tagged</span>
                      <span className="font-bold text-cyan-300 text-sm">
                        {activeSelectedOfficer.gpsCount}/{activeSelectedOfficer.totalStops} stops
                      </span>
                      <span className="text-[10px] text-blue-200/60 block">({activeSelectedOfficer.gpsPercent}% compliant)</span>
                    </div>
                  </div>
                </div>

                {/* Sub-toolbar inside Officer Route */}
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <Input
                        placeholder="Search counter, town, notes in this route..."
                        value={routeSearchQuery}
                        onChange={(e) => setRouteSearchQuery(e.target.value)}
                        className="pl-8 text-xs h-8 bg-white"
                      />
                    </div>

                    {/* Filter purpose inside route */}
                    <select
                      value={routePurposeFilter}
                      onChange={(e) => setRoutePurposeFilter(e.target.value)}
                      className="text-xs h-8 px-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">All Stops ({activeSelectedOfficer.totalStops})</option>
                      <option value="ORDER">Orders Only</option>
                      <option value="COLLECTION">Collections Only</option>
                      <option value="SPOT">Spot Visits Only</option>
                    </select>
                  </div>

                  {/* View density toggle */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setRouteDensity('DETAILED')}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
                        routeDensity === 'DETAILED' ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Detailed Cards
                    </button>
                    <button
                      onClick={() => setRouteDensity('COMPACT')}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded font-bold transition-all cursor-pointer",
                        routeDensity === 'COMPACT' ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      )}
                      title="Compact Table: View 40 stops at 1 glance without scrolling!"
                    >
                      Compact Table
                    </button>
                  </div>
                </div>

                {/* Route Stops Container */}
                <CardContent className="p-4 sm:p-5 max-h-[700px] overflow-y-auto">
                  {activeOfficerStops.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold">No stops match the current route filters.</p>
                    </div>
                  ) : routeDensity === 'COMPACT' ? (
                    /* ── COMPACT HIGH-DENSITY TABLE VIEW (ZERO SCROLLING FATIGUE!) ── */
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center">#</th>
                            <th className="py-2.5 px-3">Time / Date</th>
                            <th className="py-2.5 px-3">Counter / Dealer</th>
                            <th className="py-2.5 px-3">Town / Area</th>
                            <th className="py-2.5 px-3">Purpose</th>
                            <th className="py-2.5 px-3 text-right">Orders</th>
                            <th className="py-2.5 px-3 text-right">Collection</th>
                            <th className="py-2.5 px-3 text-center">GPS / Photo</th>
                            <th className="py-2.5 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeOfficerStops.map((stop, idx) => {
                            const timeStr = formatTime(stop.completed_at || stop.created_at);

                            return (
                              <tr key={stop.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="py-2 px-3 text-center">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] inline-flex items-center justify-center">
                                    {stop.stop_order || idx + 1}
                                  </span>
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-800">{timeStr || '—'}</span>
                                  <span className="text-[10px] text-slate-400 block">{formatDate(stop.date)}</span>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{stop.dealer_name}</span>
                                    {stop.is_unplanned && (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                        Spot
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                                  {stop.dealer_location || '—'}
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {renderPurposeBadge(stop.visit_purpose)}
                                </td>
                                <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                                  {stop.actual_order_bags > 0 ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {stop.actual_order_bags} bags
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                                  {stop.actual_collection_value > 0 ? (
                                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      ₹{stop.actual_collection_value.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    {stop.gps_location ? (
                                      <button
                                        onClick={() => openGPSMap(stop.gps_location)}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                        title="Open GPS in Google Maps"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-300 text-[10px]">—</span>
                                    )}
                                    {stop.visit_photo && (
                                      <button
                                        onClick={() => {
                                          setSelectedPhoto(stop.visit_photo || null);
                                          setSelectedPhotoTitle(`${stop.dealer_name} - Photo Proof`);
                                        }}
                                        className="text-slate-600 hover:text-slate-900 p-1 rounded hover:bg-slate-100"
                                        title="View Proof Photo"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 max-w-xs truncate text-[11px]" title={stop.actual_notes}>
                                  {stop.actual_notes || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* ── DETAILED CHRONOLOGICAL ROUTE TIMELINE CARDS ── */
                    <div className="relative pl-7 sm:pl-9 space-y-4 before:absolute before:left-3.5 sm:before:left-4.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      {activeOfficerStops.map((stop, idx) => {
                        const timeStr = formatTime(stop.completed_at || stop.created_at);
                        const isUnplanned = stop.is_unplanned;

                        // Calculate time gap from previous stop
                        let timeGapText: string | null = null;
                        if (idx > 0) {
                          const prevTime = activeOfficerStops[idx - 1].completed_at || activeOfficerStops[idx - 1].created_at;
                          const currTime = stop.completed_at || stop.created_at;
                          if (prevTime && currTime) {
                            const d1 = new Date(prevTime);
                            const d2 = new Date(currTime);
                            const diffMins = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
                            if (diffMins > 0 && diffMins < 300) {
                              timeGapText = `+${diffMins} min`;
                            }
                          }
                        }

                        return (
                          <div key={stop.id} className="relative group">
                            {/* Step Node Dot */}
                            <div
                              className={cn(
                                "absolute -left-7 sm:-left-9 top-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-transform group-hover:scale-110 shadow-xs",
                                stop.visited
                                  ? "bg-emerald-600 text-white border-emerald-200"
                                  : "bg-blue-600 text-white border-blue-200"
                              )}
                            >
                              {stop.stop_order || idx + 1}
                            </div>

                            {/* Stop Card */}
                            <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-3.5 transition-all shadow-xs hover:shadow-md">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                      <Store className="w-4 h-4 text-blue-600 shrink-0" />
                                      <span>{stop.dealer_name}</span>
                                    </h3>
                                    {isUnplanned && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-800 border-amber-200 font-bold">
                                        Spot Visit
                                      </Badge>
                                    )}
                                    {renderPurposeBadge(stop.visit_purpose)}
                                  </div>
                                  {stop.dealer_location && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span>{stop.dealer_location}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Time stamp with Gap indicator */}
                                <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600">
                                    {formatDate(stop.date)}
                                  </span>
                                  {timeStr && (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-blue-500" />
                                      <span>{timeStr}</span>
                                      {timeGapText && (
                                        <span className="text-[9px] text-blue-500 font-normal">({timeGapText})</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Commercial Results */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 py-2.5 text-xs">
                                <div className="space-y-0.5 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Orders Booked</span>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                    {stop.actual_order_bags > 0 ? (
                                      <span className="text-emerald-700">{stop.actual_order_bags} bags</span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">No order booked</span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-0.5 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Collected</span>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                                    {stop.actual_collection_value > 0 ? (
                                      <span className="text-blue-700">₹{stop.actual_collection_value.toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">None</span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-0.5 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Visit Status</span>
                                  <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="capitalize">{stop.actual_status ? stop.actual_status.toLowerCase() : 'Completed'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Remarks */}
                              {stop.actual_notes && (
                                <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-100 text-xs text-slate-700 mb-2">
                                  <span className="font-bold text-amber-900">Notes: </span>
                                  {stop.actual_notes}
                                </div>
                              )}

                              {/* Footer Actions: GPS Coordinates & Photo Proof */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  {stop.gps_location ? (
                                    <button
                                      onClick={() => openGPSMap(stop.gps_location)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Navigation className="w-3 h-3 text-blue-600" />
                                      <span>Google Maps GPS Pin</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Navigation className="w-3 h-3 text-slate-300" /> No GPS tagged
                                    </span>
                                  )}
                                </div>

                                {stop.visit_photo && (
                                  <button
                                    onClick={() => {
                                      setSelectedPhoto(stop.visit_photo || null);
                                      setSelectedPhotoTitle(`${stop.dealer_name} - Visit Proof (${activeSelectedOfficer.so_name})`);
                                    }}
                                    className="text-[11px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
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
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-card border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                Please select a Sales Officer from the roster to view their route itinerary.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: EXECUTIVE OFFICER COMPARISON / LEADERBOARD ── */}
      {!loading && viewMode === 'LEADERBOARD' && groupedSOs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Sales Officer Beat Productivity Comparison</span>
            </h2>
            <span className="text-xs text-slate-500">
              Comparing {groupedSOs.length} field officers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedSOs.map((so, idx) => (
              <Card key={so.so_id || so.so_email} className="shadow-sm border-slate-200 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {so.so_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-slate-900">{so.so_name}</h3>
                          {idx === 0 && (
                            <Badge className="bg-amber-500 text-white text-[9px] py-0 px-1 font-bold">
                              #1 Volume
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{so.so_email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 font-black text-xs">
                      {so.totalStops} Stops
                    </Badge>
                  </div>

                  <div className="p-4 space-y-3.5">
                    {/* Performance metrics grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Orders Booked</span>
                        <span className="text-base font-black text-emerald-700">{so.totalBags} <span className="text-xs font-normal">bags</span></span>
                        <span className="text-[10px] text-emerald-600/80 block">{so.orderStopsCount} successful stops</span>
                      </div>

                      <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Collections</span>
                        <span className="text-base font-black text-blue-700">₹{so.totalCollection.toLocaleString()}</span>
                        <span className="text-[10px] text-blue-600/80 block">Payment recovery</span>
                      </div>
                    </div>

                    {/* Work Span & GPS Coverage */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Field Hours:
                        </span>
                        <span className="font-bold text-slate-800">
                          {so.firstStopTime ? `${so.firstStopTime} → ${so.lastStopTime}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Time Span:
                        </span>
                        <span className="font-semibold text-indigo-700">
                          {so.workSpanText || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-slate-400" /> GPS Tagged:
                        </span>
                        <span className="font-bold text-cyan-700">
                          {so.gpsCount}/{so.totalStops} ({so.gpsPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Top Counters visited preview */}
                    {so.locationsCovered.length > 0 && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">Areas Covered: </span>
                        {so.locationsCovered.slice(0, 4).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspect Button */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSOId(so.so_id || so.so_email);
                      setViewMode('SPLIT');
                    }}
                    className="w-full text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                  >
                    Inspect Full Beat Itinerary ({so.totalStops} Stops) →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── VIEW 3: AUDIT TABLE VIEW ── */}
      {!loading && viewMode === 'TABLE' && filteredVisits.length > 0 && (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Audit Table: Showing {filteredVisits.length} visits
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Sales Officer</th>
                  <th className="py-2.5 px-3">Dealer / Counter</th>
                  <th className="py-2.5 px-3">Town / Location</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3 text-right">Orders (Bags)</th>
                  <th className="py-2.5 px-3 text-right">Collection</th>
                  <th className="py-2.5 px-3 text-center">GPS</th>
                  <th className="py-2.5 px-3 text-center">Photo</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => {
                  const timeStr = formatTime(v.completed_at || v.created_at);

                  return (
                    <tr key={v.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatDate(v.date)}</div>
                        <div className="text-[11px] text-slate-400">{timeStr || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{v.so_name}</div>
                        <div className="text-[11px] text-slate-400">{v.so_email}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {v.dealer_name}
                        {v.is_unplanned && (
                          <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-200">
                            Spot
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{v.dealer_location || '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{renderPurposeBadge(v.visit_purpose)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {v.actual_order_bags > 0 ? `${v.actual_order_bags} bags` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        {v.actual_collection_value > 0 ? `₹${v.actual_collection_value.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {v.gps_location ? (
                          <button
                            onClick={() => openGPSMap(v.gps_location)}
                            className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 text-[11px] bg-blue-50 px-2 py-0.5 rounded cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" /> Map
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {v.visit_photo ? (
                          <button
                            onClick={() => {
                              setSelectedPhoto(v.visit_photo || null);
                              setSelectedPhotoTitle(`${v.dealer_name} - Proof Photo`);
                            }}
                            className="text-slate-700 hover:text-slate-900 font-bold inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                          >
                            <Camera className="w-3 h-3" /> View
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={v.actual_notes}>
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
