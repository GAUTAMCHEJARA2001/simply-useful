import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Visit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, Camera, Loader2, MapPin, X, CheckCircle2, Navigation, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { externalApi } from '@/api/external.api';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { leadService } from '@/api/services/lead.service';

/**
 * VISIT TRACKING (ELITE – MOBILE FIRST)
 * Full mobile-first redesign: bottom-sheet style dialog, camera-first UX,
 * large touch targets, swipe-friendly step flow.
 */

interface GPSState {
  lat: number;
  lng: number;
  accuracy: number;
  source: 'Satellite' | 'Cell Tower' | 'IP Fallback';
}

// Step-based form for mobile: step 1 = identity, step 2 = camera, step 3 = details
type PunchStep = 1 | 2 | 3;

const VisitTracking: React.FC = () => {
  const { user } = useAuth();
  const { visits, addVisit, dealers } = useData();
  const { toast } = useToast();
  const { filterBySelectedFY, fyLabel } = useFinancialYear();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [punchStep, setPunchStep] = useState<PunchStep>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [visitType, setVisitType] = useState<'Dealer' | 'Lead' | 'External'>('Dealer');
  const [gps, setGps] = useState<GPSState | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Finding location...');
  const watchId = useRef<number | null>(null);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    leadService.getAll().then(res => {
      setLeads(res.data?.data || res.data || []);
    }).catch(err => console.error("Failed to load leads", err));
  }, []);

  const [form, setForm] = useState<Visit>({
    date: new Date().toISOString().split('T')[0],
    soEmail: user?.email || '',
    dealerName: '',
    remarks: '',
    nextFollowup: '',
    nextVisitTime: '',
    photo: '',
    gpsLocation: '',
    leadId: ''
  });
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [nextVisitTimePart, setNextVisitTimePart] = useState('');

  // ── GPS Watcher ─────────────────────────────────────────────
  const startGpsWatcher = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsStatus('🛰️ Searching for Satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!gps) {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'Cell Tower' });
          setGpsStatus(`📍 Signal ±${Math.round(pos.coords.accuracy)}m (Refining...)`);
        }
      },
      () => {}, { enableHighAccuracy: false, timeout: 2000 }
    );

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGps(prev => {
          if (!prev || accuracy < prev.accuracy) return { lat: latitude, lng: longitude, accuracy, source: 'Satellite' };
          return prev;
        });
        setGpsStatus(`🎯 ±${Math.round(accuracy)}m`);
      },
      (err) => console.warn('GPS Watcher:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    setTimeout(async () => {
      if (!gps) {
        try {
          const data = await externalApi.getIpLocation();
          if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            setGps({ lat: data.latitude, lng: data.longitude, accuracy: 5000, source: 'IP Fallback' });
            setGpsStatus('📍 Network location');
          }
        } catch { console.error('IP Fallback failed'); }
      }
    }, 3500);
  }, [gps]);

  const stopGpsWatcher = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  useEffect(() => {
    if (dialogOpen) startGpsWatcher();
    else { stopGpsWatcher(); stopCamera(); setGps(null); }
    return () => stopGpsWatcher();
  }, [dialogOpen, startGpsWatcher]);

  useEffect(() => {
    if (gps) setForm(prev => ({ ...prev, gpsLocation: `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` }));
  }, [gps]);

  // ── Camera ──────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraActive(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
    }, 100);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, photo: reader.result as string }));
      if (cameraActive) stopCamera();
      setPunchStep(3); // Advance to details step
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    setSavingLoading(true);

    let cityState = 'Location verified';
    if (gps) {
      try {
        const data = await externalApi.getReverseGeocode(gps.lat, gps.lng);
        const city = data.city || data.locality || 'Area Verified';
        const state = data.principalSubdivision || '';
        cityState = state ? `${city}, ${state}` : city;
      } catch { cityState = 'Check-in Location'; }
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 960;
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setSavingLoading(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const overlayHeight = canvas.height * 0.25;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

    const padding = Math.max(16, canvas.width * 0.025);
    const mapSize = Math.max(72, overlayHeight - (padding * 2));
    const mapX = padding;
    const mapY = canvas.height - overlayHeight + padding;
    const radius = Math.max(10, mapSize * 0.08);

    ctx.save();
    ctx.beginPath();
    (ctx as any).roundRect
      ? (ctx as any).roundRect(mapX, mapY, mapSize, mapSize, radius)
      : ctx.rect(mapX, mapY, mapSize, mapSize);
    ctx.clip();
    ctx.fillStyle = '#102a43';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const offset = (mapSize / 4) * i;
      ctx.beginPath();
      ctx.moveTo(mapX + offset, mapY);
      ctx.lineTo(mapX + offset, mapY + mapSize);
      ctx.moveTo(mapX, mapY + offset);
      ctx.lineTo(mapX + mapSize, mapY + offset);
      ctx.stroke();
    }
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, Math.max(7, mapSize * 0.08), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.42)';
    ctx.lineWidth = Math.max(3, mapSize * 0.035);
    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const textX = mapSize + (padding * 2);
    const availableTextWidth = canvas.width - textX - padding;
    ctx.fillStyle = 'white';
    const fontSize = Math.max(16, Math.floor(canvas.height * 0.032));
    ctx.font = `bold ${fontSize}px Inter, "Segoe UI", sans-serif`;
    let textY = canvas.height - overlayHeight + padding + fontSize;
    ctx.fillText(`Location: ${cityState}`, textX, textY, availableTextWidth);
    textY += fontSize + 10;
    ctx.font = `${fontSize * 0.72}px Inter, sans-serif`;
    ctx.fillText(`GPS: ${gps ? gps.lat.toFixed(6) : '--'}, ${gps ? gps.lng.toFixed(6) : '--'} (+/-${gps ? Math.round(gps.accuracy) : '--'}m)`, textX, textY, availableTextWidth);
    textY += fontSize + 8;
    ctx.fillText(`Time: ${new Date().toLocaleString()}`, textX, textY, availableTextWidth);
    textY += fontSize + 8;
    ctx.fillText(`User: ${(user?.name || user?.email?.split('@')[0] || 'Employee').toUpperCase()}`, textX, textY, availableTextWidth);

    setForm(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.72) }));
    stopCamera();
    setSavingLoading(false);
    // Auto-advance to details step after capture
    setPunchStep(3);
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.dealerName || !form.remarks) {
      toast({ title: 'Missing Information', description: 'Dealer and notes are mandatory.', variant: 'destructive' });
      return;
    }
    if (!form.photo) {
      toast({ title: 'Photo Proof Mandatory', description: 'Capture a live visit photo with GPS seal to continue.', variant: 'destructive' });
      return;
    }
    const combinedNextVisit = nextVisitDate 
      ? (nextVisitTimePart ? `${nextVisitDate}T${nextVisitTimePart}` : `${nextVisitDate}T00:00`)
      : '';
    setSavingLoading(true);
    try {
      await addVisit({ ...form, nextVisitTime: combinedNextVisit, soEmail: user?.email || '', date: new Date().toISOString().split('T')[0] });
      toast({ title: '✅ Visit Recorded', description: 'GPS-sealed check-in saved.' });
      setDialogOpen(false);
      setNextVisitDate(''); setNextVisitTimePart('');
      setForm({ date: new Date().toISOString().split('T')[0], soEmail: user?.email || '', dealerName: '', remarks: '', nextFollowup: '', nextVisitTime: '', photo: '', gpsLocation: '', leadId: '' });
      setPunchStep(1);
    } catch {
      toast({ title: 'Sync Error', description: "Visit couldn't be saved.", variant: 'destructive' });
    } finally {
      setSavingLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setPunchStep(1);
    setForm({ date: new Date().toISOString().split('T')[0], soEmail: user?.email || '', dealerName: '', remarks: '', nextFollowup: '', nextVisitTime: '', photo: '', gpsLocation: '', leadId: '' });
    setNextVisitDate(''); setNextVisitTimePart('');
  };

  // ── Data ────────────────────────────────────────────────────
  const isSalesOnly = user?.role === 'SALES';
  const myDealers = isSalesOnly
    ? dealers.filter(d => (d.assignedSoEmail || '').toLowerCase() === (user?.email || '').toLowerCase() && d.active)
    : dealers.filter(d => d.active);

  const dealerNames = useMemo(() => Array.from(new Set(myDealers.map(d => d.dealerName).filter(Boolean))), [myDealers]);

  const fyVisits = filterBySelectedFY(
    isSalesOnly
      ? visits.filter(v => (v.soEmail || (v as any).so_email || '').toLowerCase() === (user?.email || '').toLowerCase())
      : visits,
    v => v.date
  );

  const gpsLocked = gps && gps.accuracy < 100;

  // ── Step helpers ─────────────────────────────────────────────
  const step1Valid = !!form.dealerName;
  const step2Valid = !!form.photo;
  const step3Valid = !!form.remarks; // nextVisitDate is now optional

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-header">Visit Tracking</h1>
          <p className="page-subheader text-xs sm:text-sm">
            GPS-sealed check-ins &middot; <span className="font-semibold text-primary">{fyLabel}</span> ({fyVisits.length} visits)
          </p>
        </div>
        {/* Floating punch button – bottom-right on mobile */}
        <Button
          className="action-button group w-[calc(100%-2rem)] sm:w-auto fixed bottom-6 left-4 sm:left-auto right-4 z-40 sm:static rounded-full sm:rounded-lg shadow-2xl sm:shadow-sm px-5 sm:px-4 h-14 sm:h-10 text-base sm:text-sm"
          onClick={() => { setDialogOpen(true); setPunchStep(1); }}
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="sm:inline">Start Visit Punch</span>
        </Button>
      </div>

      {/* ── Visit Cards Grid ─────────────────────────────────── */}
      {fyVisits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No visits logged yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tap the button below to start your first GPS punch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-24 sm:pb-0">
          {fyVisits.slice().reverse().map((v, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98] touch-manipulation">
              <CardContent className="p-0">
                {v.photo && <img src={v.photo} alt="Visit Signature" className="w-full aspect-video object-cover" />}
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm leading-tight flex-1">{v.dealerName}</h3>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium whitespace-nowrap">{v.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">"{v.remarks}"</p>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t gap-1">
                    <span className="flex items-center gap-1 min-w-0 truncate">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="truncate">{v.nextVisitTime ? new Date(v.nextVisitTime).toLocaleDateString() : '—'}</span>
                    </span>
                    {(() => {
                      const status = (v.visitStatus ?? v.visit_status ?? 'PENDING').toUpperCase();
                      const verifiedBy = v.verifiedBy ?? v.verified_by;
                      if (status === 'VERIFIED') {
                        return (
                          <span
                            className="text-green-600 font-bold border border-green-600/30 px-1.5 py-0.5 rounded uppercase tracking-widest text-[8px] shrink-0"
                            title={verifiedBy ? `Verified by ${verifiedBy}` : 'Verified by HR/Admin'}
                          >
                            HR Verified
                          </span>
                        );
                      }
                      if (status === 'FLAGGED') {
                        return (
                          <span className="text-red-600 font-bold border border-red-600/30 px-1.5 py-0.5 rounded uppercase tracking-widest text-[8px] shrink-0">
                            Flagged
                          </span>
                        );
                      }
                      if (v.gpsLocation) {
                        return (
                          <span className="text-blue-600 font-bold border border-blue-600/30 px-1.5 py-0.5 rounded uppercase tracking-widest text-[8px] shrink-0">
                            GPS Sealed
                          </span>
                        );
                      }
                      return (
                        <span className="text-amber-600 font-bold border border-amber-600/30 px-1.5 py-0.5 rounded uppercase tracking-widest text-[8px] shrink-0">
                          HR Pending
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Visit Punch Dialog (Full-screen on mobile) ──────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="
            fixed inset-0 left-0 top-0 translate-x-0 translate-y-0
            sm:left-1/2 sm:top-1/2 sm:translate-x-[-50%] sm:translate-y-[-50%]
            w-full max-w-none h-full sm:h-auto sm:max-h-[95vh]
            sm:max-w-xl sm:rounded-2xl
            flex flex-col p-0 overflow-hidden
            border-0 sm:border
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0
            rounded-none sm:rounded-2xl
            bg-background
            [&>button.absolute]:hidden
          "
        >
          {/* Hidden description for accessibility */}
          <DialogTitle className="sr-only">Visit Punch</DialogTitle>
          <DialogDescription className="sr-only">GPS-sealed visit punch form</DialogDescription>

          {/* ── Mobile Header ─────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Visit Punch</p>
                <p className="text-[10px] text-muted-foreground">High-Precision GPS</p>
              </div>
            </div>

            {/* GPS pill */}
            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1.5 shadow-sm ${
                gpsLocked ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gpsLocked ? 'bg-green-500 animate-none' : 'bg-amber-500 animate-pulse'}`} />
                <span className="hidden xs:inline">{gpsStatus}</span>
                <span className="xs:hidden">{gpsLocked ? 'GPS ✓' : 'Syncing'}</span>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Step Indicator ────────────────────────────── */}
          <div className="flex items-center gap-0 px-4 py-2.5 bg-muted/30 shrink-0 border-b">
            {[
              { n: 1, label: 'Who' },
              { n: 2, label: 'Photo' },
              { n: 3, label: 'Details' },
            ].map((s, idx) => (
              <React.Fragment key={s.n}>
                <button
                  onClick={() => {
                    // Allow going back; going forward only if current step valid
                    if (s.n < punchStep || (s.n === 2 && step1Valid) || (s.n === 3 && step1Valid && step2Valid)) {
                      setPunchStep(s.n as PunchStep);
                      if (cameraActive) stopCamera();
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${punchStep === s.n ? 'text-primary font-bold' : s.n < punchStep ? 'text-green-600' : 'text-muted-foreground/50'}`}
                >
                  <span className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 transition-all ${
                    s.n < punchStep ? 'bg-green-500 border-green-500 text-white' :
                    punchStep === s.n ? 'bg-primary border-primary text-primary-foreground' :
                    'bg-muted border-border text-muted-foreground'
                  }`}>
                    {s.n < punchStep ? '✓' : s.n}
                  </span>
                  <span className="text-xs font-semibold">{s.label}</span>
                </button>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${s.n < punchStep ? 'bg-green-500' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step Content (scrollable) ─────────────────── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">

            {/* STEP 1: Who did you visit? */}
            {punchStep === 1 && (
              <div className="p-4 sm:p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Visit Type *</Label>
                  <Tabs value={visitType} onValueChange={(v: any) => { setVisitType(v); setForm(p => ({ ...p, dealerName: '', leadId: '' })); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-11">
                      <TabsTrigger value="Dealer" className="text-sm font-semibold h-full">🏢 Dealer</TabsTrigger>
                      <TabsTrigger value="Lead" className="text-sm font-semibold h-full">🎯 Lead</TabsTrigger>
                      <TabsTrigger value="External" className="text-sm font-semibold h-full">👤 Person / Site</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {visitType === 'Dealer' ? (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Dealer Name *</Label>
                    <Select value={form.dealerName} onValueChange={v => setForm(p => ({ ...p, dealerName: v, leadId: '' }))}>
                      <SelectTrigger className="h-12 text-sm">
                        <SelectValue placeholder="Select Dealer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dealerNames.length === 0 ? (
                          <SelectItem value="__none__" disabled>No dealers assigned</SelectItem>
                        ) : dealerNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : visitType === 'Lead' ? (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Select Lead *</Label>
                    <Select value={form.leadId} onValueChange={v => {
                      const lead = leads.find(l => l.id === v);
                      setForm(p => ({ ...p, leadId: v, dealerName: lead ? (lead.companyName || lead.name) : '' }));
                    }}>
                      <SelectTrigger className="h-12 text-sm">
                        <SelectValue placeholder="Select Lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.length === 0 ? (
                          <SelectItem value="__none__" disabled>No leads found</SelectItem>
                        ) : leads.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.companyName || l.name} {l.status ? `(${l.status})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Person / Meeting Name *</Label>
                    <Input
                      value={form.dealerName}
                      onChange={e => setForm(p => ({ ...p, dealerName: e.target.value }))}
                      placeholder="Type name or meeting..."
                      className="h-12 text-sm"
                    />
                  </div>
                )}

                {/* GPS status card */}
                <div className={`rounded-xl p-3 border text-xs flex items-center gap-3 ${gps ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-700/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/30'}`}>
                  <Navigation className={`w-5 h-5 shrink-0 ${gps ? 'text-green-600' : 'text-amber-600 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${gps ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{gpsStatus}</p>
                    {gps && <p className="text-muted-foreground text-[10px] truncate">{gps.lat.toFixed(4)}°N, {gps.lng.toFixed(4)}°E</p>}
                  </div>
                  {gps && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                </div>
              </div>
            )}

            {/* STEP 2: Camera – live proof capture */}
            {punchStep === 2 && (
              <div className="p-4 sm:p-6 space-y-4">
                {cameraActive ? (
                  <div className="space-y-3">
                    {/* Full-width camera viewfinder */}
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-xl ring-2 ring-primary/50" style={{ aspectRatio: '4/3' }}>
                      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                      {/* Corner markers for aiming */}
                      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                      {/* GPS overlay */}
                      {gps && (
                        <div className="absolute top-2 inset-x-2 flex justify-center">
                          <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            {gpsStatus}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Shutter button */}
                    <button
                      onClick={handleCapture}
                      disabled={savingLoading}
                      className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg active:scale-[0.97] transition-transform disabled:opacity-60"
                    >
                      {savingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                      {savingLoading ? 'Sealing GPS proof...' : 'Capture Visit Proof'}
                    </button>
                    <button
                      onClick={() => { stopCamera(); }}
                      className="w-full h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : form.photo ? (
                  <div className="space-y-3">
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-border">
                      <img src={form.photo} alt="GPS Sealed Proof" className="w-full" />
                      <div className="absolute top-2 right-2">
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> GPS Sealed
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={startCamera}
                      className="w-full h-11 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Retake Photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Big camera prompt */}
                    <button
                      onClick={startCamera}
                      className="w-full flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all active:scale-[0.97]"
                      style={{ minHeight: '200px' }}
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-center px-4">
                        <p className="font-bold text-sm">Open Camera</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {gps ? 'Your live photo will be GPS & time-stamped' : 'Open camera to capture proof (GPS searching...)'}
                        </p>
                      </div>
                      {!gps && <p className="text-[10px] text-amber-600 font-bold animate-pulse">{gpsStatus}</p>}
                    </button>

                    {/* File Upload Fallback */}
                    <div className="relative text-center">
                      <input
                        id="photo-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted"
                        onClick={() => document.getElementById('photo-upload-input')?.click()}
                      >
                        📂 Upload photo from computer
                      </Button>
                    </div>

                    <p className="text-[10px] text-center text-muted-foreground/60">
                      📷 Live camera capture or document upload allowed
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Notes & next visit */}
            {punchStep === 3 && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* Proof preview thumbnail */}
                {form.photo && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-700/30">
                    <img src={form.photo} alt="proof" className="w-12 h-9 rounded-lg object-cover border border-green-300/50" />
                    <div>
                      <p className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> GPS Photo Captured</p>
                      <p className="text-[10px] text-muted-foreground">{form.gpsLocation || 'Location embedded'}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Notes / Discussion *</Label>
                  <Textarea
                    value={form.remarks}
                    onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                    rows={3}
                    placeholder="What was discussed? Key outcomes..."
                    className="text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Next Visit Date <span className="text-muted-foreground/50 normal-case font-normal">(opt)</span></Label>
                    <Input
                      type="date"
                      value={nextVisitDate}
                      onChange={e => setNextVisitDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Time <span className="text-muted-foreground/50 normal-case font-normal">(opt)</span></Label>
                    <Input
                      type="time"
                      value={nextVisitTimePart}
                      onChange={e => setNextVisitTimePart(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                {/* Summary row */}
                <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visiting</span>
                    <span className="font-semibold text-foreground truncate max-w-[60%] text-right">{form.dealerName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS Lock</span>
                    <span className={`font-semibold ${gps ? 'text-green-600' : 'text-amber-600'}`}>{gps ? `±${Math.round(gps.accuracy)}m` : 'No lock'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky Footer Actions ─────────────────────────── */}
          <div className="shrink-0 border-t bg-background px-4 pb-safe-bottom py-3 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            {punchStep === 1 && (
              <button
                onClick={() => { if (step1Valid) { setPunchStep(2); } else { toast({ title: 'Select who you visited', variant: 'destructive' }); } }}
                className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${step1Valid ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
              >
                Next: Take Photo →
              </button>
            )}

            {punchStep === 2 && (
              <div className="flex gap-2">
                <button
                  onClick={() => { stopCamera(); setPunchStep(1); }}
                  className="h-12 px-5 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => { if (step2Valid) setPunchStep(3); else toast({ title: 'Capture photo first', variant: 'destructive' }); }}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${step2Valid ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                >
                  {step2Valid ? '✓ Next: Add Details →' : 'Take Photo First'}
                </button>
              </div>
            )}

            {punchStep === 3 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPunchStep(2)}
                  className="h-14 px-5 rounded-2xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={savingLoading || !step3Valid}
                  className={`flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${step3Valid && !savingLoading ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                >
                  {savingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {savingLoading ? 'Saving...' : 'Complete Punch'}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitTracking;
