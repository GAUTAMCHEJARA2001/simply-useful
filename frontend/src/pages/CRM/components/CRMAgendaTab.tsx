import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock, Phone, Calendar, CheckCircle2, AlertTriangle, Store,
  ShoppingCart, CreditCard, ChevronRight, MessageSquare, ArrowRight, User
} from 'lucide-react';
import { Lead } from '../PipelineBoard';

interface CRMAgendaTabProps {
  leads: Lead[];
  hubData: any;
  onSelectLead: (lead: Lead) => void;
  onOpenFollowupModal?: (lead: Lead) => void;
  onCreateOrder: (partyName: string, partyType?: string) => void;
  onCollectPayment: (partyName: string, outstanding?: number) => void;
  onOpenLedger: (partyCode: string) => void;
}

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-11.666c.214.593.414 1.02.624 1.387.21.367.437.587.77.92.333.333.714.614 1.154.84.44.227.813.347 1.254.407.44.06.793.02 1.18-.087.387-.107.727-.32 1.02-.647.293-.327.467-.714.52-1.127.053-.413.013-.787-.12-1.087-.133-.3-.414-.493-.84-.707-.427-.213-1.007-.497-1.16-.547-.154-.05-.267-.073-.38.093-.113.167-.44.547-.54.667-.1.12-.2.133-.413.027-.214-.107-.907-.333-1.727-1.06-.633-.567-1.06-1.267-1.187-1.48-.127-.213-.013-.327.093-.433.097-.097.213-.247.32-.373.107-.127.14-.213.213-.36.073-.147.037-.28-.017-.387-.053-.107-.44-1.06-.603-1.453-.16-.39-.337-.337-.463-.343-.12-.006-.26-.006-.4-.006-.14 0-.367.053-.56.26-.193.207-.733.717-.733 1.747 0 1.03.75 2.023.853 2.16.103.137 1.474 2.25 3.57 3.153.5.214.887.34 1.19.437.502.16.96.137 1.32.083.403-.06 1.233-.503 1.407-.99.173-.487.173-.903.12-.99-.053-.087-.193-.137-.413-.247z"/>
  </svg>
);

