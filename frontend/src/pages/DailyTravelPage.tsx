import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { travelService, DailyTravelLogItem } from '@/api/services/travel.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Upload, 
  Eye, 
  RefreshCw,
  Bike,
  Car,
  Navigation,
  Info,
  IndianRupee,
  ShoppingBag,
  Store,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const DailyTravelPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [todayLog, setTodayLog] = useState<DailyTravelLogItem | null>(null);
  const [history, setHistory] = useState<DailyTravelLogItem[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Punch Start Form
  const [startKm, setStartKm] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'CAR' | 'OTHER'>('BIKE');
  const [startPhoto, setStartPhoto] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<string>('Detecting GPS location...');

  // Punch End Form - Compulsory Summaries
  const [endKm, setEndKm] = useState<string>('');
  const [endPhoto, setEndPhoto] = useState<string>('');
  const [visitSummary, setVisitSummary] = useState<string>('');
  const [collectionSummary, setCollectionSummary] = useState<string>('');
  const [orderSummary, setOrderSummary] = useState<string>('');
  const [routeNotes, setRouteNotes] = useState<string>('');

  // Lightbox for photos & log viewer
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewingHistoryLog, setViewingHistoryLog] = useState<DailyTravelLogItem | null>(null);

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
      (err) => {
        setGpsStatus('⚠️ GPS access denied/unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const loadTodayLog = async () => {
    try {
      setLoadingToday(true);
      const res = await travelService.getToday();
      const log = res.data?.data || null;
      setTodayLog(log);
      if (log) {
        if (log.start_km !== undefined) setStartKm(String(log.start_km));
        if (log.vehicle_type) setVehicleType(log.vehicle_type);
        if (log.end_km !== null && log.end_km !== undefined) setEndKm(String(log.end_km));
        if (log.visit_summary) setVisitSummary(log.visit_summary);
        if (log.collection_summary) setCollectionSummary(log.collection_summary);
        if (log.order_summary) setOrderSummary(log.order_summary);
      }
    } catch (err) {
      console.error('Failed to load today travel log:', err);
    } finally {
      setLoadingToday(false);
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
  }, [fetchGps]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
      setTodayLog(res.data?.data || null);
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Failed to start trip', description: err.response?.data?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndTrip = async () => {
    if (!endKm || isNaN(Number(endKm))) {
      toast({ title: 'Invalid Ending KM', description: 'Please enter ending odometer reading', variant: 'destructive' });
      return;
    }

    if (todayLog && Number(endKm) < todayLog.start_km) {
      toast({ title: 'Ending KM Mismatch', description: `Ending KM must be greater than starting KM (${todayLog.start_km})`, variant: 'destructive' });
      return;
    }

    if (!visitSummary.trim()) {
      toast({ title: 'Daily Visit Summary Required *', description: 'Please enter details of dealers/sites visited today before submitting.', variant: 'destructive' });
      return;
    }

    if (!collectionSummary.trim()) {
      toast({ title: 'Payment Collection Required *', description: 'Please enter payment collection details (or write "Nil" if none).', variant: 'destructive' });
      return;
    }

    if (!orderSummary.trim()) {
      toast({ title: 'Order Summary Required *', description: 'Please enter order booking details (or write "Nil" if none).', variant: 'destructive' });
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
      });
      const data = res.data?.data;
      toast({ title: 'Day Trip Ended! 🏁', description: `Total ${data?.total_km || 0} KM submitted for HR verification` });
      setTodayLog(data);
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Failed to end trip', description: err.response?.data?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // State calculations
  const isStarted = todayLog && todayLog.start_km !== undefined && todayLog.start_km !== null;
  const isEnded = todayLog && todayLog.end_km !== null && todayLog.end_km !== undefined;

  const currentDiffKm = (endKm && todayLog) ? Math.max(0, Number(endKm) - todayLog.start_km) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Gauge className="w-6 h-6" />
            </div>
            Daily Travel Log (KM Punch)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record morning &amp; evening odometer readings for verified travel allowances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadTodayLog(); loadHistory(); fetchGps(); }}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Today Punch Card */}
      <Card className="border shadow-md overflow-hidden bg-gradient-to-b from-card to-background">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Today: {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {todayLog && (
              <Badge 
                variant={todayLog.status === 'APPROVED' ? 'default' : todayLog.status === 'REJECTED' ? 'destructive' : 'secondary'}
                className={cn(
                  "font-medium text-xs px-2.5 py-0.5",
                  todayLog.status === 'APPROVED' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                  todayLog.status === 'PENDING' && "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400"
                )}
              >
                {todayLog.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                {todayLog.status === 'PENDING' && <Clock className="w-3 h-3 mr-1 inline" />}
                {todayLog.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1 inline" />}
                {todayLog.status === 'APPROVED' ? 'HR Verified' : todayLog.status === 'REJECTED' ? 'Rejected' : 'Pending HR Verification'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* GPS Banner */}
          <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg border">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{gpsLocation || gpsStatus}</span>
            </div>
            <button onClick={fetchGps} className="text-primary hover:underline font-medium text-[11px] shrink-0 ml-2">
              Retake GPS
            </button>
          </div>

          {/* STEP 1: START DAY TRIP */}
          {!isStarted ? (
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-3">
                <h3 className="text-lg font-bold text-foreground">Step 1: Punch Starting KM</h3>
                <p className="text-xs text-muted-foreground">Take a photo of your bike/car meter before beginning client visits.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Vehicle Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType('BIKE')}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all",
                        vehicleType === 'BIKE' 
                          ? "border-primary bg-primary/10 text-primary shadow-sm" 
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Bike className="w-5 h-5" /> Bike / 2W
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleType('CAR')}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all",
                        vehicleType === 'CAR' 
                          ? "border-primary bg-primary/10 text-primary shadow-sm" 
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Car className="w-5 h-5" /> Car / 4W
                    </button>
                  </div>
                </div>

                {/* Starting KM Input */}
                <div className="space-y-2">
                  <Label htmlFor="startKm" className="text-xs font-semibold">Starting Odometer Reading (KM) *</Label>
                  <Input
                    id="startKm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 14250.5"
                    className="text-lg font-bold tracking-wider"
                    value={startKm}
                    onChange={(e) => setStartKm(e.target.value)}
                  />
                </div>
              </div>

              {/* Start Meter Photo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Starting Meter Photo</span>
                  {startPhoto && <span className="text-emerald-600 text-xs">✓ Photo Attached</span>}
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex-1 w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-all text-sm text-muted-foreground">
                    <Camera className="w-5 h-5 text-primary" />
                    <span>{startPhoto ? 'Retake / Change Photo' : 'Snap Odometer Photo'}</span>
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
                className="w-full py-6 text-base font-bold shadow-lg"
              >
                {submitting ? 'Recording...' : '🚀 Start Day Trip'}
              </Button>
            </div>
          ) : !isEnded ? (
            /* STEP 2: TRIP IN PROGRESS -> PUNCH END KM */
            <div className="space-y-6">
              {/* Started Summary Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Trip In Progress ({todayLog.vehicle_type})
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {todayLog.start_km.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">KM (Start)</span>
                  </div>
                  {todayLog.start_time && (
                    <p className="text-xs text-muted-foreground">
                      Punched at {new Date(todayLog.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {todayLog.start_photo && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Start Meter:</span>
                    <button 
                      type="button" 
                      onClick={() => setPreviewImage(todayLog.start_photo || null)}
                      className="relative w-20 h-14 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      <img src={todayLog.start_photo} alt="Start Meter" className="w-full h-full object-cover" />
                    </button>
                  </div>
                )}
              </div>

              {/* Punch End Form */}
              <div className="border-l-4 border-amber-500 pl-3">
                <h3 className="text-lg font-bold text-foreground">Step 2: Punch Ending KM</h3>
                <p className="text-xs text-muted-foreground">End of day? Take a photo of your meter and enter your final KM reading.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endKm" className="text-xs font-semibold">Ending Odometer Reading (KM) *</Label>
                  <Input
                    id="endKm"
                    type="number"
                    min={todayLog.start_km}
                    step="0.1"
                    placeholder={`Must be >= ${todayLog.start_km}`}
                    className="text-lg font-bold tracking-wider"
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                  />
                </div>

                <div className="bg-muted/30 border rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">Calculated Distance:</span>
                  <div className="text-2xl font-black text-primary">
                    {currentDiffKm > 0 ? `${currentDiffKm.toFixed(1)} KM` : '-- KM'}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Difference = End KM - Start KM</span>
                </div>
              </div>

              {/* End Meter Photo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Ending Meter Photo</span>
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

              {/* 3 COMPULSORY ACTIVITY SUMMARIES */}
              <div className="space-y-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Daily Activity & Closing Summaries
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Fill all 3 compulsory boxes before submitting your day's travel to HR.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-600 border-red-300 text-[10px] font-bold">
                    * 3 Mandatory Fields
                  </Badge>
                </div>

                {/* 1. Daily Visit Summary (Compulsory) */}
                <div className={cn(
                  "space-y-1.5 p-3 rounded-xl border transition-all",
                  visitSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200 dark:border-red-900/60"
                )}>
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
                    placeholder="e.g. Visited 6 dealers across North Market: Sharma Hardware, Krishna Paints, Gupta Sanitary... (Mention dealer names & discussion points)"
                    rows={3}
                    value={visitSummary}
                    onChange={(e) => setVisitSummary(e.target.value)}
                    className="text-xs resize-y bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required: list of all clients, dealers, or project sites visited today.
                  </p>
                </div>

                {/* 2. Payment Collection Summary (Compulsory) */}
                <div className={cn(
                  "space-y-1.5 p-3 rounded-xl border transition-all",
                  collectionSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200 dark:border-red-900/60"
                )}>
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
                    placeholder="e.g. Collected ₹45,000 via Cheque from Sharma H/W, ₹12,000 Cash from Krishna Paints. (Write 'Nil' if no payment was collected today)"
                    rows={2}
                    value={collectionSummary}
                    onChange={(e) => setCollectionSummary(e.target.value)}
                    className="text-xs resize-y bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required: write amount, payment mode, and dealer. (Write "Nil" if no collection).
                  </p>
                </div>

                {/* 3. Order Summary (Compulsory) */}
                <div className={cn(
                  "space-y-1.5 p-3 rounded-xl border transition-all",
                  orderSummary.trim() ? "bg-muted/20 border-border" : "bg-red-50/20 border-red-200 dark:border-red-900/60"
                )}>
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
                    placeholder="e.g. Booked 3 orders: 50 bags Wall Putty for Om Traders, 20 buckets Primer for Krishna Paints. (Write 'Nil' if no orders booked today)"
                    rows={2}
                    value={orderSummary}
                    onChange={(e) => setOrderSummary(e.target.value)}
                    className="text-xs resize-y bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required: write booked orders, items, and quantities. (Write "Nil" if no orders).
                  </p>
                </div>

                {/* 4. Route Notes / Extra Remarks (Optional) */}
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <Label htmlFor="routeNotes" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span>4. Route Notes / Extra Remarks (Optional)</span>
                  </Label>
                  <Textarea
                    id="routeNotes"
                    placeholder="e.g. Traffic diversion via bypass road, weather conditions, or vehicle notes..."
                    rows={2}
                    value={routeNotes}
                    onChange={(e) => setRouteNotes(e.target.value)}
                    className="text-xs resize-y bg-background"
                  />
                </div>
              </div>

              {/* Validation Warning if incomplete */}
              {(!visitSummary.trim() || !collectionSummary.trim() || !orderSummary.trim()) && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Please fill <strong>Daily Visit Summary</strong>, <strong>Payment Collection</strong>, and <strong>Order Summary</strong> to enable submission.
                  </span>
                </div>
              )}

              <Button 
                onClick={handleEndTrip} 
                disabled={submitting || !endKm || Number(endKm) < todayLog.start_km || !visitSummary.trim() || !collectionSummary.trim() || !orderSummary.trim()}
                className="w-full py-6 text-base font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all"
              >
                {submitting ? 'Submitting...' : '🏁 End Day Trip & Submit to HR'}
              </Button>
            </div>
          ) : (
            /* STEP 3: COMPLETED TRIP FOR TODAY */
            <div className="space-y-5">
              {/* Status Alert Box */}
              {todayLog.status === 'APPROVED' ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Travel Approved by HR</span>
                  </div>
                  <p className="text-sm">
                    {todayLog.approved_km !== todayLog.total_km ? (
                      <span>
                        HR adjusted approved distance to <strong>{todayLog.approved_km} KM</strong> (Submitted: {todayLog.total_km} KM).
                      </span>
                    ) : (
                      <span>Full <strong>{todayLog.approved_km} KM</strong> approved and credited to payroll calculation.</span>
                    )}
                  </p>
                  {todayLog.hr_notes && (
                    <div className="text-xs bg-white/70 dark:bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <strong>HR Remark:</strong> {todayLog.hr_notes}
                    </div>
                  )}
                  {todayLog.verified_by && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Verified by {todayLog.verified_by} at {todayLog.verified_at ? new Date(todayLog.verified_at).toLocaleTimeString() : ''}
                    </p>
                  )}
                </div>
              ) : todayLog.status === 'REJECTED' ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Travel Rejected by HR</span>
                  </div>
                  {todayLog.hr_notes && (
                    <p className="text-sm bg-white/70 dark:bg-red-900/40 p-2.5 rounded-lg border border-red-200 dark:border-red-800">
                      <strong>Reason:</strong> {todayLog.hr_notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span>Pending HR Verification</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Your {todayLog.total_km} KM trip has been submitted. HR will review the meter photos and approve for payroll calculation.
                  </p>
                </div>
              )}

              {/* Meter Summary Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Start Reading</span>
                  <div className="text-lg sm:text-xl font-bold">{todayLog.start_km} KM</div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground">End Reading</span>
                  <div className="text-lg sm:text-xl font-bold">{todayLog.end_km} KM</div>
                </div>
                <div className="p-3 rounded-xl border bg-primary/10 border-primary/30">
                  <span className="text-xs text-primary font-medium">Total Distance</span>
                  <div className="text-lg sm:text-xl font-black text-primary">{todayLog.total_km} KM</div>
                </div>
              </div>

              {/* Photos Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Start Meter Photo</span>
                  {todayLog.start_photo ? (
                    <button 
                      type="button" 
                      onClick={() => setPreviewImage(todayLog.start_photo || null)}
                      className="w-full h-32 rounded-xl overflow-hidden border block hover:opacity-90 transition-opacity"
                    >
                      <img src={todayLog.start_photo} alt="Start Meter" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-32 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">End Meter Photo</span>
                  {todayLog.end_photo ? (
                    <button 
                      type="button" 
                      onClick={() => setPreviewImage(todayLog.end_photo || null)}
                      className="w-full h-32 rounded-xl overflow-hidden border block hover:opacity-90 transition-opacity"
                    >
                      <img src={todayLog.end_photo} alt="End Meter" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-32 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No Photo
                    </div>
                  )}
                </div>
              </div>

              {/* DAILY ACTIVITY SUMMARIES SUBMITTED */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Daily Activity Summaries Submitted</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Visit Summary Card */}
                  <div className="p-3 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                      <Store className="w-3.5 h-3.5" />
                      <span>Daily Visit Summary</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-normal">
                      {todayLog.visit_summary || 'No visit summary recorded.'}
                    </p>
                  </div>

                  {/* Payment Collection Card */}
                  <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Payment Collection</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-normal">
                      {todayLog.collection_summary || 'Nil'}
                    </p>
                  </div>

                  {/* Order Summary Card */}
                  <div className="p-3 rounded-xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order Summary</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-normal">
                      {todayLog.order_summary || 'Nil'}
                    </p>
                  </div>
                </div>

                {todayLog.so_notes && (
                  <div className="p-2.5 rounded-lg bg-muted/30 border text-xs">
                    <span className="font-semibold text-muted-foreground">Route Notes / Remarks:</span> {todayLog.so_notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TRAVEL HISTORY SECTION */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            My Past Travel History
          </CardTitle>
          <CardDescription className="text-xs">
            Review past travel entries, approval statuses, and HR verification notes
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loadingHistory ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading travel history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No past travel records found.
            </div>
          ) : (
            <div className="divide-y overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Start KM</th>
                    <th className="px-4 py-3 font-semibold">End KM</th>
                    <th className="px-4 py-3 font-semibold">Distance</th>
                    <th className="px-4 py-3 font-semibold">Approved KM</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Activity Summaries</th>
                    <th className="px-4 py-3 font-semibold">HR Note</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {item.vehicle_type === 'CAR' ? '🚗 Car' : '🏍️ Bike'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.start_km}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.end_km !== null ? item.end_km : <span className="text-amber-500 italic">In progress</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {item.total_km} KM
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold">
                        {item.status === 'APPROVED' ? (
                          <span className={item.approved_km !== item.total_km ? 'text-amber-600' : 'text-emerald-600'}>
                            {item.approved_km} KM
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
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
                      <td className="px-4 py-3 text-xs max-w-xs">
                        {item.visit_summary || item.collection_summary || item.order_summary ? (
                          <button
                            type="button"
                            onClick={() => setViewingHistoryLog(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View 3 Summaries</span>
                          </button>
                        ) : item.so_notes ? (
                          <span className="text-muted-foreground truncate block max-w-[150px]" title={item.so_notes}>
                            {item.so_notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={item.hr_notes || ''}>
                        {item.hr_notes || '--'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        {item.start_photo && (
                          <button 
                            type="button" 
                            onClick={() => setPreviewImage(item.start_photo || null)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-block"
                            title="View Start Photo"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        {item.end_photo && (
                          <button 
                            type="button" 
                            onClick={() => setPreviewImage(item.end_photo || null)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-block"
                            title="View End Photo"
                          >
                            <Camera className="w-4 h-4 text-amber-500" />
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

      {/* History Log Summaries Dialog */}
      <Dialog open={!!viewingHistoryLog} onOpenChange={(open) => !open && setViewingHistoryLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" />
              <span>Activity Summaries &middot; {viewingHistoryLog?.date}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Travel Distance: {viewingHistoryLog?.total_km} KM &middot; Status: {viewingHistoryLog?.status}
            </DialogDescription>
          </DialogHeader>

          {viewingHistoryLog && (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Store className="w-3.5 h-3.5" />
                  <span>1. Daily Visit Summary</span>
                </div>
                <p className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                  {viewingHistoryLog.visit_summary || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>2. Payment Collection Summary</span>
                </div>
                <p className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                  {viewingHistoryLog.collection_summary || 'Nil'}
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>3. Order Summary</span>
                </div>
                <p className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                  {viewingHistoryLog.order_summary || 'Nil'}
                </p>
              </div>

              {viewingHistoryLog.so_notes && (
                <div className="p-2.5 rounded-lg bg-muted/30 border text-xs">
                  <span className="font-semibold text-muted-foreground">Route Notes / Remarks:</span> {viewingHistoryLog.so_notes}
                </div>
              )}

              {viewingHistoryLog.hr_notes && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">HR Verification Note:</span> {viewingHistoryLog.hr_notes}
                </div>
              )}
            </div>
          )}
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

export default DailyTravelPage;
