import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Building2, User, ArrowRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status: 'NEW' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  value: number;
  notes?: string;
  city?: string;
  state?: string;
  pincode?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

interface PipelineBoardProps {
  leads: Lead[];
  onMoveLead: (leadId: string, targetStage: Lead['status']) => void;
  onSelectLead: (lead: Lead) => void;
  canManage: boolean;
}

const STAGES: { id: Lead['status']; title: string; color: string }[] = [
  { id: 'NEW', title: 'New Leads', color: 'border-t-blue-500 bg-blue-500/5' },
  { id: 'CONTACTED', title: 'Contacted', color: 'border-t-cyan-500 bg-cyan-500/5' },
  { id: 'PROPOSAL', title: 'Proposal', color: 'border-t-purple-500 bg-purple-500/5' },
  { id: 'NEGOTIATION', title: 'Negotiation', color: 'border-t-amber-500 bg-amber-500/5' },
  { id: 'WON', title: 'Won (Closed)', color: 'border-t-emerald-500 bg-emerald-500/5' },
  { id: 'LOST', title: 'Lost (Closed)', color: 'border-t-rose-500 bg-rose-500/5' },
];

const PRIORITY_STYLES = {
  HIGH: 'bg-destructive/15 text-destructive border-destructive/20',
  MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LOW: 'bg-slate-500/15 text-slate-600 border-slate-500/20',
};

// Strict state transition guidelines mapping matching lead_pipeline_service.py
const ALLOWED_TRANSITIONS: Record<Lead['status'], Lead['status'][]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
};

const PipelineBoard: React.FC<PipelineBoardProps> = ({ leads, onMoveLead, onSelectLead, canManage }) => {
  
  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: Lead['status']) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onMoveLead(leadId, targetStage);
    }
  };

  // Helper to filter leads by stage
  const getLeadsByStage = (stageId: Lead['status']) => {
    return leads.filter(lead => lead.status === stageId);
  };

  // Helper to compute column sum
  const getColumnSum = (stageId: Lead['status']) => {
    return leads
      .filter(lead => lead.status === stageId)
      .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const columnLeads = getLeadsByStage(stage.id);
        const columnSum = getColumnSum(stage.id);

        return (
          <div
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, stage.id)}
            className={`flex flex-col rounded-xl border border-border/50 border-t-4 p-3 min-w-[240px] xl:min-w-0 min-h-[500px] ${stage.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
              <div>
                <h3 className="font-bold text-sm text-foreground">{stage.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">₹{columnSum.toLocaleString('en-IN')}</p>
              </div>
              <Badge variant="outline" className="bg-background/80 font-bold shrink-0">
                {columnLeads.length}
              </Badge>
            </div>

            {/* Leads Stack */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
              <AnimatePresence initial={false}>
                {columnLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    draggable={canManage && stage.id !== 'WON'}
                    onDragStart={(e: any) => handleDragStart(e, lead.id)}
                    className={`cursor-pointer group relative rounded-lg border border-border/60 bg-background/90 hover:bg-background shadow-sm hover:shadow-md transition-all ${
                      canManage && stage.id !== 'WON' ? 'active:cursor-grabbing hover:border-primary/40' : ''
                    }`}
                    onClick={() => onSelectLead(lead)}
                  >
                    <CardContent className="p-3 space-y-3">
                      {/* Priority and Value */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 ${PRIORITY_STYLES[lead.priority]}`}>
                          {lead.priority}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          ₹{(Number(lead.value) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Info block */}
                      <div className="space-y-1">
                        <p className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {lead.name}
                        </p>
                        {lead.companyName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <Building2 className="w-3.5 h-3.5" />
                            {lead.companyName}
                          </p>
                        )}
                      </div>

                      {/* Contacts footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground gap-2">
                        <div className="flex gap-2">
                          {lead.phone && <span title={lead.phone}><Phone className="w-3 h-3 hover:text-foreground" /></span>}
                          {lead.email && <span title={lead.email}><Mail className="w-3 h-3 hover:text-foreground" /></span>}
                        </div>
                        {lead.assignedTo && (
                          <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-foreground/80 truncate max-w-[80px]" title={lead.assignedTo}>
                            {lead.assignedTo.split('@')[0]}
                          </span>
                        )}
                      </div>

                      {/* Manual Stage Move Action Trigger (Fallback/Accessibility) */}
                      {canManage && stage.id !== 'WON' && (
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/95 rounded border border-border/40 p-0.5 shadow-sm">
                          {(ALLOWED_TRANSITIONS[stage.id] || []).map(targetId => {
                            const target = STAGES.find(s => s.id === targetId);
                            if (!target) return null;
                            return (
                              <Button
                                key={target.id}
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 hover:bg-muted text-[9px] font-bold text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveLead(lead.id, target.id);
                                }}
                                title={`Move to ${target.title}`}
                              >
                                {target.id === 'LOST' ? '🔴 Lost' : target.id === 'WON' ? '🟢 Won' : `👉 ${target.id.toLowerCase()}`}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                ))}
              </AnimatePresence>

              {columnLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 rounded border border-dashed border-border/40 bg-muted/10">
                  <p className="text-xs text-muted-foreground">Empty column</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineBoard;
