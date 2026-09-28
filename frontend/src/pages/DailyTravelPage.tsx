import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Check,
  RotateCcw,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatIndianNumber, formatIndianCurrency, formatIndianWords } from '@/utils/format';
import { SOScorecardTab } from './travel/components/SOScorecardTab';

export const VISIT_PURPOSE_OPTIONS = [
  { id: 'ORDER', label: 'Order Booking', icon: '📦', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' },
  { id: 'PAYMENT', label: 'Payment Collection', icon: '💰', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { id: 'PROJECT_VISIT', label: 'Project / Site Visit', icon: '🏗️', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300' },
  { id: 'MASON_MEET', label: 'Masonry Meet', icon: '🧱', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300' },
  { id: 'DEALER_MEET', label: 'Dealer Meet', icon: '🏬', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300' },
  { id: 'DISTRIBUTOR_MEET', label: 'Distributor Meet', icon: '🏭', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300' },
  { id: 'NEW_LEAD', label: 'New Prospect', icon: '🤝', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' },
  { id: 'ROUTINE', label: 'Routine Visit', icon: '☕', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' },
  { id: 'COMPLAINT', label: 'Complaint / Issue', icon: '⚠️', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' },
  { id: 'OTHER', label: 'Other', icon: '📋', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
];

export const renderVisitPurposeBadges = (rawPurpose?: string) => {
  if (!rawPurpose) return null;
  const parts = rawPurpose.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((p, idx) => {
        const matched = VISIT_PURPOSE_OPTIONS.find(o => 
          p.toUpperCase() === o.id || p.toUpperCase().startsWith(`${o.id} `) || p.toUpperCase().startsWith(`${o.id}(`)
        );
        return (
          <span 
            key={idx} 
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 shrink-0",
              matched ? matched.badgeBg : "bg-muted text-muted-foreground border-border"
            )}
          >
            <span>{matched?.icon || '📌'}</span>
            <span>{matched ? (p.toUpperCase().startsWith('OTHER (') ? p : matched.label) : p}</span>
          </span>
        );
      })}
    </div>
  );
};

export const DailyTravelPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navigation tab with URL searchParams synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab')?.toUpperCase();
  const [activeTab, setActiveTab] = useState<'TRIP' | 'PLANNER' | 'HISTORY' | 'SCORECARD'>(() => {
    if (urlTab === 'SCORECARD' || urlTab === 'PLANNER' || urlTab === 'HISTORY' || urlTab === 'TRIP') {
      return urlTab;
    }
    return 'TRIP';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab')?.toUpperCase();
    if (tabParam === 'SCORECARD' || tabParam === 'PLANNER' || tabParam === 'HISTORY' || tabParam === 'TRIP') {
      setActiveTab(tabParam as any);
    } else {
      setActiveTab('TRIP');
    }
  }, [searchParams]);

  const handleSelectTab = (tab: 'TRIP' | 'PLANNER' | 'HISTORY' | 'SCORECARD') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

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
  const [viewingStopDetails, setViewingStopDetails] = useState<TourPlanStopItem | null>(null);

  // Unified Camera & GPS Watermarking State
  const cameraVideoRef = React.useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<'START_ODOMETER' | 'END_ODOMETER' | 'VISIT' | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [punchingStop, setPunchingStop] = useState<TourPlanStopItem | null>(null);
  const [punchingIndex, setPunchingIndex] = useState<number>(-1);
  const [savingVisitPunch, setSavingVisitPunch] = useState<boolean>(false);
  const [punchForm, setPunchForm] = useState<{
    actual_status: 'COMPLETED' | 'PARTIALLY_FULFILLED' | 'NOT_FULFILLED' | 'CONVERTED_NEW_DEALER' | 'SKIPPED';
    actual_order_bags: string;
    actual_collection_value: string;
    shortfall_reason: string;
    actual_notes: string;
    next_visit_date: string;
    visit_photo: string;
    gps_location: string;
  }>({
    actual_status: 'COMPLETED',
    actual_order_bags: '',
    actual_collection_value: '',
    shortfall_reason: '',
    actual_notes: '',
    next_visit_date: '',
    visit_photo: '',
    gps_location: '',
  });

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
    visit_purposes: string[];
    other_purpose_note: string;
    target_order_bags: string;
    target_collection_value: string;
    plan_notes: string;
  }>({
    dealer_id: '',
    dealer_name: '',
    dealer_location: '',
    visit_purposes: ['ORDER'],
    other_purpose_note: '',
    target_order_bags: '',
    target_collection_value: '',
    plan_notes: '',
  });

  const toggleVisitPurpose = (purposeId: string) => {
    setStopForm(prev => {
      const exists = prev.visit_purposes.includes(purposeId);
      if (exists) {
        if (prev.visit_purposes.length === 1) {
          toast({ title: 'At least 1 purpose required', description: 'Please keep at least one visit purpose selected.' });
          return prev;
        }
        return { ...prev, visit_purposes: prev.visit_purposes.filter(p => p !== purposeId) };
      } else {
        return { ...prev, visit_purposes: [...prev.visit_purposes, purposeId] };
      }
    });
  };

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
          if (data.start_photo) setStartPhoto(data.start_photo);
          if (data.end_km !== null && data.end_km !== undefined) setEndKm(String(data.end_km));
          if (data.end_photo) setEndPhoto(data.end_photo);
          if (data.visit_summary) setVisitSummary(data.visit_summary);
          if (data.collection_summary) setCollectionSummary(data.collection_summary);
          if (data.order_summary) setOrderSummary(data.order_summary);

          // Populate reconciling stops with existing stops
          if (data.stops && Array.isArray(data.stops) && data.stops.length > 0) {
            setReconcilingStops(data.stops);
          } else {
            try {
              const planRes = await travelService.getPlan(todayStr);
              if (planRes.data?.data && planRes.data.data.length > 0) {
                setReconcilingStops(planRes.data.data);
              }
            } catch (e) {
              console.error('Failed to load today plan fallback:', e);
            }
          }
        }
      } else {
        setTodayLog(null);
        try {
          const planRes = await travelService.getPlan(todayStr);
          if (planRes.data?.data && planRes.data.data.length > 0) {
            setReconcilingStops(planRes.data.data);
          } else {
            setReconcilingStops([]);
          }
        } catch (e) {
          setReconcilingStops([]);
        }
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

  // Emboss GPS Watermark, Timestamp, Tag, and Officer Info onto Canvas
  const embossGpsWatermark = (
    source: HTMLVideoElement | HTMLImageElement,
    tagLabel: string,
    coordsOverride?: string
  ): string => {
    try {
      const canvas = document.createElement('canvas');
      const srcWidth = (source instanceof HTMLVideoElement ? source.videoWidth : (source.naturalWidth || source.width)) || 1280;
      const srcHeight = (source instanceof HTMLVideoElement ? source.videoHeight : (source.naturalHeight || source.height)) || 960;

      // Scale to max width 1280 to maintain high resolution while keeping payload optimal
      const maxW = 1280;
      const scale = srcWidth > maxW ? maxW / srcWidth : 1;
      const imgWidth = Math.round(srcWidth * scale);
      const imgHeight = Math.round(srcHeight * scale);

      // Height for dark slate info bar at bottom (approx 15-18% of image height, min 90px, max 160px)
      const overlayHeight = Math.min(160, Math.max(90, Math.round(imgHeight * 0.16)));

      canvas.width = imgWidth;
      canvas.height = imgHeight + overlayHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // 1. Draw photo in upper region
      ctx.drawImage(source, 0, 0, imgWidth, imgHeight);

      // 2. Draw dark slate bottom bar (#0f172a = slate-900)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, imgHeight, canvas.width, overlayHeight);

      // 3. Draw radar / GPS indicator box on left
      const padding = Math.max(12, Math.round(canvas.width * 0.02));
      const badgeSize = Math.max(64, overlayHeight - (padding * 2));
      const badgeX = padding;
      const badgeY = imgHeight + padding;
      const radius = 8;

      ctx.save();
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(badgeX, badgeY, badgeSize, badgeSize, radius);
      } else {
        ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
      }
      ctx.clip();
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);

      // Radar grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const off = (badgeSize / 4) * i;
        ctx.beginPath();
        ctx.moveTo(badgeX + off, badgeY);
        ctx.lineTo(badgeX + off, badgeY + badgeSize);
        ctx.moveTo(badgeX, badgeY + off);
        ctx.lineTo(badgeX + badgeSize, badgeY + off);
        ctx.stroke();
      }
      // Green center GPS point
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, Math.max(5, badgeSize * 0.1), 0, Math.PI * 2);
      ctx.fill();
      // Radar ripple
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Stamped Text Info
      const textX = badgeX + badgeSize + padding;
      const maxTextWidth = canvas.width - textX - padding;
      const fontSize = Math.max(13, Math.floor(overlayHeight * 0.18));

      // Line 1: Purpose Tag & Timestamp (White bold)
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize + 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      let textY = imgHeight + padding + fontSize;
      ctx.fillText(`📌 ${tagLabel.toUpperCase()} • ${dateStr} ${timeStr}`, textX, textY, maxTextWidth);

      // Line 2: GPS coordinates (Sky blue / cyan)
      textY += fontSize + 6;
      ctx.fillStyle = '#38bdf8'; // sky-400
      ctx.font = `bold ${fontSize}px monospace, sans-serif`;
      const effectiveGps = coordsOverride || gpsLocation;
      const locDisplay = effectiveGps ? `📍 GPS: ${effectiveGps}` : `📍 GPS: Acquired (${gpsStatus})`;
      ctx.fillText(locDisplay, textX, textY, maxTextWidth);

      // Line 3: Officer / User info & security badge (Slate-400)
      textY += fontSize + 6;
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = `${Math.max(11, fontSize - 2)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      const officerName = (user?.name || user?.email?.split('@')[0] || 'Field Officer').toUpperCase();
      ctx.fillText(`👤 OFFICER: ${officerName} • 🛡️ VERIFIED GEO-STAMP PROOF`, textX, textY, maxTextWidth);

      return canvas.toDataURL('image/jpeg', 0.82);
    } catch (e) {
      console.error('Error in embossGpsWatermark:', e);
      return '';
    }
  };

  // Generic File Upload with Automatic GPS Watermarking
  const handlePhotoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    tagLabel: string,
    onSuccess: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please select an image under 8MB.', variant: 'destructive' });
      return;
    }

    fetchGps(); // Refresh GPS location
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const embossed = embossGpsWatermark(img, tagLabel);
        onSuccess(embossed || (reader.result as string));
        toast({ title: 'Photo Attached & GPS Embossed! 📍', description: 'Location, timestamp, and officer details stamped.' });
      };
      img.onerror = () => {
        onSuccess(reader.result as string);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
        stops: reconcilingStops,
      });
      toast({ title: 'Trip Started! 🚀', description: `Recorded starting at ${startKm} KM (${vehicleType})` });
      const logData = res.data?.data || null;
      setTodayLog(logData);
      if (logData?.stops && logData.stops.length > 0) {
        setReconcilingStops(logData.stops);
      } else if (reconcilingStops.length > 0) {
        setReconcilingStops(reconcilingStops);
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

    let finalPurpose = stopForm.visit_purposes.join(', ');
    if (stopForm.visit_purposes.includes('OTHER') && stopForm.other_purpose_note.trim()) {
      finalPurpose = stopForm.visit_purposes
        .map(p => p === 'OTHER' ? `OTHER (${stopForm.other_purpose_note.trim()})` : p)
        .join(', ');
    }

    const cleanCollection = String(stopForm.target_collection_value || '').replace(/[^0-9]/g, '');
    const cleanBags = String(stopForm.target_order_bags || '').replace(/[^0-9]/g, '');

    const newStop: TourPlanStopItem = {
      id: `temp-${Date.now()}`,
      dealer_id: stopForm.dealer_id || null,
      dealer_name: stopForm.dealer_name.trim(),
      dealer_location: stopForm.dealer_location.trim(),
      visit_purpose: finalPurpose || 'ORDER',
      target_order_bags: Number(cleanBags) || 0,
      target_collection_value: Number(cleanCollection) || 0,
      plan_notes: stopForm.plan_notes.trim(),
      is_unplanned: isSpotVisitModal,
      visited: isSpotVisitModal, // Spot visits conducted on the fly are visited
      actual_status: isSpotVisitModal ? 'COMPLETED' : 'PENDING',
      actual_order_bags: isSpotVisitModal ? (Number(cleanBags) || 0) : 0,
      actual_collection_value: isSpotVisitModal ? (Number(cleanCollection) || 0) : 0,
    };

    if (isSpotVisitModal) {
      // Add spot visit directly to today's active reconciling stops
      setReconcilingStops(prev => [...prev, newStop]);
      toast({ title: 'Spot Visit Added! 📍', description: `Added ${newStop.dealer_name} to today's route.` });
      // Call backend to persist if trip active
      if (todayLog?.id) {
        try {
          const resp = await travelService.addUnplannedStop({
            ...newStop,
            is_unplanned: true,
            visited: true,
            actual_order_bags: Number(cleanBags) || 0,
            actual_collection_value: Number(cleanCollection) || 0,
          });
          if (resp.data?.data?.id) {
            const savedStop = resp.data.data;
            setReconcilingStops(prev => prev.map(s => s.id === newStop.id ? savedStop : s));
          }
        } catch (e) {
          console.error('Failed to sync spot visit to backend:', e);
        }
      }
    } else if (activeTab === 'PLANNER') {
      // Add to planner stops list
      setPlannerStops(prev => [...prev, newStop]);
      toast({ title: 'Stop Added to Plan', description: `${newStop.dealer_name} added to ${plannerDate} plan.` });
    } else {
      // Added pre-trip or during active trip
      setReconcilingStops(prev => [...prev, newStop]);
      toast({ title: 'Stop Added to Today Agenda', description: `${newStop.dealer_name} added.` });
      // If trip is active, persist to DB attached to travel_log
      if (todayLog?.id) {
        try {
          const resp = await travelService.addUnplannedStop({
            ...newStop,
            is_unplanned: false,
            visited: false,
            actual_status: 'PENDING',
          });
          if (resp.data?.data?.id) {
            const savedStop = resp.data.data;
            setReconcilingStops(prev => prev.map(s => s.id === newStop.id ? savedStop : s));
          }
        } catch (e) {
          console.error('Failed to sync planned stop to active trip:', e);
        }
      }
    }

    setShowAddStopModal(false);
    setStopForm({
      dealer_id: '',
      dealer_name: '',
      dealer_location: '',
      visit_purposes: ['ORDER'],
      other_purpose_note: '',
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

  // Open Visit Tracking & Outcome Punch Modal
  const openVisitPunchModal = (stop: TourPlanStopItem, index: number) => {
    setPunchingStop(stop);
    setPunchingIndex(index);
    setPunchForm({
      actual_status: (stop.actual_status && stop.actual_status !== 'PENDING' ? stop.actual_status : 'COMPLETED') as any,
      actual_order_bags: stop.actual_order_bags ? String(stop.actual_order_bags) : '',
      actual_collection_value: stop.actual_collection_value ? String(stop.actual_collection_value) : '',
      shortfall_reason: stop.shortfall_reason || '',
      actual_notes: stop.actual_notes || '',
      next_visit_date: stop.next_visit_date || '',
      visit_photo: stop.visit_photo || '',
      gps_location: stop.gps_location || (gpsLocation ? `${gpsLocation}` : ''),
    });
  };

  // Open Unified Live Camera Modal (Works for Start Odometer, End Odometer, and Visit Modal)
  const openCameraModal = async (target: 'START_ODOMETER' | 'END_ODOMETER' | 'VISIT') => {
    setCameraTarget(target);
    setCameraActive(true);
    fetchGps(); // Auto-refresh location immediately

    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 } },
        });
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play();
        }
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
            cameraVideoRef.current.play();
          }
        } catch (err) {
          console.error('Failed to access camera:', err);
          toast({
            title: 'Camera Access Denied',
            description: 'Please enable camera permission in your browser or choose a photo from files.',
            variant: 'destructive',
          });
          closeCameraModal();
        }
      }
    }, 150);
  };

  // Switch facing mode (Front / Back camera)
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraVideoRef.current?.srcObject) {
      (cameraVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 } },
      });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play();
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play();
        }
      } catch (err) {
        console.error('Failed to switch camera:', err);
      }
    }
  };

  // Close live camera modal & release media stream
  const closeCameraModal = () => {
    if (cameraVideoRef.current?.srcObject) {
      try {
        (cameraVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.error('Error stopping camera tracks:', e);
      }
      cameraVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraTarget(null);
  };

  const stopCamera = closeCameraModal;

  // Snap photo from live video canvas & emboss GPS watermark
  const handleCaptureCameraPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || video.readyState < 2) {
      toast({ title: 'Camera Not Ready', description: 'Please wait for camera stream to load.', variant: 'destructive' });
      return;
    }

    let tag = 'ODOMETER PHOTO';
    if (cameraTarget === 'START_ODOMETER') tag = 'STARTING ODOMETER';
    else if (cameraTarget === 'END_ODOMETER') tag = 'ENDING ODOMETER';
    else if (cameraTarget === 'VISIT') {
      tag = punchingStop?.dealer_name ? `STORE VISIT: ${punchingStop.dealer_name}` : 'STORE FRONT VISIT';
    }

    const watermarked = embossGpsWatermark(video, tag);
    if (!watermarked) {
      toast({ title: 'Capture Error', description: 'Could not capture frame from camera.', variant: 'destructive' });
      return;
    }

    if (cameraTarget === 'START_ODOMETER') {
      setStartPhoto(watermarked);
      toast({ title: 'Start Meter Photo Attached! 📸', description: 'GPS coordinates & timestamp embossed.' });
    } else if (cameraTarget === 'END_ODOMETER') {
      setEndPhoto(watermarked);
      toast({ title: 'End Meter Photo Attached! 📸', description: 'GPS coordinates & timestamp embossed.' });
    } else if (cameraTarget === 'VISIT') {
      setPunchForm((prev) => ({ ...prev, visit_photo: watermarked, gps_location: gpsLocation || prev.gps_location }));
      toast({ title: 'Visit Photo Attached! 📸', description: 'Store front proof stamped with GPS.' });
    }

    closeCameraModal();
  };

  // Submit and Save Visit Punch
  const handleSaveVisitPunch = async () => {
    if (!punchingStop || punchingIndex < 0) return;
    stopCamera();

    try {
      setSavingVisitPunch(true);
      const cleanBags = Number(String(punchForm.actual_order_bags || '').replace(/[^0-9]/g, '')) || 0;
      const cleanCollection = Number(String(punchForm.actual_collection_value || '').replace(/[^0-9]/g, '')) || 0;

      const payload = {
        stop_id: punchingStop.id,
        dealer_name: punchingStop.dealer_name,
        actual_status: punchForm.actual_status,
        actual_order_bags: cleanBags,
        actual_collection_value: cleanCollection,
        shortfall_reason: punchForm.shortfall_reason.trim(),
        actual_notes: punchForm.actual_notes.trim(),
        next_visit_date: punchForm.next_visit_date || null,
        visit_photo: punchForm.visit_photo,
        gps_location: punchForm.gps_location || gpsLocation || '',
      };

      const res = await travelService.punchStopVisit(payload);
      const savedStop = res.data?.data;

      // Update local reconciling stops list
      setReconcilingStops(prev => {
        const next = [...prev];
        next[punchingIndex] = {
          ...next[punchingIndex],
          visited: punchForm.actual_status !== 'SKIPPED',
          actual_status: punchForm.actual_status,
          actual_order_bags: cleanBags,
          actual_collection_value: cleanCollection,
          shortfall_reason: punchForm.shortfall_reason.trim(),
          actual_notes: punchForm.actual_notes.trim(),
          next_visit_date: punchForm.next_visit_date || null,
          visit_photo: punchForm.visit_photo,
          gps_location: punchForm.gps_location,
          ...(savedStop || {}),
        };
        return next;
      });

      // Recalculate and update trip order/collection summaries if applicable
      setReconcilingStops(updatedStops => {
        const totalBags = updatedStops.reduce((sum, s) => sum + (s.actual_order_bags || 0), 0);
        const totalCollection = updatedStops.reduce((sum, s) => sum + (s.actual_collection_value || 0), 0);
        const visitedCount = updatedStops.filter(s => s.visited && s.actual_status !== 'SKIPPED').length;

        if (totalBags > 0) setOrderSummary(`${totalBags} bags booked across ${visitedCount} stops`);
        if (totalCollection > 0) setCollectionSummary(`₹${totalCollection.toLocaleString('en-IN')} collected`);
        if (visitedCount > 0) setVisitSummary(`${visitedCount} of ${updatedStops.length} counters visited`);

        return updatedStops;
      });

      toast({ 
        title: 'Visit Outcome Punched! 🎯', 
        description: `Recorded outcome for ${punchingStop.dealer_name}. Synced to company visit tracking.` 
      });

      setPunchingStop(null);
      setPunchingIndex(-1);
    } catch (err: any) {
      console.error('Failed to punch visit outcome:', err);
      toast({ 
        title: 'Failed to record visit', 
        description: err.response?.data?.message || 'Network error saving visit outcome.', 
        variant: 'destructive' 
      });
    } finally {
      setSavingVisitPunch(false);
    }
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
            onClick={() => handleSelectTab('TRIP')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
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
              handleSelectTab('PLANNER');
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
            onClick={() => handleSelectTab('HISTORY')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'HISTORY' ? "bg-background text-primary shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => handleSelectTab('SCORECARD')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'SCORECARD' ? "bg-background text-primary shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{['SUPERADMIN', 'ADMIN', 'HR'].includes((user?.role || '').toUpperCase()) || (user as any)?.is_superuser ? 'Scorecard' : 'My Score'}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
              KPI
            </Badge>
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
                          <div 
                            key={stop.id || idx} 
                            onClick={() => setViewingStopDetails(stop)}
                            className="p-3.5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-xs transition-all flex items-start justify-between gap-2 shadow-xs cursor-pointer group"
                            title="Click to view full stop information"
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                                  {stop.dealer_name}
                                </h4>
                                {renderVisitPurposeBadges(stop.visit_purpose)}
                              </div>

                              {stop.dealer_location && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" /> 
                                  <span className="truncate">{stop.dealer_location}</span>
                                </p>
                              )}

                              {/* Target commitments shown on front side */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                                {(stop.target_order_bags || 0) > 0 && (
                                  <span className="text-purple-600 font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                    <ShoppingBag className="w-3 h-3" /> {formatIndianNumber(stop.target_order_bags)} bags
                                  </span>
                                )}
                                {(stop.target_collection_value || 0) > 0 && (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                    <IndianRupee className="w-3 h-3" /> ₹{Number(stop.target_collection_value).toLocaleString('en-IN')}
                                    {formatIndianWords(stop.target_collection_value) && (
                                      <span className="text-[9px] font-medium text-emerald-700/80 dark:text-emerald-300">
                                        ({formatIndianWords(stop.target_collection_value)})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Front-side Action / Pitch Notes */}
                              {stop.plan_notes && (
                                <div className="text-[11px] text-muted-foreground/90 bg-muted/40 dark:bg-muted/20 px-2 py-1 rounded-md border border-border/60 italic flex items-start gap-1.5 mt-1">
                                  <FileText className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">"{stop.plan_notes}"</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" 
                                title="View Stop Info (Read-Only)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingStopDetails(stop);
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-red-500" 
                                title="Delete Stop"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReconcilingStops(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
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
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-primary" />
                        <span>Starting Meter Photo *</span>
                      </span>
                      {startPhoto ? (
                        <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Photo Attached &amp; GPS Stamped
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {gpsStatus}
                        </span>
                      )}
                    </Label>

                    {startPhoto ? (
                      <div className="p-3 border rounded-xl bg-card/50 flex flex-col sm:flex-row items-center gap-3">
                        <div 
                          className="relative group w-full sm:w-36 h-24 rounded-lg overflow-hidden border shrink-0 cursor-pointer bg-black/5"
                          onClick={() => setPreviewImage(startPhoto)}
                        >
                          <img src={startPhoto} alt="Start Meter" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" /> View Full Proof
                          </div>
                        </div>
                        <div className="flex-1 space-y-1 w-full text-center sm:text-left">
                          <p className="text-xs font-bold text-foreground">Starting Odometer Photo Stamped</p>
                          <p className="text-[11px] text-muted-foreground">Coordinates, timestamp &amp; user name embossed at bottom.</p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openCameraModal('START_ODOMETER')}
                              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-primary" />
                              Retake via Camera
                            </Button>
                            <label className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted cursor-pointer transition-colors shadow-2xs">
                              <span>Change from File</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoFileUpload(e, 'STARTING ODOMETER', setStartPhoto)} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Snap Starting Meter Reading</p>
                            <p className="text-[11px] text-muted-foreground">Live GPS coordinates &amp; timestamp will be embossed directly on photo.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            onClick={() => openCameraModal('START_ODOMETER')}
                            className="flex-1 sm:flex-initial h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm gap-2 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>📸 Open Camera</span>
                          </Button>
                          <label className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-muted cursor-pointer transition-colors shadow-2xs">
                            <span>📁 Choose File</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoFileUpload(e, 'STARTING ODOMETER', setStartPhoto)} 
                            />
                          </label>
                        </div>
                      </div>
                    )}
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
              {/* Compact Trip In Progress Banner */}
              <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs animate-pulse shrink-0">
                    {todayLog.vehicle_type === 'CAR' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs">Trip In Progress</span>
                      <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 uppercase">Live</Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                      <span>&bull; Started at <strong>{todayLog.start_km} KM</strong></span>
                      <span>&bull; Time: {todayLog.start_time ? new Date(todayLog.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Stops Agenda Checklist */}
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Store className="w-5 h-5 text-blue-600" />
                        <span>Today's Stops Agenda ({reconcilingStops.filter(s => s.visited).length}/{reconcilingStops.length} Visited)</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Check off visits or update actual orders/collections as you complete each counter
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setIsSpotVisitModal(true);
                          setShowAddStopModal(true);
                        }}
                        className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold shadow-xs rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stop</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={loadTodayLog}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Reload / Sync Today's Agenda"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {reconcilingStops.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed rounded-2xl bg-muted/10 space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">No stops in today's agenda yet</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Click below to add a dealer or counter stop to today's route.
                        </p>
                      </div>
                      <div className="flex items-center justify-center pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsSpotVisitModal(true);
                            setShowAddStopModal(true);
                          }}
                          className="text-xs h-9 px-4 gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold shadow-xs rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Stop to Route</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y border rounded-xl overflow-hidden">
                      {reconcilingStops.map((stop, idx) => {
                        const isVisited = stop.visited && stop.actual_status !== 'PENDING';
                        return (
                          <div 
                            key={stop.id || idx} 
                            onClick={() => openVisitPunchModal(stop, idx)}
                            className={cn(
                              "p-3 bg-card hover:bg-muted/20 transition-all cursor-pointer flex items-center justify-between gap-3 border-l-4",
                              isVisited 
                                ? "border-l-emerald-500 hover:border-l-emerald-600" 
                                : "border-l-amber-500 hover:border-l-primary"
                            )}
                            title="Click to punch or view visit details"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn(
                                "w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0",
                                isVisited ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-primary/10 text-primary"
                              )}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h4 className="font-bold text-xs text-foreground truncate">{stop.dealer_name}</h4>
                                  {stop.is_unplanned ? (
                                    <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 py-0 flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5" /> Spot
                                    </Badge>
                                  ) : (
                                    renderVisitPurposeBadges(stop.visit_purpose)
                                  )}
                                </div>
                                {stop.dealer_location && (
                                  <p className="text-[11px] text-muted-foreground truncate">{stop.dealer_location}</p>
                                )}
                              </div>
                            </div>

                            {/* Status: Pending or Visited */}
                            <div className="flex items-center gap-2 shrink-0">
                              {(stop.target_order_bags || 0) > 0 && !isVisited && (
                                <span className="hidden sm:inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-purple-200">
                                  Target: {formatIndianNumber(stop.target_order_bags)} bags
                                </span>
                              )}
                              {!isVisited ? (
                                <Badge 
                                  variant="outline"
                                  className="text-[11px] font-bold py-1 px-2.5 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 shadow-xs"
                                >
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  <span>Pending</span>
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      "text-[11px] font-bold py-1 px-2.5 flex items-center gap-1 shadow-xs",
                                      stop.actual_status === 'COMPLETED' && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
                                      stop.actual_status === 'PARTIALLY_FULFILLED' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
                                      stop.actual_status === 'NOT_FULFILLED' && "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300",
                                      stop.actual_status === 'CONVERTED_NEW_DEALER' && "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300",
                                      stop.actual_status === 'SKIPPED' && "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
                                    )}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>
                                      {stop.actual_status === 'COMPLETED' ? 'Visited' :
                                       stop.actual_status === 'PARTIALLY_FULFILLED' ? 'Partial' :
                                       stop.actual_status === 'NOT_FULFILLED' ? 'Missed' :
                                       stop.actual_status === 'CONVERTED_NEW_DEALER' ? 'Converted' :
                                       stop.actual_status === 'SKIPPED' ? 'Skipped' : 'Visited'}
                                    </span>
                                  </Badge>
                                </div>
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                            </div>
                          </div>
                        );
                      })}
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
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ending Meter Photo *</span>
                      </span>
                      {endPhoto ? (
                        <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Photo Attached &amp; GPS Stamped
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {gpsStatus}
                        </span>
                      )}
                    </Label>

                    {endPhoto ? (
                      <div className="p-3 border rounded-xl bg-card/50 flex flex-col sm:flex-row items-center gap-3">
                        <div 
                          className="relative group w-full sm:w-36 h-24 rounded-lg overflow-hidden border shrink-0 cursor-pointer bg-black/5"
                          onClick={() => setPreviewImage(endPhoto)}
                        >
                          <img src={endPhoto} alt="End Meter" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" /> View Full Proof
                          </div>
                        </div>
                        <div className="flex-1 space-y-1 w-full text-center sm:text-left">
                          <p className="text-xs font-bold text-foreground">Ending Odometer Photo Stamped</p>
                          <p className="text-[11px] text-muted-foreground">Coordinates, timestamp &amp; user name embossed at bottom.</p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openCameraModal('END_ODOMETER')}
                              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-amber-500" />
                              Retake via Camera
                            </Button>
                            <label className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted cursor-pointer transition-colors shadow-2xs">
                              <span>Change from File</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoFileUpload(e, 'ENDING ODOMETER', setEndPhoto)} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Snap Ending Meter Reading</p>
                            <p className="text-[11px] text-muted-foreground">Live GPS coordinates &amp; timestamp will be embossed directly on photo.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            onClick={() => openCameraModal('END_ODOMETER')}
                            className="flex-1 sm:flex-initial h-10 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm gap-2 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>📸 Open Camera</span>
                          </Button>
                          <label className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-muted cursor-pointer transition-colors shadow-2xs">
                            <span>📁 Choose File</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoFileUpload(e, 'ENDING ODOMETER', setEndPhoto)} 
                            />
                          </label>
                        </div>
                      </div>
                    )}
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-xs text-foreground">{stop.dealer_name}</h4>
                          {renderVisitPurposeBadges(stop.visit_purpose)}
                        </div>
                        {stop.dealer_location && (
                          <p className="text-[11px] text-muted-foreground">{stop.dealer_location}</p>
                        )}
                        {stop.plan_notes && (
                          <p className="text-[11px] text-muted-foreground italic">"{stop.plan_notes}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        {(stop.target_order_bags || 0) > 0 && (
                          <span className="font-bold text-purple-600 flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5" /> {formatIndianNumber(stop.target_order_bags)} bags
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
                        className="h-7 w-7 text-muted-foreground hover:text-primary" 
                        title="View Stop Information"
                        onClick={() => setViewingStopDetails(stop)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-red-500" 
                        title="Delete Stop"
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

      {/* TAB 4: SALES OFFICER PERFORMANCE SCORECARD (Weekly, Monthly, Yearly) */}
      {activeTab === 'SCORECARD' && (
        <SOScorecardTab />
      )}

      {/* MODAL: ADD DEALER STOP / SPOT VISIT */}
      <Dialog open={showAddStopModal} onOpenChange={(open) => !open && setShowAddStopModal(false)}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
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
            {/* Quick Type Switcher: Planned vs Unplanned */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl border">
              <button
                type="button"
                onClick={() => setIsSpotVisitModal(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all",
                  !isSpotVisitModal
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Planned Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSpotVisitModal(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all",
                  isSpotVisitModal
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Spot / Unplanned</span>
              </button>
            </div>

            {/* Registered Party Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold flex items-center gap-1.5 text-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Select from Registered Dealers / Distributors (Optional)</span>
              </Label>
              <select
                value={stopForm.dealer_id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const party = parties.find(p => p.id === selectedId);
                  if (party) {
                    handlePartySelect(party);
                  } else {
                    setStopForm(prev => ({ ...prev, dealer_id: '', dealer_name: '', dealer_location: '' }));
                  }
                }}
                className="w-full border rounded-lg p-2 text-xs bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none truncate"
              >
                <option value="">-- Choose Registered Party or Type Name Below --</option>
                <optgroup label="Registered Dealers">
                  {parties.filter(p => p.type === 'Dealer').map(p => (
                    <option key={`dealer-${p.id}`} value={p.id}>
                      {p.name} {p.city ? `(${p.city})` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Registered Distributors">
                  {parties.filter(p => p.type === 'Distributor').map(p => (
                    <option key={`dist-${p.id}`} value={p.id}>
                      [Distributor] {p.name} {p.city ? `(${p.city})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
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

            {/* Visit Purpose - Interactive Multi-select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-foreground">
                  Visit Purpose (Select Multiple if applicable) *
                </Label>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {stopForm.visit_purposes.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {VISIT_PURPOSE_OPTIONS.map(opt => {
                  const isSelected = stopForm.visit_purposes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleVisitPurpose(opt.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all text-left",
                        isSelected 
                          ? cn(opt.badgeBg, "ring-1 ring-primary/40 font-bold shadow-xs") 
                          : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs shrink-0">{opt.icon}</span>
                      <span className="truncate text-[11px] flex-1">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary shrink-0 ml-auto" />}
                    </button>
                  );
                })}
              </div>

              {stopForm.visit_purposes.includes('OTHER') && (
                <div className="pt-1">
                  <Input 
                    placeholder="Specify other purpose (e.g. Sampling, Catalog, Delivery)..." 
                    value={stopForm.other_purpose_note} 
                    onChange={(e) => setStopForm(prev => ({ ...prev, other_purpose_note: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Targets: Bags & Payment with Indian Currency Formatting */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Target Order (Bags)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs select-none">
                    📦
                  </span>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 100" 
                    value={stopForm.target_order_bags ? formatIndianNumber(stopForm.target_order_bags) : ''} 
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setStopForm(prev => ({ ...prev, target_order_bags: clean }));
                    }}
                    className="h-8 pl-7 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Target Collection</Label>
                  {stopForm.target_collection_value && formatIndianWords(stopForm.target_collection_value) ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                      {formatIndianWords(stopForm.target_collection_value)}
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 select-none">
                    ₹
                  </span>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 50,000" 
                    value={stopForm.target_collection_value ? formatIndianNumber(stopForm.target_collection_value) : ''} 
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setStopForm(prev => ({ ...prev, target_collection_value: clean }));
                    }}
                    className="h-8 pl-6 text-xs font-bold text-foreground focus:ring-emerald-500"
                  />
                </div>
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

      {/* MODAL: VISIT TRACKING & OUTCOME PUNCH */}
      <Dialog open={!!punchingStop} onOpenChange={(open) => { if (!open) { stopCamera(); setPunchingStop(null); } }}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Store className="w-5 h-5 text-primary" />
                <span>Visit Check-In & Outcome</span>
              </DialogTitle>
              {punchingStop?.is_unplanned ? (
                <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                  📍 Spot Visit
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200">
                  🎯 Planned Agenda
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Take store photo, punch actual order & collection, and sync directly to visit records.
            </DialogDescription>
          </DialogHeader>

          {punchingStop && (
            <div className="space-y-4 py-2">
              {/* Dealer Header Banner with Targets */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{punchingStop.dealer_name}</h3>
                    {punchingStop.dealer_location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span>{punchingStop.dealer_location}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(punchingStop.target_order_bags || 0) > 0 && (
                      <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 px-2 py-0.5 rounded text-[11px] font-bold border border-purple-200">
                        Target: {formatIndianNumber(punchingStop.target_order_bags)} bags
                      </span>
                    )}
                    {(punchingStop.target_collection_value || 0) > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200">
                        Target: ₹{Number(punchingStop.target_collection_value).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {punchingStop.plan_notes && (
                  <div className="text-xs text-muted-foreground bg-background/80 px-2.5 py-1.5 rounded-lg border border-border/60 italic flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>"{punchingStop.plan_notes}"</span>
                  </div>
                )}
              </div>

              {/* Photo Upload / Camera Snap */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    <span>Counter / Store Front Photo</span>
                  </span>
                  {punchForm.gps_location && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      📍 {punchForm.gps_location}
                    </span>
                  )}
                </Label>

                {punchForm.visit_photo ? (
                  <div className="p-3 border rounded-xl bg-card/50 flex flex-col sm:flex-row items-center gap-3">
                    <div 
                      className="relative group w-full sm:w-36 h-24 rounded-lg overflow-hidden border shrink-0 cursor-pointer bg-black/5"
                      onClick={() => setPreviewImage(punchForm.visit_photo)}
                    >
                      <img src={punchForm.visit_photo} alt="Store Front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1">
                        <Eye className="w-4 h-4" /> View Full Proof
                      </div>
                    </div>
                    <div className="flex-1 space-y-1 w-full text-center sm:text-left">
                      <p className="text-xs font-bold text-foreground">Visit Photo Stamped &amp; Attached</p>
                      <p className="text-[11px] text-muted-foreground">Coordinates, timestamp &amp; dealer embossed at bottom.</p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openCameraModal('VISIT')}
                          className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          Retake via Camera
                        </Button>
                        <label className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted cursor-pointer transition-colors shadow-2xs">
                          <span>Change from File</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handlePhotoFileUpload(e, punchingStop?.dealer_name ? `STORE VISIT: ${punchingStop.dealer_name}` : 'STORE FRONT VISIT', (b64) => setPunchForm(prev => ({ ...prev, visit_photo: b64, gps_location: gpsLocation || prev.gps_location })))} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">Live Store Front / Visit Photo</p>
                      <p className="text-[10px] text-muted-foreground">Click below to open camera or choose a photo. GPS &amp; time will be embossed automatically.</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      {/* Real Camera Launcher */}
                      <Button 
                        type="button"
                        onClick={() => openCameraModal('VISIT')}
                        className="h-9 px-3.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 Open Camera</span>
                      </Button>

                      {/* Gallery / File Fallback */}
                      <label 
                        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-muted shadow-2xs cursor-pointer active:scale-95 transition-transform"
                      >
                        <span>📁 Choose from Files</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handlePhotoFileUpload(e, punchingStop?.dealer_name ? `STORE VISIT: ${punchingStop.dealer_name}` : 'STORE FRONT VISIT', (b64) => setPunchForm(prev => ({ ...prev, visit_photo: b64, gps_location: gpsLocation || prev.gps_location })))} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Visit Outcome Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Visit Outcome Status <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={punchForm.actual_status}
                  onChange={(e) => setPunchForm(prev => ({ ...prev, actual_status: e.target.value as any }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="COMPLETED">✅ Completed & Met - Target / Order Discussed</option>
                  <option value="PARTIALLY_FULFILLED">🟡 Partially Fulfilled - Partial Order / Next Visit</option>
                  <option value="NOT_FULFILLED">🔴 Target Missed - Stock Full / Payment Delayed</option>
                  <option value="CONVERTED_NEW_DEALER">🌟 New Dealer Converted - First Billing</option>
                  <option value="SKIPPED">❌ Skipped / Store Closed / Counter Absent</option>
                </select>
              </div>

              {/* Actuals Grid: Bags & Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Actual Order Bags */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <span>📦 Actual Order (Bags)</span>
                    </Label>
                    {(punchingStop.target_order_bags || 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Target: {formatIndianNumber(punchingStop.target_order_bags)}
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={punchForm.actual_order_bags ? formatIndianNumber(punchForm.actual_order_bags) : ''}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setPunchForm(prev => ({ ...prev, actual_order_bags: clean }));
                    }}
                    className="h-9 text-xs font-bold text-purple-700 dark:text-purple-300"
                  />
                </div>

                {/* Actual Collection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <span>💰 Actual Collection (₹)</span>
                    </Label>
                    {punchForm.actual_collection_value && Number(punchForm.actual_collection_value) > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200">
                        {formatIndianWords(punchForm.actual_collection_value)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={punchForm.actual_collection_value ? formatIndianNumber(punchForm.actual_collection_value) : ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9]/g, '');
                        setPunchForm(prev => ({ ...prev, actual_collection_value: clean }));
                      }}
                      className="h-9 text-xs pl-6 font-bold text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                </div>
              </div>

              {/* Shortfall Reason / Discussion Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Meeting Notes / Shortfall Reason
                </Label>
                <Textarea
                  placeholder="e.g. Dealer already has 50 bags stock. Promised cheque next Tuesday."
                  value={punchForm.shortfall_reason}
                  onChange={(e) => setPunchForm(prev => ({ ...prev, shortfall_reason: e.target.value }))}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Next Meeting / Follow-up Date */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Next Meeting / Follow-Up Date</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Next visit plan</span>
                </Label>
                <Input
                  type="date"
                  min={todayStr}
                  value={punchForm.next_visit_date}
                  onChange={(e) => setPunchForm(prev => ({ ...prev, next_visit_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPunchingStop(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveVisitPunch}
              disabled={savingVisitPunch}
              className="text-xs font-bold gap-1.5 bg-primary text-white shadow-sm"
            >
              {savingVisitPunch ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Record Visit</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW STOP INFORMATION (READ-ONLY) */}
      <Dialog open={!!viewingStopDetails} onOpenChange={(open) => !open && setViewingStopDetails(null)}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Target className="w-4 h-4 text-purple-600" />
                <span>Planned Stop Information</span>
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">
                🔒 Read-Only
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Stop details and targets locked for field accountability
            </DialogDescription>
          </DialogHeader>

          {viewingStopDetails && (
            <div className="space-y-3 py-2 text-xs">
              {/* Counter Header */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Dealer / Counter
                  </span>
                  {viewingStopDetails.is_unplanned && (
                    <Badge variant="secondary" className="text-[9px] bg-blue-100 text-blue-700">
                      Spot Visit
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-primary shrink-0" />
                  <span>{viewingStopDetails.dealer_name}</span>
                </h3>
                {viewingStopDetails.dealer_location && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{viewingStopDetails.dealer_location}</span>
                  </p>
                )}
              </div>

              {/* Purpose(s) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Visit Purpose</Label>
                <div className="pt-0.5">
                  {renderVisitPurposeBadges(viewingStopDetails.visit_purpose)}
                </div>
              </div>

              {/* Target Commitments with Indian Numbers */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 space-y-0.5">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" /> Target Order
                  </span>
                  <div className="text-base font-black text-purple-900 dark:text-purple-100">
                    {(viewingStopDetails.target_order_bags || 0) > 0 
                      ? `${formatIndianNumber(viewingStopDetails.target_order_bags)} Bags` 
                      : 'No target set'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 space-y-0.5">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Target Collection
                  </span>
                  <div className="text-base font-black text-emerald-900 dark:text-emerald-100">
                    {(viewingStopDetails.target_collection_value || 0) > 0 
                      ? `₹${Number(viewingStopDetails.target_collection_value).toLocaleString('en-IN')}` 
                      : 'No target set'}
                  </div>
                  {viewingStopDetails.target_collection_value && formatIndianWords(viewingStopDetails.target_collection_value) ? (
                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300 block font-medium">
                      ({formatIndianWords(viewingStopDetails.target_collection_value)})
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Notes / Items to Pitch */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Action Notes / Pitch Instructions</span>
                </Label>
                <div className="p-3 rounded-xl border bg-background text-xs text-foreground min-h-[50px] leading-relaxed">
                  {viewingStopDetails.plan_notes ? (
                    <p className="italic">"{viewingStopDetails.plan_notes}"</p>
                  ) : (
                    <span className="text-muted-foreground italic">No action notes specified for this stop.</span>
                  )}
                </div>
              </div>

              {/* Actual Outcome (if trip is active or reconciled) */}
              {viewingStopDetails.actual_status && viewingStopDetails.actual_status !== 'PENDING' && (
                <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Actual Result</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {viewingStopDetails.actual_status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>Actual Bags: <strong className="text-purple-600">{formatIndianNumber(viewingStopDetails.actual_order_bags || 0)}</strong></div>
                    <div>Actual Collection: <strong className="text-emerald-600">₹{Number(viewingStopDetails.actual_collection_value || 0).toLocaleString('en-IN')}</strong></div>
                  </div>
                  {viewingStopDetails.shortfall_reason && (
                    <p className="text-[11px] text-muted-foreground italic pt-1">
                      Reason: {viewingStopDetails.shortfall_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Locked Notice */}
              <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Stop target commitments are locked for payroll and HR performance evaluation.</span>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-2">
            <Button size="sm" onClick={() => setViewingStopDetails(null)} className="text-xs font-bold w-full sm:w-auto">
              Close Details
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

      {/* UNIFIED LIVE CAMERA MODAL (Works on Desktop Webcams & Mobile Cameras) */}
      <Dialog open={cameraActive && !!cameraTarget} onOpenChange={(open) => { if (!open) closeCameraModal(); }}>
        <DialogContent className="max-w-md w-[95vw] p-4 bg-zinc-950 text-white border-zinc-800 rounded-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <span>
                  {cameraTarget === 'START_ODOMETER' && 'Starting Odometer Camera'}
                  {cameraTarget === 'END_ODOMETER' && 'Ending Odometer Camera'}
                  {cameraTarget === 'VISIT' && `Store Photo: ${punchingStop?.dealer_name || 'Visit'}`}
                </span>
              </DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleCameraFacing}
                className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 rounded-lg gap-1.5"
                title="Switch Camera (Front/Back)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip Camera</span>
              </Button>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              Frame your meter or store clearly. GPS coordinates &amp; timestamp will be embossed automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Video Viewfinder with Live Overlays */}
          <div className="relative w-full rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center min-h-[260px] max-h-[360px]">
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
            />
            {/* Viewfinder crosshairs / focus box */}
            <div className="absolute inset-8 border border-white/25 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="w-8 h-8 border-t-2 border-l-2 border-primary absolute -top-1 -left-1" />
              <div className="w-8 h-8 border-t-2 border-r-2 border-primary absolute -top-1 -right-1" />
              <div className="w-8 h-8 border-b-2 border-l-2 border-primary absolute -bottom-1 -left-1" />
              <div className="w-8 h-8 border-b-2 border-r-2 border-primary absolute -bottom-1 -right-1" />
            </div>

            {/* Live GPS badge at top left */}
            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs border border-white/10 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{gpsLocation ? `📍 ${gpsLocation.split('(')[0]}` : gpsStatus}</span>
            </div>
          </div>

          <DialogFooter className="flex-row sm:justify-between items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCameraModal}
              className="flex-1 sm:flex-initial h-11 text-xs px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCaptureCameraPhoto}
              className="flex-1 sm:flex-1 h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-lg gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Snap &amp; Stamp Photo</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function roundNumber(num: number, dec: number) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

export default DailyTravelPage;
