import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { leadService } from '@/api/services/lead.service';
import { Phone, Calendar, MessageSquare, MapPin, Users } from 'lucide-react';
import { Lead } from '../PipelineBoard';

interface CRMQuickFollowupModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CRMQuickFollowupModal: React.FC<CRMQuickFollowupModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [type, setType] = useState<'CALL' | 'VISIT' | 'MEETING' | 'EMAIL'>('CALL');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast({
        title: 'Outcome Notes Required',
        description: 'Please describe the conversation outcome or notes.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await leadService.addFollowup(
        lead.id,
        type,
        notes.trim(),
        nextDate ? new Date(nextDate).toISOString() : undefined
      );

      if (res.data?.success) {
        toast({
          title: 'Activity Logged ✅',
          description: `Follow-up recorded for ${lead.name}.`,
        });
        setNotes('');
        setNextDate('');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to Record Activity',
        description: err.response?.data?.message || 'Server connection error.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Log Interaction &amp; Follow-up
          </DialogTitle>
          <DialogDescription className="text-xs">
            Recording activity for <strong className="text-foreground">{lead.name}</strong>
            {lead.companyName && ` (${lead.companyName})`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Interaction Channel</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">📞 Phone Call</SelectItem>
                <SelectItem value="VISIT">🚗 Field Counter Visit</SelectItem>
                <SelectItem value="MEETING">🤝 In-Person Meeting</SelectItem>
                <SelectItem value="EMAIL">📧 Email / WhatsApp Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Discussion Outcome &amp; Notes *</Label>
            <Textarea
              placeholder="e.g. Quoted ₹320/bag for Tile Adhesive Plus. Dealer requested sample bag and price list on WhatsApp. Expected order next Monday."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[90px]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Next Scheduled Follow-up (Optional)</Label>
            <Input
              type="datetime-local"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Setting this will automatically trigger an agenda reminder on that date.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-primary font-bold">
              {saving ? 'Saving...' : 'Save Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
