import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Visit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Calendar, Camera, Loader2, User, Building2, MapPin, RefreshCw, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GPSState {
  lat: number;
  lng: number;
  accuracy: number;
  source: 'Satellite' | 'Cell Tower' | 'IP Fallback';
}

const VisitTracking: React.FC = () => {
  const { user } = useAuth();
  const { visits, addVisit, dealers } = useData();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [visitType, setVisitType] = useState<'Dealer' | 'External'>('Dealer');
  const [gps, setGps] = useState<GPSState | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Finding location...');
  const watchId = useRef<number | null>(null);
  
  const [form, setForm] = useState<Visit>({ 
    date: new Date().toISOString().split('T')[0], 
    so_email: user?.email || '', 
    dealer_name: '', 
    remarks: '', 
    next_followup: '',
    next_visit_time: '',
    photo: '',
    gps_location: ''
  });

  // Progressive Accuracy Watcher
  const startGpsWatcher = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsStatus('🛰️ Searching for Satellites...');
    
    // Initial fast fallback
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!gps) {
          setGps({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude, 
            accuracy: pos.coords.accuracy,
            source: 'Cell Tower'
          });
          setGpsStatus(`📍 Signal ±${Math.round(pos.coords.accuracy)}m (Refining...)`);
        }
      },
      () => {}, { enableHighAccuracy: false, timeout: 2000 }
    );

    // Progressive High Accuracy Watcher
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGps(prev => {
          if (!prev || accuracy < prev.accuracy) {
            return { lat: latitude, lng: longitude, accuracy, source: 'Satellite' };
          }
          return prev;
        });
        setGpsStatus(`🎯 Accuracy Locked: ±${Math.round(accuracy)}m`);
      },
      (err) => console.warn('GPS Watcher slow:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    // IP Fallback for extreme cases (if no sensor data after 3s)
    setTimeout(async () => {
      if (!gps) {
        try {
          const res = await fetch('https://geolocation-db.com/json/');
          const data = await res.json();
          if (data.latitude) {
            setGps({ lat: data.latitude, lng: data.longitude, accuracy: 5000, source: 'IP Fallback' });
            setGpsStatus('📍 Network-based location');
          }
        } catch (e) { console.error('IP Fallback failed'); }
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

  // Sync Form Coordinate
  useEffect(() => {
    if (gps) setForm(prev => ({ ...prev, gps_location: `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` }));
  }, [gps]);

  const startCamera = async () => {
    setCameraActive(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 } } 
        });
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

  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    setSavingLoading(true);

    let cityState = "Location verified";
    if (gps) {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gps.lat}&longitude=${gps.lng}`);
        const data = await res.json();
        const city = data.city || data.locality || "Area Verified";
        const state = data.principalSubdivision || "";
        cityState = state ? `${city}, ${state}` : city;
      } catch (e) { cityState = "Check-in Location"; }
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const overlayHeight = canvas.height * 0.25;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

    // Fetch Highest Quality Map preview
    const staticMapUrl = gps 
      ? `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${gps.lng},${gps.lat}&z=15&l=map&size=350,350`
      : 'https://via.placeholder.com/350?text=GPS+OFF';
    
    const mapImg = new Image();
    mapImg.crossOrigin = 'anonymous';
    mapImg.onload = () => {
      const padding = 30; const mapSize = overlayHeight - (padding * 2);
      ctx.save(); ctx.beginPath();
      (ctx as any).roundRect ? (ctx as any).roundRect(padding, canvas.height - overlayHeight + padding, mapSize, mapSize, 12) : ctx.rect(padding, canvas.height - overlayHeight + padding, mapSize, mapSize);
      ctx.clip(); ctx.drawImage(mapImg, padding, canvas.height - overlayHeight + padding, mapSize, mapSize); ctx.restore();

      const textX = mapSize + (padding * 2); ctx.fillStyle = 'white';
      const fontSize = Math.floor(canvas.height * 0.035);
      ctx.font = `bold ${fontSize}px Inter, "Segoe UI", sans-serif`;
      let textY = canvas.height - overlayHeight + padding + fontSize;
      
      ctx.fillText(`📍 ${cityState}`, textX, textY);
      textY += fontSize + 15;
      ctx.font = `${fontSize * 0.75}px Inter, sans-serif`;
      ctx.fillText(`📌 Lat: ${gps ? gps.lat.toFixed(6) : '--'}, Lng: ${gps ? gps.lng.toFixed(6) : '--'} (±${gps ? Math.round(gps.accuracy) : '--'}m)`, textX, textY);
      textY += fontSize + 10;
      ctx.fillText(`🕒 ${new Date().toLocaleString()}`, textX, textY);
      textY += fontSize + 10;
      const userName = user?.name || user?.email?.split('@')[0] || 'Employee';
      ctx.fillText(`👤 ${userName.toUpperCase()}`, textX, textY);

      setForm(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.9) }));
      stopCamera(); setSavingLoading(false);
    };
    mapImg.onerror = () => { setForm(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.9) })); stopCamera(); setSavingLoading(false); };
    mapImg.src = staticMapUrl;
    setTimeout(() => { if (savingLoading) { stopCamera(); setSavingLoading(false); } }, 6000);
  };

  const handleSave = async () => {
    if (!form.dealer_name || !form.remarks || !form.next_visit_time) {
      toast({ title: 'Missing Information', description: 'Dealer and next follow-up details are mandatory.', variant: 'destructive' });
      return;
    }
    if (!form.photo) {
      toast({ title: 'Photo Proof Mandatory', description: 'Capture a live visit photo with GPS seal to continue.', variant: 'destructive' });
      return;
    }
    setSavingLoading(true);
    try {
      await addVisit({ ...form, so_email: user?.email || '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Visit Record Stored', description: 'Check-in verified and history updated.' });
      setDialogOpen(false);
      setForm({ date: new Date().toISOString().split('T')[0], so_email: user?.email || '', dealer_name: '', remarks: '', next_followup: '', next_visit_time: '', photo: '', gps_location: '' });
    } catch (e: any) { toast({ title: 'Sync Error', description: 'Visit data couldn\'t be saved.', variant: 'destructive' }); }
    finally { setSavingLoading(false); }
  };

  const isSalesOnly = user?.role === 'SALES';
  const myDealers = isSalesOnly ? dealers.filter(d => (d.assigned_so_email || '').toLowerCase() === (user?.email || '').toLowerCase() && d.active) : dealers.filter(d => d.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="page-header">Visit Tracking</h1><p className="page-subheader">Register dealer interactions with Maximum GPS Precision</p></div>
        <Button className="action-button group" onClick={() => setDialogOpen(true)}><Plus className="w-5 h-5 mr-2" /> Start Verified Punch</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visits.map((v, i) => (
          <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
               {v.photo && <img src={v.photo} alt="Visit Signature" className="w-full aspect-video object-cover" />}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold text-sm">{v.dealer_name}</h3>{!dealers.find(d => d.dealer_name === v.dealer_name) && <span className="text-[9px] text-orange-600 font-bold tracking-tighter">EXTERNAL</span>}</div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{v.date}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">"{v.remarks}"</p>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {v.next_visit_time ? new Date(v.next_visit_time).toLocaleString() : '—'}</span>
                  {v.gps_location && <span className="text-green-600 font-bold border border-green-600/30 px-1 rounded uppercase tracking-widest text-[8px]">Verified</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0" aria-describedby="visit-dialog-desc">
          <DialogHeader className="p-6 border-b flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-xl font-bold">Verified Visit Punch</DialogTitle>
              <DialogDescription id="visit-dialog-desc" className="sr-only">
                Capture a verified visit with live photo and GPS proof.
              </DialogDescription>
              <p className="text-xs text-muted-foreground">High Precision Tracking Active</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-sm ${gps?.accuracy && gps.accuracy < 20 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {gps?.source === 'Satellite' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
               {gpsStatus}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground tracking-wide font-bold">Interacted With *</Label>
                   <Tabs value={visitType} onValueChange={(v: any) => { setVisitType(v); setForm(p => ({ ...p, dealer_name: '' })); }} className="w-full">
                     <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="Dealer">Dealer</TabsTrigger><TabsTrigger value="External">Person / Site</TabsTrigger></TabsList>
                   </Tabs>
                 </div>
                 {visitType === 'Dealer' ? (
                   <div className="space-y-2"><Label>Dealer Name *</Label>
                     <Select value={form.dealer_name} onValueChange={v => setForm(p => ({ ...p, dealer_name: v }))}><SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger><SelectContent>{myDealers.map(d => <SelectItem key={d.dealer_code} value={d.dealer_name}>{d.dealer_name}</SelectItem>)}</SelectContent></Select>
                   </div>
                 ) : (
                   <div className="space-y-2"><Label>Person / Meeting Name *</Label><Input value={form.dealer_name} onChange={e => setForm(p => ({ ...p, dealer_name: e.target.value }))} placeholder="Type Name..." /></div>
                 )}
                 <div className="space-y-2"><Label>Next Visit Schedule *</Label><Input type="datetime-local" value={form.next_visit_time} onChange={e => setForm(p => ({ ...p, next_visit_time: e.target.value }))} /></div>
                 <div className="space-y-2"><Label>Notes / Discussion *</Label><Textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} rows={4} placeholder="Summary of meeting..." /></div>
              </div>

              <div className="space-y-4">
                 <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 space-y-4 h-full flex flex-col items-center justify-center min-h-[320px] relative">
                    <Label className="text-primary font-bold flex items-center gap-2 mb-2 w-full"><Camera className="w-4 h-4" /> Live Check-in Proof</Label>
                    
                    {cameraActive ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-primary w-full shadow-lg">
                        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute bottom-4 inset-x-0 flex justify-center"><Button onClick={handleCapture} disabled={savingLoading}>Capture Sealed Proof</Button></div>
                      </div>
                    ) : form.photo ? (
                      <div className="relative rounded-xl overflow-hidden border w-full shadow-md"><img src={form.photo} alt="Punch Signature" className="w-full" /><Button variant="secondary" size="sm" className="absolute top-2 right-2 opacity-90 h-8" onClick={startCamera}>Retake</Button></div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Button variant="outline" className="w-full flex-1 border-dashed border-2 flex flex-col gap-3 rounded-2xl hover:bg-primary/5 active:scale-95 transition-all shadow-sm" onClick={startCamera} disabled={!gps}>
                          <Camera className="w-10 h-10 text-muted-foreground" /><div className="text-center font-bold">Open Photo Sensor</div>
                        </Button>
                        {!gps && <p className="mt-3 text-[10px] text-amber-600 font-bold animate-pulse">Syncing location sensor... Please wait.</p>}
                      </div>
                    )}
                    
                    <div className="mt-4 w-full p-2 bg-muted/40 rounded-lg flex items-center justify-between text-[8px] tracking-widest text-muted-foreground/60 uppercase">
                       <span className="flex items-center gap-1"><Navigation className="w-2.5 h-2.5" /> High Precision Logic</span>
                       <span>GPS SECURE</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={savingLoading}>Discard</Button>
             <Button className="min-w-[160px] font-bold" onClick={handleSave} disabled={savingLoading || !form.photo}>{savingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Complete Verified Punch'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitTracking;
