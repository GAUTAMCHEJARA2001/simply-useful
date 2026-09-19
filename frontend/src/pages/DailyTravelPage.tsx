import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { travelService, DailyTravelLogItem, TourPlanStopItem } from '@/api/services/travel.service';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Gauge, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Calendar, 
  ArrowRight, 
  Eye, 
  RefreshCw,
  Bike,
  Car,
  Navigation,
  IndianRupee,
  ShoppingBag,
  Store,
  FileText,
  Plus,
  Trash2,
  Award,
  Target,
  Compass,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  Search,
  Building2,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const DailyTravelPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'TRIP' | 'PLANNER' | 'HISTORY'>('TRIP');

  // Logs & History State
  const [todayLog, setTodayLog] = useState<DailyTravelLogItem | null>(null);
  const [history, setHistory] = useState<DailyTravelLogItem[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Registered Parties (Dealers + Distributors) master list
  interface RegisteredParty {
    id: string;
    name: string;
    code: string;
    city: string;
    address: string;
    type: 'Dealer' | 'Distributor';
  }
  const [parties, setParties] = useState<RegisteredParty[]>([]);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'Dealer' | 'Distributor'>('ALL');

  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      const matchType = partyTypeFilter === 'ALL' || p.type === partyTypeFilter;
      const q = partySearchQuery.toLowerCase().trim();
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [parties, partyTypeFilter, partySearchQuery]);

  // Punch Start Form
  const [startKm, setStartKm] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'CAR' | 'OTHER'>('BIKE');
  const [startPhoto, setStartPhoto] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<string>('Detecting GPS location...');

  // Punch End Form - Stop Reconciliation & Summaries
  const [endKm, setEndKm] = useState<string>('');
  const [endPhoto, setEndPhoto] = useState<string>('');
  const [visitSummary, setVisitSummary] = useState<string>('');
  const [collectionSummary, setCollectionSummary] = useState<string>('');
  const [orderSummary, setOrderSummary] = useState<string>('');
  const [routeNotes, setRouteNotes] = useState<string>('');

  // Reconciling stops list (contains planned and spot stops)
  const [reconcilingStops, setReconcilingStops] = useState<TourPlanStopItem[]>([]);

  // Lightbox for photos & log viewer
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewingHistoryLog, setViewingHistoryLog] = useState<DailyTravelLogItem | null>(null);

  // Planner Tab State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [plannerDate, setPlannerDate] = useState<string>(tomorrowStr);
  const [plannerStops, setPlannerStops] = useState<TourPlanStopItem[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [savingPlan, setSavingPlan] = useState<boolean>(false);

  // Modals for adding stops
  const [showAddStopModal, setShowAddStopModal] = useState<boolean>(false);
  const [isSpotVisitModal, setIsSpotVisitModal] = useState<boolean>(false);
  const [stopForm, setStopForm] = useState<{
    dealer_id: string;
    dealer_name: string;
    dealer_location: string;
    visit_purpose: 'ORDER' | 'PAYMENT' | 'NEW_LEAD' | 'ROUTINE' | 'COMPLAINT' | 'OTHER';
    target_order_bags: string;
    target_collection_value: string;
    plan_notes: string;
  }>({
    dealer_id: '',
    dealer_name: '',
    dealer_location: '',
    visit_purpose: 'ORDER',
    target_order_bags: '',
    target_collection_value: '',
    plan_notes: '',
  });

  // GPS auto-capture
  const fetchGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported on this device');
      return;
    }
    setGpsStatus('🛰️ Searching for location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (±${Math.round(pos.coords.accuracy)}m)`;
        setGpsLocation(coords);
        setGpsStatus(`📍 Signal: ±${Math.round(pos.coords.accuracy)}m`);
      },
      () => {
        setGpsStatus('⚠️ GPS access denied/unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  // Fetch Master Dealers & Distributors
  const fetchParties = async () => {
    try {
      const [dealersRes, distRes] = await Promise.all([
        api.get('/dealers'),
        api.get('/distributors').catch(() => ({ data: [] }))
      ]);
      const dList = dealersRes.data?.data || dealersRes.data || [];
      const distList = distRes.data?.data || distRes.data || [];

      const parsedParties: RegisteredParty[] = [];

      if (Array.isArray(dList)) {
        dList.forEach((d: any) => {
          const name = d.dealerName || d.dealer_name || d.name || d.businessName || '';
          if (name) {
            parsedParties.push({
              id: String(d.id || d.dealerCode || d.dealercode || name),
              name,
              code: d.dealerCode || d.dealercode || '',
              city: d.city || d.territory || '',
              address: d.address || '',
              type: 'Dealer',
            });
          }
        });
      }

      if (Array.isArray(distList)) {
        distList.forEach((dt: any) => {
          const name = dt.distributorName || dt.distributor_name || dt.name || dt.businessName || '';
          if (name) {
            parsedParties.push({
              id: String(dt.id || dt.distributorCode || dt.distributorcode || name),
              name,
              code: dt.distributorCode || dt.distributorcode || '',
              city: dt.area || dt.city || dt.territory || '',
              address: dt.address || '',
              type: 'Distributor',
            });
          }
        });
      }

      // Sort alphabetically by name
      parsedParties.sort((a, b) => a.name.localeCompare(b.name));
      setParties(parsedParties);
    } catch (err) {
      console.error('Failed to fetch dealers and distributors:', err);
    }
  };

  // Load Today's Log or Today's Planned Stops
  const loadTodayLog = async () => {
    try {
      setLoadingToday(true);
      const res = await travelService.getToday();
      const data = res.data?.data || null;
      if (data) {
        if (data.has_plan_only) {
          // No travel log created yet, but user planned stops for today
          setTodayLog(null);
          setReconcilingStops(data.stops || []);
        } else {
          setTodayLog(data);
          if (data.start_km !== undefined) setStartKm(String(data.start_km));
          if (data.vehicle_type) setVehicleType(data.vehicle_type);
          if (data.end_km !== null && data.end_km !== undefined) setEndKm(String(data.end_km));
          if (data.visit_summary) setVisitSummary(data.visit_summary);
          if (data.collection_summary) setCollectionSummary(data.collection_summary);
          if (data.order_summary) setOrderSummary(data.order_summary);

          // Populate reconciling stops with existing stops
          if (data.stops && Array.isArray(data.stops)) {
            setReconcilingStops(data.stops);
          }
        }
      } else {
        setTodayLog(null);
        setReconcilingStops([]);
      }
    } catch (err) {
      console.error('Failed to load today travel log:', err);
    } finally {
      setLoadingToday(false);
    }
  };

  // Load Tour Plan for Planner Tab
  const loadPlanForDate = async (date: string) => {
    try {
      setLoadingPlan(true);
      const res = await travelService.getPlan(date);
      setPlannerStops(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load plan for date:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await travelService.getMyHistory();
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadTodayLog();
    loadHistory();
    fetchGps();
    fetchParties();
  }, [fetchGps]);

  useEffect(() => {
    if (activeTab === 'PLANNER') {
      loadPlanForDate(plannerDate);
    }
  }, [plannerDate, activeTab]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start Trip Action
  const handleStartTrip = async () => {
    if (!startKm || isNaN(Number(startKm)) || Number(startKm) < 0) {
      toast({ title: 'Invalid Starting KM', description: 'Please enter a valid start odometer reading', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await travelService.startTrip({
        start_km: Number(startKm),
        vehicle_type: vehicleType,
        start_photo: startPhoto,
        start_location: gpsLocation || gpsStatus,
      });
      toast({ title: 'Trip Started! 🚀', description: `Recorded starting at ${startKm} KM (${vehicleType})` });
      const logData = res.data?.data || null;
      setTodayLog(logData);
      if (logData?.stops) {
        setReconcilingStops(logData.stops);
      }
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Failed to start trip', description: err.response?.data?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Update Reconciling Stop values in End Trip
  const updateReconcilingStop = (index: number, fields: Partial<TourPlanStopItem>) => {
    setReconcilingStops(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };

      // Automatically compute/enrich summary text if user changes actuals
      const visitedStops = copy.filter(s => s.visited);
      const visitLines = visitedStops.map(s => `• ${s.dealer_name} (${s.actual_status || 'Visited'})` + (s.actual_notes ? ` - ${s.actual_notes}` : ''));
      if (visitLines.length > 0) {
        setVisitSummary(visitLines.join('\n'));
      }

      const colls = visitedStops.filter(s => (s.actual_collection_value || 0) > 0);
      if (colls.length > 0) {
        setCollectionSummary(colls.map(s => `${s.dealer_name}: ₹${Number(s.actual_collection_value).toLocaleString('en-IN')}`).join(', '));
      } else {
        setCollectionSummary('Nil');
      }

      const orders = visitedStops.filter(s => (s.actual_order_bags || 0) > 0);
      if (orders.length > 0) {
        setOrderSummary(orders.map(s => `${s.dealer_name}: ${s.actual_order_bags} bags`).join(', '));
      } else {
        setOrderSummary('Nil');
      }

      return copy;
    });
  };

  // End Trip Action
  const handleEndTrip = async () => {
    if (!endKm || isNaN(Number(endKm))) {
      toast({ title: 'Invalid Ending KM', description: 'Please enter ending odometer reading', variant: 'destructive' });
      return;
    }

    if (todayLog && Number(endKm) < todayLog.start_km) {
      toast({ title: 'Ending KM Mismatch', description: `Ending KM must be greater than starting KM (${todayLog.start_km})`, variant: 'destructive' });
      return;
    }

    // Validation: check that each planned stop has an actual outcome status
    const unreconciled = reconcilingStops.some(s => !s.actual_status || s.actual_status === 'PENDING');
    if (unreconciled) {
      toast({
        title: 'Reconcile All Planned Stops *',
        description: 'Please select an outcome status (Completed, Missed, etc.) for each planned stop before submitting.',
        variant: 'destructive',
      });
      return;
    }

    // Compulsory summary text checks
    if (!visitSummary.trim()) {
      toast({ title: 'Daily Visit Summary Required *', description: 'Please enter details of dealers/sites visited today.', variant: 'destructive' });
      return;
    }
    if (!collectionSummary.trim()) {
      toast({ title: 'Payment Collection Required *', description: 'Please enter payment collection details (or write "Nil").', variant: 'destructive' });
      return;
    }
    if (!orderSummary.trim()) {
      toast({ title: 'Order Summary Required *', description: 'Please enter order booking details (or write "Nil").', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await travelService.endTrip({
        end_km: Number(endKm),
        end_photo: endPhoto,
        end_location: gpsLocation || gpsStatus,
        visit_summary: visitSummary.trim(),
        collection_summary: collectionSummary.trim(),
        order_summary: orderSummary.trim(),
        so_notes: routeNotes.trim(),
        stops: reconcilingStops,
      });

      const data = res.data?.data;
      toast({ 
        title: '🏁 Day Trip Completed!', 
        description: `Logged ${data?.total_km} KM. Performance Score: ${data?.target_achievement_pct}% (${data?.performance_rating})` 
      });
      setTodayLog(data);
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Failed to end trip', description: err.response?.data?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Add Stop Handler (used in Tour Planner and in Spot Visit)
  const handleSaveStop = async () => {
    if (!stopForm.dealer_name.trim()) {
      toast({ title: 'Dealer Name Required', description: 'Please enter or select a dealer name.', variant: 'destructive' });
      return;
    }

    const newStop: TourPlanStopItem = {
      id: `temp-${Date.now()}`,
      dealer_id: stopForm.dealer_id || null,
      dealer_name: stopForm.dealer_name.trim(),
      dealer_location: stopForm.dealer_location.trim(),
      visit_purpose: stopForm.visit_purpose,
      target_order_bags: Number(stopForm.target_order_bags) || 0,
      target_collection_value: Number(stopForm.target_collection_value) || 0,
      plan_notes: stopForm.plan_notes.trim(),
      is_unplanned: isSpotVisitModal,
      visited: isSpotVisitModal, // Spot visits conducted on the fly are visited
      actual_status: isSpotVisitModal ? 'COMPLETED' : 'PENDING',
    };

    if (isSpotVisitModal) {
      // Add spot visit directly to today's active reconciling stops
      setReconcilingStops(prev => [...prev, newStop]);
      toast({ title: 'Spot Visit Added! 📍', description: `Added ${newStop.dealer_name} to today's route.` });
      // Call backend to persist if trip active
      if (todayLog?.id) {
        try {
          await travelService.addUnplannedStop(newStop);
        } catch (e) {
          console.error('Failed to sync spot visit to backend:', e);
        }
      }
    } else if (activeTab === 'PLANNER') {
      // Add to planner stops list
      setPlannerStops(prev => [...prev, newStop]);
      toast({ title: 'Stop Added to Plan', description: `${newStop.dealer_name} added to ${plannerDate} plan.` });
    } else {
      // Added pre-trip for today
      setReconcilingStops(prev => [...prev, newStop]);
      toast({ title: 'Stop Added to Today Plan', description: `${newStop.dealer_name} added.` });
    }

    setShowAddStopModal(false);
    setStopForm({
      dealer_id: '',
      dealer_name: '',
      dealer_location: '',
      visit_purpose: 'ORDER',
      target_order_bags: '',
      target_collection_value: '',
      plan_notes: '',
    });
  };

  // Save Tour Plan in Planner Tab
  const handleSavePlan = async () => {
    if (plannerStops.length === 0) {
      toast({ title: 'Plan Empty', description: 'Please add at least 1 dealer stop to the plan.', variant: 'destructive' });
      return;
    }

    try {
      setSavingPlan(true);
      await travelService.savePlan({
        date: plannerDate,
        stops: plannerStops,
      });
      toast({ title: 'Tour Plan Saved! 💾', description: `Saved ${plannerStops.length} stops for ${plannerDate}.` });
      if (plannerDate === todayStr) {
        loadTodayLog();
      }
    } catch (err: any) {
      toast({ title: 'Failed to save plan', description: err.response?.data?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSavingPlan(false);
    }
  };

  // Delete Stop from Planner
  const handleDeletePlannerStop = (index: number) => {
    setPlannerStops(prev => prev.filter((_, i) => i !== index));
  };

  // Quick select dealer or distributor from master list
  const handlePartySelect = (party: RegisteredParty) => {
    setStopForm(prev => ({
      ...prev,
      dealer_id: party.id,
      dealer_name: party.name,
      dealer_location: party.city || party.address || '',
    }));
  };

  // Status Badge Helper
  const getRatingBadge = (rating?: string, score?: number) => {
    switch (rating) {
      case 'OUTSTANDING':
        return <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm">🌟 OUTSTANDING ({score ?? 100}%)</Badge>;
      case 'TARGET_ACHIEVED':
        return <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm">🟢 TARGET ACHIEVED ({score ?? 85}%)</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-500 text-white font-bold text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm">🟡 PARTIALLY FULFILLED ({score ?? 60}%)</Badge>;
      case 'UNDERPERFORMED':
        return <Badge className="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm">🔴 UNDERPERFORMED ({score ?? 35}%)</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending Review</Badge>;
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* HEADER WITH WORKFLOW TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Daily Field Travel &amp; Tour Plan
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan stops &amp; targets, record odometer readings, reconcile dealer execution, and push to payroll
              </p>
            </div>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40 shrink-0">
          <button
            onClick={() => setActiveTab('TRIP')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'TRIP' ? "bg-background text-primary shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Car className="w-4 h-4" />
            <span>Today's Trip</span>
            {todayLog && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('PLANNER');
              setPlannerDate(tomorrowStr);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'PLANNER' ? "bg-background text-primary shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="w-4 h-4 text-purple-600" />
            <span>Tour Planner</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              Plan Next Day
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'HISTORY' ? "bg-background text-primary shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>History &amp; Scores</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TODAY'S ACTIVE TRIP WORKFLOW */}
      {activeTab === 'TRIP' && (
        <div className="space-y-6">
          {/* STATE 1: TRIP NOT STARTED YET */}
          {!todayLog ? (
            <div className="space-y-6">
              {/* Option B: Tour Plan for Today Overview */}
              <Card className="border shadow-sm bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      <span>Today's Tour Plan &amp; Targets ({new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Stops and targets set for today's beat. You can add or edit stops before rolling out.
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsSpotVisitModal(false);
                      setShowAddStopModal(true);
                    }}
                    className="text-xs h-8 gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stop to Today</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {reconcilingStops.length === 0 ? (
                    <div className="p-5 text-center border-2 border-dashed rounded-xl bg-purple-50/20 border-purple-200 dark:border-purple-900/50 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        No stops scheduled for today yet. Plan your route now or start trip directly.
                      </p>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => {
                          setIsSpotVisitModal(false);
                          setShowAddStopModal(true);
                        }}
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Plan First Stop
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl border text-xs text-center font-medium">
                        <div>Planned Stops: <strong className="text-primary">{reconcilingStops.length}</strong></div>
                        <div>Target Bags: <strong className="text-purple-600">{reconcilingStops.reduce((sum, s) => sum + (s.target_order_bags || 0), 0)}</strong></div>
                        <div>Target Collection: <strong className="text-emerald-600">₹{reconcilingStops.reduce((sum, s) => sum + (s.target_collection_value || 0), 0).toLocaleString('en-IN')}</strong></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {reconcilingStops.map((stop, idx) => (
                          <div key={stop.id || idx} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-2 shadow-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h4 className="font-bold text-xs text-foreground">{stop.dealer_name}</h4>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {stop.visit_purpose}
                                </Badge>
                              </div>
                              {stop.dealer_location && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {stop.dealer_location}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                                {(stop.target_order_bags || 0) > 0 && (
                                  <span className="text-purple-600 font-semibold flex items-center gap-0.5">
                                    <ShoppingBag className="w-3 h-3" /> {stop.target_order_bags} bags
                                  </span>
                                )}
                                {(stop.target_collection_value || 0) > 0 && (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <IndianRupee className="w-3 h-3" /> ₹{Number(stop.target_collection_value).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-red-500" 
                              onClick={() => setReconcilingStops(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Punch Start Odometer Card */}
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-amber-500" />
                        Step 1: Punch Starting Odometer Reading
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Snap a photo of your meter and enter starting KM to begin your day's tour
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-300 text-xs">
                      Morning Start
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Vehicle Type Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Mode of Transport</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setVehicleType('BIKE')}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all",
                          vehicleType === 'BIKE' ? "bg-primary/10 border-primary text-primary shadow-xs" : "bg-muted/10 border-border hover:bg-muted/20"
                        )}
                      >
                        <Bike className="w-4 h-4" /> Two-Wheeler (Bike)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('CAR')}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all",
                          vehicleType === 'CAR' ? "bg-primary/10 border-primary text-primary shadow-xs" : "bg-muted/10 border-border hover:bg-muted/20"
                        )}
                      >
                        <Car className="w-4 h-4" /> Four-Wheeler (Car)
                      </button>
                    </div>
                  </div>

                  {/* Start KM Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="startKm" className="text-xs font-semibold flex items-center justify-between">
                      <span>Starting Odometer Reading (KM) *</span>
                      <span className="text-[11px] text-muted-foreground">{gpsStatus}</span>
                    </Label>
                    <Input
                      id="startKm"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 14250.5"
                      value={startKm}
                      onChange={(e) => setStartKm(e.target.value)}
                      className="text-base font-bold"
                    />
                  </div>

                  {/* Start Meter Photo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Starting Meter Photo *</span>
                      {startPhoto && <span className="text-emerald-600 text-xs">✓ Photo Attached</span>}
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex-1 w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-all text-sm text-muted-foreground">
                        <Camera className="w-5 h-5 text-primary" />
                        <span>{startPhoto ? 'Retake / Change Photo' : 'Snap Starting Odometer Photo'}</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, setStartPhoto)} />
                      </label>
                      {startPhoto && (
                        <div className="relative group w-24 h-16 rounded-lg overflow-hidden border shrink-0">
                          <img src={startPhoto} alt="Start Meter" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setPreviewImage(startPhoto)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={handleStartTrip} 
                    disabled={submitting || !startKm}
                    className="w-full py-6 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-md"
                  >
                    {submitting ? 'Starting Trip...' : '🚀 Start Day Trip & Open Route'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : todayLog.end_km === null ? (
            /* STATE 2: TRIP IN PROGRESS - LIVE AGENDA & END TRIP FORM */
            <div className="space-y-6">
              {/* Trip Active Glowing Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm animate-pulse">
                    {todayLog.vehicle_type === 'CAR' ? <Car className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Trip In Progress</span>
                      <Badge className="bg-amber-600 text-white text-[10px] uppercase">Live</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started at <strong>{todayLog.start_km} KM</strong> &middot; Time: {todayLog.start_time ? new Date(todayLog.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsSpotVisitModal(true);
                    setShowAddStopModal(true);
                  }}
                  className="text-xs h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Spot / Unplanned Visit</span>
                </Button>
              </div>

              {/* Live Stops Agenda Checklist */}
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Store className="w-5 h-5 text-blue-600" />
                        <span>Today's Stops Agenda ({reconcilingStops.filter(s => s.visited).length}/{reconcilingStops.length} Visited)</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Check off visits or update actual orders/collections as you complete each counter
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {reconcilingStops.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No stops logged yet. Tap "+ Add Spot / Unplanned Visit" to log counters you visit today.
                    </div>
                  ) : (
                    <div className="divide-y border rounded-xl overflow-hidden">
                      {reconcilingStops.map((stop, idx) => (
                        <div key={stop.id || idx} className="p-3.5 bg-card hover:bg-muted/10 transition-colors space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center mt-0.5 shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-xs text-foreground">{stop.dealer_name}</h4>
                                  {stop.is_unplanned ? (
                                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 py-0">Spot Visit</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] py-0">{stop.visit_purpose}</Badge>
                                  )}
                                </div>
                                {stop.dealer_location && (
                                  <p className="text-[11px] text-muted-foreground">{stop.dealer_location}</p>
                                )}
                              </div>
                            </div>

                            {/* Targets Pill */}
                            <div className="flex items-center gap-2 text-xs">
                              {(stop.target_order_bags || 0) > 0 && (
                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-purple-200">
                                  Target: {stop.target_order_bags} bags
                                </span>
                              )}
                              {(stop.target_collection_value || 0) > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-200">
                                  Target: ₹{Number(stop.target_collection_value).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Inline Reconciliation Controls */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Visit Status *</Label>
                              <select 
                                value={stop.actual_status || 'PENDING'} 
                                onChange={(e) => updateReconcilingStop(idx, { actual_status: e.target.value as any, visited: e.target.value !== 'SKIPPED' })}
                                className="w-full border rounded-lg p-1.5 text-xs bg-background"
                              >
                                <option value="PENDING">⏳ In Progress / Pending</option>
                                <option value="COMPLETED">✅ Completed &amp; Met</option>
                                <option value="PARTIALLY_FULFILLED">🟡 Partially Fulfilled</option>
                                <option value="NOT_FULFILLED">🔴 Target Missed</option>
                                <option value="CONVERTED_NEW_DEALER">🌟 New Dealer Converted</option>
                                <option value="SKIPPED">❌ Skipped / Closed</option>
                              </select>
                            </div>

                            <div>
                              <Label className="text-[10px] text-muted-foreground">Actual Order (Bags)</Label>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                value={stop.actual_order_bags ?? ''} 
                                onChange={(e) => updateReconcilingStop(idx, { actual_order_bags: Number(e.target.value) })}
                                className="h-8 text-xs font-semibold"
                              />
                            </div>

                            <div>
                              <Label className="text-[10px] text-muted-foreground">Actual Collection (₹)</Label>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                value={stop.actual_collection_value ?? ''} 
                                onChange={(e) => updateReconcilingStop(idx, { actual_collection_value: Number(e.target.value) })}
                                className="h-8 text-xs font-semibold"
                              />
                            </div>

                            <div>
                              <Label className="text-[10px] text-muted-foreground">Shortfall Reason / Notes</Label>
                              <Input 
                                placeholder="e.g. Overstocked, cheque next week" 
                                value={stop.shortfall_reason || stop.actual_notes || ''} 
                                onChange={(e) => updateReconcilingStop(idx, { shortfall_reason: e.target.value, actual_notes: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: End Trip Odometer & Summaries */}
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Step 2: Record End of Day Trip &amp; Submit
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Enter final odometer reading, photo, and review compulsory activity summaries
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-bold">
                      Trip Closer
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* End KM Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="endKm" className="text-xs font-semibold flex items-center justify-between">
                      <span>Ending Odometer Reading (KM) *</span>
                      <span className="text-[11px] text-muted-foreground">Must be &gt; {todayLog.start_km} KM</span>
                    </Label>
                    <Input
                      id="endKm"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 14320.0"
                      value={endKm}
                      onChange={(e) => setEndKm(e.target.value)}
                      className="text-base font-bold"
                    />
                    {endKm && Number(endKm) >= todayLog.start_km && (
                      <p className="text-xs text-emerald-600 font-semibold">
                        ✓ Total Calculated Distance: <strong>{roundNumber(Number(endKm) - todayLog.start_km, 1)} KM</strong>
                      </p>
                    )}
                  </div>

                  {/* End Meter Photo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Ending Meter Photo *</span>
                      {endPhoto && <span className="text-emerald-600 text-xs">✓ Photo Attached</span>}
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex-1 w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-amber-500/60 hover:bg-muted/20 transition-all text-sm text-muted-foreground">
                        <Camera className="w-5 h-5 text-amber-500" />
                        <span>{endPhoto ? 'Retake / Change Photo' : 'Snap Ending Odometer Photo'}</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, setEndPhoto)} />
                      </label>
                      {endPhoto && (
                        <div className="relative group w-24 h-16 rounded-lg overflow-hidden border shrink-0">
                          <img src={endPhoto} alt="End Meter" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setPreviewImage(endPhoto)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 COMPULSORY ACTIVITY SUMMARIES (Auto-synced with Stops) */}
                  <div className="space-y-4 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Daily Activity &amp; Closing Summaries
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Auto-compiled from your stops above. You can edit any box before submitting.
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300 text-[10px] font-bold">
                        * 3 Compulsory Boxes
                      </Badge>
                    </div>

                    {/* 1. Daily Visit Summary */}
                    <div className={cn("space-y-1.5 p-3 rounded-xl border", visitSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200")}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="visitSummary" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <Store className="w-4 h-4 text-blue-600" />
                          <span>1. Daily Visit Summary</span>
                          <span className="text-red-600 font-bold">*</span>
                        </Label>
                        {visitSummary.trim() ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Filled
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold">Compulsory</span>
                        )}
                      </div>
                      <Textarea
                        id="visitSummary"
                        placeholder="List dealers visited & outcomes..."
                        rows={3}
                        value={visitSummary}
                        onChange={(e) => setVisitSummary(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    {/* 2. Payment Collection Summary */}
                    <div className={cn("space-y-1.5 p-3 rounded-xl border", collectionSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200")}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="collectionSummary" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          <span>2. Payment Collection Summary</span>
                          <span className="text-red-600 font-bold">*</span>
                        </Label>
                        {collectionSummary.trim() ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Filled
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold">Compulsory</span>
                        )}
                      </div>
                      <Textarea
                        id="collectionSummary"
                        placeholder="Record collected amounts or write 'Nil'..."
                        rows={2}
                        value={collectionSummary}
                        onChange={(e) => setCollectionSummary(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    {/* 3. Order Summary */}
                    <div className={cn("space-y-1.5 p-3 rounded-xl border", orderSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200")}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="orderSummary" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <ShoppingBag className="w-4 h-4 text-purple-600" />
                          <span>3. Order Summary</span>
                          <span className="text-red-600 font-bold">*</span>
                        </Label>
                        {orderSummary.trim() ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Filled
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold">Compulsory</span>
                        )}
                      </div>
                      <Textarea
                        id="orderSummary"
                        placeholder="Record orders booked or write 'Nil'..."
                        rows={2}
                        value={orderSummary}
                        onChange={(e) => setOrderSummary(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>

                    {/* Route Notes (Optional) */}
                    <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                      <Label htmlFor="routeNotes" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        <span>4. Route Notes / Remarks (Optional)</span>
                      </Label>
                      <Textarea
                        id="routeNotes"
                        placeholder="Bypass detour, weather conditions, or vehicle notes..."
                        rows={2}
                        value={routeNotes}
                        onChange={(e) => setRouteNotes(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleEndTrip} 
                    disabled={submitting || !endKm || Number(endKm) < todayLog.start_km || !visitSummary.trim() || !collectionSummary.trim() || !orderSummary.trim()}
                    className="w-full py-6 text-base font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all"
                  >
                    {submitting ? 'Submitting & Computing Evaluation...' : '🏁 End Day Trip & Submit to HR'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* STATE 3: COMPLETED TRIP FOR TODAY - AUTO PERFORMANCE SCORECARD */
            <div className="space-y-6">
              {/* Performance Scorecard Banner */}
              <Card className="border shadow-md bg-gradient-to-br from-background via-muted/10 to-primary/5">
                <CardHeader className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg font-black">Daily Performance Evaluation</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Target achievement &amp; tour plan fulfillment for {todayLog.date}
                    </CardDescription>
                  </div>
                  <div>
                    {getRatingBadge(todayLog.performance_rating, todayLog.target_achievement_pct)}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* KPI Evaluation Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl border bg-muted/20 space-y-0.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Stops Visited</span>
                      <div className="text-xl font-black text-foreground">
                        {todayLog.total_stops_visited || 0} / {todayLog.total_stops_planned || 0}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 space-y-0.5">
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">Bags Booked</span>
                      <div className="text-xl font-black text-purple-900 dark:text-purple-100">
                        {todayLog.total_actual_bags || 0} <span className="text-xs font-normal text-muted-foreground">/ {todayLog.total_target_bags || 0}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-0.5">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Payment Recovered</span>
                      <div className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                        ₹{Number(todayLog.total_actual_collection || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border bg-primary/10 border-primary/30 space-y-0.5">
                      <span className="text-[11px] text-primary font-medium">Distance Traveled</span>
                      <div className="text-xl font-black text-primary">
                        {todayLog.total_km} KM
                      </div>
                    </div>
                  </div>

                  {/* Reconciled Stops Detailed Table */}
                  {todayLog.stops && todayLog.stops.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-primary" />
                        <span>Planned vs Actual Stops Breakdown</span>
                      </h4>

                      <div className="border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-muted/40 font-semibold text-muted-foreground border-b text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Dealer / Counter</th>
                              <th className="px-3 py-2">Target</th>
                              <th className="px-3 py-2">Actual Outcome</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Notes / Shortfall</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {todayLog.stops.map((stop, idx) => (
                              <tr key={stop.id || idx} className="hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">
                                  {stop.dealer_name}
                                  {stop.is_unplanned && <span className="ml-1 text-[9px] text-blue-600 font-bold">(Spot)</span>}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {(stop.target_order_bags || 0) > 0 && <div>{stop.target_order_bags} bags</div>}
                                  {(stop.target_collection_value || 0) > 0 && <div>₹{Number(stop.target_collection_value).toLocaleString('en-IN')}</div>}
                                  {!(stop.target_order_bags || 0) && !(stop.target_collection_value || 0) && '--'}
                                </td>
                                <td className="px-3 py-2 font-semibold">
                                  {(stop.actual_order_bags || 0) > 0 && <div className="text-purple-600">{stop.actual_order_bags} bags</div>}
                                  {(stop.actual_collection_value || 0) > 0 && <div className="text-emerald-600">₹{Number(stop.actual_collection_value).toLocaleString('en-IN')}</div>}
                                  {!(stop.actual_order_bags || 0) && !(stop.actual_collection_value || 0) && 'Nil'}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-bold py-0",
                                      stop.actual_status === 'COMPLETED' && "bg-emerald-50 text-emerald-700 border-emerald-300",
                                      stop.actual_status === 'CONVERTED_NEW_DEALER' && "bg-purple-50 text-purple-700 border-purple-300",
                                      stop.actual_status === 'PARTIALLY_FULFILLED' && "bg-amber-50 text-amber-700 border-amber-300",
                                      stop.actual_status === 'NOT_FULFILLED' && "bg-red-50 text-red-700 border-red-300",
                                      stop.actual_status === 'SKIPPED' && "bg-gray-100 text-gray-600 border-gray-300"
                                    )}
                                  >
                                    {stop.actual_status || 'PENDING'}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {stop.shortfall_reason || stop.actual_notes || '--'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3 Summary Display Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 space-y-1">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> Visit Summary
                      </span>
                      <p className="text-xs whitespace-pre-wrap">{todayLog.visit_summary}</p>
                    </div>
                    <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 space-y-1">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" /> Payment Collection
                      </span>
                      <p className="text-xs whitespace-pre-wrap">{todayLog.collection_summary}</p>
                    </div>
                    <div className="p-3 rounded-xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 space-y-1">
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" /> Order Summary
                      </span>
                      <p className="text-xs whitespace-pre-wrap">{todayLog.order_summary}</p>
                    </div>
                  </div>

                  {/* Callout: Plan Tomorrow's Beat */}
                  <div className="p-4 rounded-xl border bg-purple-50/30 dark:bg-purple-950/20 border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>Ready for tomorrow? Plan your next day's tour</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Add dealers and targets for tomorrow so your morning roll-out is instant.
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setActiveTab('PLANNER');
                        setPlannerDate(tomorrowStr);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0"
                    >
                      <Target className="w-3.5 h-3.5 mr-1" /> Plan Tomorrow's Stops
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOUR / BEAT PLANNER (Plan Ahead) */}
      {activeTab === 'PLANNER' && (
        <Card className="border shadow-sm">
          <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span>Tour / Beat Planner</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Design your visit schedule and target commitments for any date
              </CardDescription>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Date:</span>
              <div className="flex items-center border rounded-lg overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setPlannerDate(todayStr)}
                  className={cn("px-2.5 py-1 font-medium transition-colors", plannerDate === todayStr ? "bg-primary text-white" : "hover:bg-muted")}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerDate(tomorrowStr)}
                  className={cn("px-2.5 py-1 font-medium transition-colors", plannerDate === tomorrowStr ? "bg-primary text-white" : "hover:bg-muted")}
                >
                  Tomorrow
                </button>
              </div>
              <Input 
                type="date" 
                value={plannerDate} 
                onChange={(e) => setPlannerDate(e.target.value)} 
                className="w-36 h-8 text-xs font-semibold"
              />
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Planner Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border">
              <div className="flex items-center gap-4 text-xs">
                <div>Total Stops: <strong className="text-primary">{plannerStops.length}</strong></div>
                <div>Target Bags: <strong className="text-purple-600">{plannerStops.reduce((sum, s) => sum + (s.target_order_bags || 0), 0)}</strong></div>
                <div>Target Collection: <strong className="text-emerald-600">₹{plannerStops.reduce((sum, s) => sum + (s.target_collection_value || 0), 0).toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsSpotVisitModal(false);
                    setShowAddStopModal(true);
                  }}
                  className="text-xs h-8 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stop
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSavePlan}
                  disabled={savingPlan || plannerStops.length === 0}
                  className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {savingPlan ? 'Saving...' : '💾 Save Tour Plan'}
                </Button>
              </div>
            </div>

            {/* Stops List */}
            {loadingPlan ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading tour plan for {plannerDate}...
              </div>
            ) : plannerStops.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed rounded-xl space-y-2">
                <Target className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <h4 className="text-xs font-bold text-foreground">No stops planned for {plannerDate}</h4>
                <p className="text-[11px] text-muted-foreground">Add dealers, order commitments, and collection targets for this date.</p>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setIsSpotVisitModal(false);
                    setShowAddStopModal(true);
                  }}
                  className="text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Stop 1
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {plannerStops.map((stop, idx) => (
                  <div key={stop.id || idx} className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-foreground">{stop.dealer_name}</h4>
                          <Badge variant="outline" className="text-[10px] py-0">{stop.visit_purpose}</Badge>
                        </div>
                        {stop.dealer_location && (
                          <p className="text-[11px] text-muted-foreground">{stop.dealer_location}</p>
                        )}
                        {stop.plan_notes && (
                          <p className="text-[11px] text-muted-foreground italic">"{stop.plan_notes}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        {(stop.target_order_bags || 0) > 0 && (
                          <span className="font-bold text-purple-600 flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5" /> {stop.target_order_bags} bags
                          </span>
                        )}
                        {(stop.target_collection_value || 0) > 0 && (
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" /> ₹{Number(stop.target_collection_value).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-red-500" 
                        onClick={() => handleDeletePlannerStop(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PAST HISTORY & SCORECARDS */}
      {activeTab === 'HISTORY' && (
        <Card className="border shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Past Travel History &amp; Day Scorecards
            </CardTitle>
            <CardDescription className="text-xs">
              Review past beats, odometer readings, and performance fulfillment ratings
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading history records...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No past travel records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Vehicle</th>
                      <th className="px-4 py-3 font-semibold">Distance</th>
                      <th className="px-4 py-3 font-semibold">Performance Score</th>
                      <th className="px-4 py-3 font-semibold">HR Status</th>
                      <th className="px-4 py-3 font-semibold">Details</th>
                      <th className="px-4 py-3 font-semibold text-right">Photos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-bold whitespace-nowrap">{item.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.vehicle_type === 'CAR' ? '🚗 Car' : '🏍️ Bike'}
                        </td>
                        <td className="px-4 py-3 font-bold whitespace-nowrap">{item.total_km} KM</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getRatingBadge(item.performance_rating, item.target_achievement_pct)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold py-0",
                              item.status === 'APPROVED' && "bg-emerald-50 text-emerald-700 border-emerald-300",
                              item.status === 'REJECTED' && "bg-red-50 text-red-700 border-red-300",
                              item.status === 'PENDING' && "bg-amber-50 text-amber-700 border-amber-300"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setViewingHistoryLog(item)}
                            className="text-[11px] h-7 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Scorecard
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          {item.start_photo && (
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(item.start_photo || null)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-block"
                              title="View Start Photo"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {item.end_photo && (
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(item.end_photo || null)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-block"
                              title="View End Photo"
                            >
                              <Camera className="w-3.5 h-3.5 text-amber-500" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: ADD DEALER STOP / SPOT VISIT */}
      <Dialog open={showAddStopModal} onOpenChange={(open) => !open && setShowAddStopModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              {isSpotVisitModal ? <MapPin className="w-4 h-4 text-blue-600" /> : <Target className="w-4 h-4 text-purple-600" />}
              <span>{isSpotVisitModal ? 'Add Spot / Unplanned Visit' : `Add Planned Stop (${plannerDate || 'Today'})`}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isSpotVisitModal ? 'Record an unscheduled visit conducted along the route' : 'Set counter visit and targets for this stop'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Search & Select from Registered Dealers / Distributors */}
            <div className="space-y-2 p-3 rounded-xl border bg-muted/15">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Choose Registered Dealer or Distributor (Optional)</span>
                </Label>
                <div className="flex items-center gap-1">
                  {(['ALL', 'Dealer', 'Distributor'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPartyTypeFilter(t)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                        partyTypeFilter === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t === 'ALL' ? 'All' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search by dealer/distributor name, city, or code..."
                  value={partySearchQuery}
                  onChange={(e) => setPartySearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {partySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPartySearchQuery('')}
                    className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Quick Select Scroll Area */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border rounded-lg p-1 bg-background/50">
                {filteredParties.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-muted-foreground">
                    {parties.length === 0 ? 'Loading parties...' : 'No matching dealer or distributor found. Type name manually below.'}
                  </div>
                ) : (
                  filteredParties.slice(0, 50).map((p) => {
                    const isSelected = stopForm.dealer_id === p.id || stopForm.dealer_name === p.name;
                    return (
                      <button
                        key={`${p.type}-${p.id}`}
                        type="button"
                        onClick={() => handlePartySelect(p)}
                        className={cn(
                          "w-full text-left p-1.5 rounded-md flex items-center justify-between gap-2 text-xs transition-colors",
                          isSelected ? "bg-primary/15 border border-primary/30 text-primary font-bold" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] px-1 py-0 shrink-0 font-semibold",
                              p.type === 'Distributor' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {p.type}
                          </Badge>
                          <span className="font-semibold text-foreground truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                          {p.city && <span>📍 {p.city}</span>}
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Dealer Name Input */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Dealer / Counter / Lead Name *</Label>
              <Input 
                placeholder="e.g. Sharma Hardware or New Lead Gupta Stores" 
                value={stopForm.dealer_name} 
                onChange={(e) => setStopForm(prev => ({ ...prev, dealer_name: e.target.value }))}
                className="h-8 text-xs font-semibold"
              />
            </div>

            {/* City / Location */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Location / Market Area</Label>
              <Input 
                placeholder="e.g. Industrial Area Phase 1" 
                value={stopForm.dealer_location} 
                onChange={(e) => setStopForm(prev => ({ ...prev, dealer_location: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Visit Purpose</Label>
              <select 
                value={stopForm.visit_purpose} 
                onChange={(e) => setStopForm(prev => ({ ...prev, visit_purpose: e.target.value as any }))}
                className="w-full border rounded-lg p-2 text-xs bg-background font-medium"
              >
                <option value="ORDER">📦 Order Booking</option>
                <option value="PAYMENT">💰 Payment Collection</option>
                <option value="NEW_LEAD">🤝 New Prospect / Introductory Meeting</option>
                <option value="ROUTINE">☕ Routine Relationship Visit</option>
                <option value="COMPLAINT">⚠️ Complaint / Replacement Resolution</option>
                <option value="OTHER">📋 Other Activity</option>
              </select>
            </div>

            {/* Targets: Bags & Payment */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Target Order (Bags)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 100" 
                  value={stopForm.target_order_bags} 
                  onChange={(e) => setStopForm(prev => ({ ...prev, target_order_bags: e.target.value }))}
                  className="h-8 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Target Collection (₹)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 50000" 
                  value={stopForm.target_collection_value} 
                  onChange={(e) => setStopForm(prev => ({ ...prev, target_collection_value: e.target.value }))}
                  className="h-8 text-xs font-bold"
                />
              </div>
            </div>

            {/* Plan Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Action Notes / Items to pitch</Label>
              <Input 
                placeholder="e.g. Pitch ET-111 waterproof putty, collect overdue cheque" 
                value={stopForm.plan_notes} 
                onChange={(e) => setStopForm(prev => ({ ...prev, plan_notes: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddStopModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveStop} className="text-xs font-bold bg-primary text-white">
              {isSpotVisitModal ? 'Add Spot Visit' : 'Add Stop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW HISTORY LOG / SCORECARD */}
      <Dialog open={!!viewingHistoryLog} onOpenChange={(open) => !open && setViewingHistoryLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <Award className="w-4 h-4 text-primary" />
                <span>Performance Scorecard &middot; {viewingHistoryLog?.date}</span>
              </DialogTitle>
              {viewingHistoryLog && getRatingBadge(viewingHistoryLog.performance_rating, viewingHistoryLog.target_achievement_pct)}
            </div>
            <DialogDescription className="text-xs">
              Distance: {viewingHistoryLog?.total_km} KM &middot; Approved KM: {viewingHistoryLog?.approved_km ?? viewingHistoryLog?.total_km} KM
            </DialogDescription>
          </DialogHeader>

          {viewingHistoryLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Target Fulfillment Grid */}
              <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-xl border text-center font-medium">
                <div>
                  <span className="text-muted-foreground text-[10px]">Stops Visited</span>
                  <div className="text-sm font-bold">{viewingHistoryLog.total_stops_visited || 0} / {viewingHistoryLog.total_stops_planned || 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Bags Booked</span>
                  <div className="text-sm font-bold text-purple-600">{viewingHistoryLog.total_actual_bags || 0} / {viewingHistoryLog.total_target_bags || 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Collection</span>
                  <div className="text-sm font-bold text-emerald-600">₹{Number(viewingHistoryLog.total_actual_collection || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Stops Table */}
              {viewingHistoryLog.stops && viewingHistoryLog.stops.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground border-b text-[10px]">
                      <tr>
                        <th className="px-2.5 py-1.5">Dealer</th>
                        <th className="px-2.5 py-1.5">Target</th>
                        <th className="px-2.5 py-1.5">Actual</th>
                        <th className="px-2.5 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingHistoryLog.stops.map((s, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1.5 font-medium">{s.dealer_name}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">
                            {(s.target_order_bags || 0) > 0 ? `${s.target_order_bags}b ` : ''}
                            {(s.target_collection_value || 0) > 0 ? `₹${s.target_collection_value}` : ''}
                          </td>
                          <td className="px-2.5 py-1.5 font-bold">
                            {(s.actual_order_bags || 0) > 0 ? `${s.actual_order_bags}b ` : ''}
                            {(s.actual_collection_value || 0) > 0 ? `₹${s.actual_collection_value}` : ''}
                          </td>
                          <td className="px-2.5 py-1.5">
                            <span className="text-[10px] font-semibold">{s.actual_status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3 Summaries */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg border bg-blue-50/30 text-xs space-y-0.5">
                  <strong className="text-blue-700">Visit Summary:</strong>
                  <p className="whitespace-pre-wrap">{viewingHistoryLog.visit_summary}</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-emerald-50/30 text-xs space-y-0.5">
                  <strong className="text-emerald-700">Payment Collection:</strong>
                  <p className="whitespace-pre-wrap">{viewingHistoryLog.collection_summary}</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-purple-50/30 text-xs space-y-0.5">
                  <strong className="text-purple-700">Order Summary:</strong>
                  <p className="whitespace-pre-wrap">{viewingHistoryLog.order_summary}</p>
                </div>
              </div>

              {viewingHistoryLog.hr_notes && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>HR Verification Note:</strong> {viewingHistoryLog.hr_notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
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

function roundNumber(num: number, dec: number) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

export default DailyTravelPage;
