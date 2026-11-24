import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { leadService } from '@/api/services/lead.service';
import { Store, UserCheck, ShieldCheck, AlertCircle, ShoppingCart } from 'lucide-react';
import { Lead } from '../PipelineBoard';
import { useNavigate } from 'react-router-dom';

interface CRMConvertDealerModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CRMConvertDealerModal: React.FC<CRMConvertDealerModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdDealer, setCreatedDealer] = useState<any>(null);

  if (!lead) return null;

  const handleConvert = async () => {
    if (!lead.phone) {
      toast({
        title: 'Phone Number Required',
        description: 'Please add a phone number to this lead before converting to a dealer.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await leadService.convertToDealer(lead.id);
      if (res.data?.success) {
        toast({
          title: 'CONVERTED TO DEALER! 🚀',
          description: `Dealer account created for ${lead.companyName || lead.name}. Code: ${res.data.data?.dealerCode || 'Generated'}`,
        });
        setCreatedDealer(res.data.data);
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: 'Conversion Failed',
        description: err.response?.data?.message || 'Could not convert to dealer. Please verify dealer uniqueness.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedDealer(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-600" />
            {createdDealer ? 'Dealer Account Activated!' : 'Convert Lead to Registered Dealer'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {createdDealer
              ? 'The party is now fully registered in your ERP dealer network.'
              : 'Promote this qualified prospect to an official counter in your ERP.'}
          </DialogDescription>
        </DialogHeader>

        {createdDealer ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-600" />
              <h4 className="font-bold text-sm text-foreground">{lead.companyName || lead.name}</h4>
              <p className="text-muted-foreground">
                Dealer Code: <strong className="font-mono text-emerald-600 font-bold">{createdDealer.dealerCode}</strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Status has been updated to <strong>WON</strong> in your CRM pipeline.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                onClick={() => {
                  handleClose();
                  navigate('/sales/order', {
                    state: {
                      partyName: lead.companyName || lead.name,
                      partyType: 'Dealer',
                      dealerCode: createdDealer.dealerCode,
                    },
                  });
                }}
              >
                <ShoppingCart className="w-4 h-4" /> Book First Order Now
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Prospect Name:</span>
                <strong className="text-foreground">{lead.name}</strong>
              </div>
              {lead.companyName && (
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Dealer / Counter Name:</span>
                  <strong className="text-foreground">{lead.companyName}</strong>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Phone Number:</span>
                <span className="font-mono text-foreground font-semibold">{lead.phone || 'None (Required)'}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">City / Territory:</span>
                <span className="text-foreground">{lead.city || 'General'}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Pipeline Value:</span>
                <strong className="text-emerald-600">₹{Number(lead.value || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {!lead.phone && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This lead has no registered phone number. Please edit the lead to add a phone number before converting.</span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upon conversion, the CRM will generate an authorized Dealer code, add them to your Territory Counter Directory, and mark this deal as <strong>Won</strong>.
            </p>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading || !lead.phone}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                onClick={handleConvert}
              >
                {loading ? 'Converting...' : 'Confirm & Convert to Dealer'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
