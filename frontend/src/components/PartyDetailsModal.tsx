import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Store, Phone, Mail, MapPin, FileText, CreditCard,
  User, CheckCircle2, XCircle, ShoppingBag, BookOpen, ExternalLink,
  Copy, Check, ShieldCheck, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PartyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: any | null;
  partyType?: 'dealer' | 'distributor' | 'project';
  onViewLedger?: (partyCode: string) => void;
}

export const PartyDetailsModal: React.FC<PartyDetailsModalProps> = ({
  isOpen,
  onClose,
  party,
  partyType,
  onViewLedger,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!party) return null;

  const firmName = party.dealerName || party.distributorName || party.partyName || party.name || '—';
  const code = party.dealerCode || party.distributorCode || party.partyCode || party.code || '—';
  const isDistributor = partyType === 'distributor' || !!party.distributorCode || (party.area && !party.city);
  const isProject = party.partyType === 'PROJECT' || partyType === 'project';
  const typeLabel = isProject ? 'Project Site' : isDistributor ? 'Distributor' : 'Dealer';

  const contactPerson = party.contactPerson || party.contact_person || '—';
  const phone = party.phone || party.contact || party.mobile || '';
  const email = party.email || '';
  const gst = party.gst || party.gst_number || party.gstNumber || '';
  const address = party.address || '';
  const city = party.city || party.area || '';
  const territory = party.territory || '';
  const state = party.state || '';
  const brand = party.brand || '';
  const parentDistributor = party.distributorName || party.distributor_name || '';
  const creditLimit = Number(party.creditLimit || party.credit_limit || 0);
  const outstanding = Number(party.outstanding || 0);
  const isActive = party.active !== false;

  const assignedSOs: string[] = [
    ...(Array.isArray(party.assignedSoEmails) ? party.assignedSoEmails : []),
    ...(Array.isArray(party.assignedsoemails) ? party.assignedsoemails : []),
    party.assignedSoEmail,
    party.assigned_so_email
  ].filter(Boolean);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateOrder = () => {
    onClose();
    navigate('/sales/order', { state: { preselectedParty: party } });
  };

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-border shadow-2xl bg-card">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                {isDistributor ? <Building2 className="w-6 h-6" /> : <Store className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-foreground tracking-tight">{firmName}</h2>
                  <Badge 
                    variant={isActive ? 'default' : 'destructive'} 
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {isActive ? 'Active' : 'Blocked'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {typeLabel}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-2">
                  <span>Code: <strong className="text-foreground">{code}</strong></span>
                  {territory && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-medium">Territory: {territory}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {phone && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
                  asChild
                >
                  <a href={`tel:${phone}`}>
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Call
                  </a>
                </Button>
              )}
              {cleanPhone && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 flex-1 sm:flex-initial"
                  asChild
                >
                  <a 
                    href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Credit Limit
              </span>
              <span className="text-base font-extrabold text-foreground">
                ₹{creditLimit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Outstanding
              </span>
              <span className={`text-base font-extrabold ${outstanding > creditLimit && creditLimit > 0 ? 'text-destructive' : 'text-foreground'}`}>
                ₹{outstanding.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                City / Area
              </span>
              <span className="text-xs font-bold text-foreground truncate block" title={city || '—'}>
                {city || '—'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Brand Focus
              </span>
              <span className="text-xs font-bold text-primary truncate block" title={brand || 'All Brands'}>
                {brand || 'All Brands'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact & Communication */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <User className="w-3.5 h-3.5 text-primary" /> Contact &amp; Personnel
              </h4>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Contact Person:</span>
                  <span className="font-semibold text-foreground">{contactPerson}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mobile / Phone:</span>
                  {phone ? (
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${phone}`} className="font-semibold text-primary hover:underline">
                        {phone}
                      </a>
                      <button 
                        onClick={() => copyToClipboard(phone, 'Phone')} 
                        className="text-muted-foreground hover:text-foreground p-0.5" 
                        title="Copy Phone"
                      >
                        {copiedField === 'Phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email:</span>
                  {email ? (
                    <div className="flex items-center gap-1.5">
                      <a href={`mailto:${email}`} className="font-semibold text-primary hover:underline truncate max-w-[180px]" title={email}>
                        {email}
                      </a>
                      <button 
                        onClick={() => copyToClipboard(email, 'Email')} 
                        className="text-muted-foreground hover:text-foreground p-0.5" 
                        title="Copy Email"
                      >
                        {copiedField === 'Email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Legal & Tax Information */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Tax &amp; Firm Info
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">GST Number:</span>
                  {gst ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                        {gst}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(gst, 'GST')} 
                        className="text-muted-foreground hover:text-foreground p-0.5" 
                        title="Copy GST"
                      >
                        {copiedField === 'GST' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Unregistered / Not Provided</span>
                  )}
                </div>

                {!isDistributor && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Attached Distributor:</span>
                    <span className="font-semibold text-foreground">{parentDistributor || 'Direct / None'}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Party Category:</span>
                  <span className="font-semibold text-foreground">{typeLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Full Address */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Address &amp; Location
            </h4>
            
            <div className="text-xs space-y-1.5">
              <div className="text-foreground font-medium leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/30">
                {address ? address : <span className="text-muted-foreground italic">No physical address recorded for this party.</span>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-muted-foreground">
                <div>City: <strong className="text-foreground">{city || '—'}</strong></div>
                <div>Territory: <strong className="text-foreground">{territory || '—'}</strong></div>
                {state && <div>State: <strong className="text-foreground">{state}</strong></div>}
              </div>
            </div>
          </div>

          {/* Assigned Sales Officers */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
              <User className="w-3.5 h-3.5 text-primary" /> Assigned Sales Officers
            </h4>
            
            {assignedSOs.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {assignedSOs.map((email, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                  >
                    <User className="w-3 h-3 opacity-70" />
                    {email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No dedicated sales officer mapped yet.</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onViewLedger && code && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  onClose();
                  onViewLedger(code);
                }} 
                className="text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <BookOpen className="w-3.5 h-3.5" /> View Ledger
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={handleCreateOrder} 
              className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> New Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default PartyDetailsModal;