export const CRMAgendaTab: React.FC<CRMAgendaTabProps> = ({
  leads,
  hubData,
  onSelectLead,
  onOpenFollowupModal,
  onCreateOrder,
  onCollectPayment,
  onOpenLedger,
}) => {
  const priorities = hubData?.daily_sop?.priorities || {};
  const creditQueue = priorities.payment_clearance_queue || [];
  const followupsQueue = priorities.overdue_followups_queue || [];
  const reorderQueue = priorities.reorder_due_queue || [];
  const closingQueue = priorities.negotiation_deals_queue || [];

  // Group follow-ups from leads data into Today, Overdue, Upcoming
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const extractedFollowups: any[] = [];
  leads.forEach((l: any) => {
    if (l.history && Array.isArray(l.history)) {
      l.history.forEach((f: any) => {
        if (f.next_followup_date || f.nextFollowupDate) {
          const dtStr = (f.next_followup_date || f.nextFollowupDate);
          const dt = new Date(dtStr);
          if (!isNaN(dt.getTime())) {
            extractedFollowups.push({
              lead: l,
              followup: f,
              dueDate: dt,
              dateStr: dt.toISOString().split('T')[0],
              timeStr: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            });
          }
        }
      });
    }
  });

  // Overdue followups from both hub priorities and leads
  const overdueItems = followupsQueue;
  const reorderItems = reorderQueue;
  const paymentDueItems = creditQueue;

  const getWhatsAppLink = (phone: string, leadName: string) => {
    const pClean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello ${leadName}, greetings from BuildPro! Checking in regarding our tile adhesives & building materials. How may we assist you today?`);
    return `https://wa.me/${pClean}?text=${msg}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Daily Action Agenda &amp; Follow-up Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your real-time field tasklist — calls to make, overdue dealer collections, counter reorder opportunities, and hot negotiations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
            {overdueItems.length} Overdue
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
            {reorderItems.length} Reorders Due
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            {closingQueue.length} Ready to Close
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 1: Overdue Inquiries & Scheduled Follow-ups */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Scheduled Follow-ups &amp; Due Inquiries</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Prospects expecting calls, visits, or rate quotes</p>
                </div>
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                {overdueItems.length} Due
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {overdueItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="text-xs font-semibold text-foreground">All scheduled follow-ups are up to date!</p>
                <p className="text-[11px]">No overdue reminders pending in your queue.</p>
              </div>
            ) : (
              overdueItems.map((item: any) => {
                const matchedLead = leads.find(l => l.id === item.lead_id);
                return (
                  <div
                    key={item.followup_id || item.lead_id}
                    className="p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span>{item.lead_name}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold uppercase">
                            {item.lead_status || 'Inquiry'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.notes || 'Scheduled customer follow-up reminder'}
                        </p>
                      </div>
                      {item.phone && (
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={getWhatsAppLink(item.phone, item.lead_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`tel:${item.phone}`}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Call Phone"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                      <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Due for Action
                      </span>
                      <div className="flex items-center gap-1.5">
                        {matchedLead && onOpenFollowupModal && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2.5 font-semibold gap-1 text-primary border-primary/30"
                            onClick={() => onOpenFollowupModal(matchedLead)}
                          >
                            <MessageSquare className="w-3 h-3" /> Log Outcome
                          </Button>
                        )}
                        {matchedLead && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[11px] px-2.5 font-semibold gap-1 bg-primary text-primary-foreground"
                            onClick={() => onSelectLead(matchedLead)}
                          >
                            View Lead &rarr;
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Section 2: Hot Negotiation Deals Ready to Close */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Hot Deals Ready to Close</CardTitle>
                  <p className="text-[11px] text-muted-foreground">High-probability proposals in final negotiation stage</p>
                </div>
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                {closingQueue.length} Deals
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {closingQueue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1.5">
                <Store className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No deals currently in final negotiation stage.</p>
                <p className="text-[11px]">Advance proposals from your pipeline to populate closing deals.</p>
              </div>
            ) : (
              closingQueue.map((deal: any) => {
                const matchedLead = leads.find(l => l.id === deal.id);
                return (
                  <div
                    key={deal.id}
                    className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span>{deal.name}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold text-emerald-600 border-emerald-500/30">
                            Negotiation
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {deal.company_name ? `Shop: ${deal.company_name}` : 'Direct Contractor / Dealer Lead'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Deal Value:</div>
                        <div className="text-sm font-extrabold text-foreground">
                          ₹{Number(deal.value || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        ⚡ Ready for Order / Dealer Conversion
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2.5 font-bold gap-1 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => onCreateOrder(deal.company_name || deal.name, 'Dealer')}
                        >
                          <ShoppingCart className="w-3 h-3" /> Book Order
                        </Button>
                        {matchedLead && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[11px] px-2.5 font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => onSelectLead(matchedLead)}
                          >
                            Convert / Close &rarr;
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Section 3: Territory Reorders Due */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Counter Reorders Due (30–60 Days Inactive)</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Regular territory dealers ready for stock replenishment</p>
                </div>
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                {reorderItems.length} Counters
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {reorderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="text-xs font-semibold text-foreground">All territory dealers have ordered recently!</p>
                <p className="text-[11px]">No counters overdue for stock reorders today.</p>
              </div>
            ) : (
              reorderItems.slice(0, 5).map((d: any) => (
                <div
                  key={d.id || d.code}
                  className="p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{d.name}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 text-muted-foreground">
                          {d.city}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last order: <strong className="text-foreground">{d.days_since_last_order} days ago</strong> • ₹{Number(d.last_order_amount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {d.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={getWhatsAppLink(d.phone, d.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp Reorder Reminder"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${d.phone}`}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Call Dealer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">
                      Available Credit: <strong className="text-emerald-600">₹{Number(d.available_credit || 0).toLocaleString('en-IN')}</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[11px] px-3 font-bold gap-1 bg-primary text-primary-foreground"
                      onClick={() => onCreateOrder(d.name, 'Dealer')}
                    >
                      <ShoppingCart className="w-3 h-3" /> Book Reorder
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Section 4: Urgent Payment Clearances */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Urgent Payment Clearances</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Accounts exceeding credit limits — collect before dispatching</p>
                </div>
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-rose-500/10 text-rose-700 border-rose-500/20">
                {paymentDueItems.length} Overdue
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {paymentDueItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="text-xs font-semibold text-foreground">All territory counters are in safe credit limits!</p>
                <p className="text-[11px]">No accounts currently blocked for pending collections.</p>
              </div>
            ) : (
              paymentDueItems.slice(0, 5).map((d: any) => (
                <div
                  key={d.id || d.code}
                  className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{d.name}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold text-rose-600 border-rose-500/30">
                          {d.credit_status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Outstanding: <strong className="text-rose-600 font-extrabold">₹{Number(d.outstanding || 0).toLocaleString('en-IN')}</strong> / Limit: ₹{Number(d.credit_limit || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {d.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={getWhatsAppLink(d.phone, d.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp Payment Reminder"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${d.phone}`}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => onOpenLedger(d.code)}
                    >
                      Statement / Ledger
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[11px] px-3 font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => onCollectPayment(d.name, d.outstanding)}
                    >
                      <CreditCard className="w-3 h-3" /> Record Payment
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
