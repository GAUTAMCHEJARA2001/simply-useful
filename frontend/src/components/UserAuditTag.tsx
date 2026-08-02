import React from 'react';
import { User, Edit3, Clock, ShieldCheck } from 'lucide-react';

export interface AuditUserInfo {
  name?: string;
  email?: string;
  role?: string;
  at?: string;
  count?: number;
}

interface UserAuditTagProps {
  createdBy?: AuditUserInfo | string | null;
  createdAt?: string | null;
  lastEditedBy?: AuditUserInfo | string | null;
  lastEditedAt?: string | null;
  className?: string;
  compact?: boolean;
}

const formatDate = (dStr?: string | null) => {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dStr;
  }
};

export const UserAuditTag: React.FC<UserAuditTagProps> = ({
  createdBy,
  createdAt,
  lastEditedBy,
  lastEditedAt,
  className = '',
  compact = false
}) => {
  // Normalize createdBy
  const creatorObj: AuditUserInfo | null = typeof createdBy === 'object' && createdBy ? createdBy : (typeof createdBy === 'string' && createdBy ? { name: createdBy, email: createdBy } : null);
  
  // Normalize lastEditedBy
  const editorObj: AuditUserInfo | null = typeof lastEditedBy === 'object' && lastEditedBy ? lastEditedBy : (typeof lastEditedBy === 'string' && lastEditedBy ? { name: lastEditedBy, email: lastEditedBy } : null);

  if (!creatorObj && !editorObj && !createdAt) {
    return null;
  }

  if (compact) {
    return (
      <div className={`inline-flex flex-col gap-0.5 text-[10px] text-muted-foreground font-medium ${className}`}>
        {creatorObj && (
          <span className="flex items-center gap-1 text-foreground/80" title={`Created by ${creatorObj.email || creatorObj.name}`}>
            <User className="w-3 h-3 text-primary shrink-0" />
            <span className="font-semibold">{creatorObj.name || creatorObj.email}</span>
            {creatorObj.role && <span className="bg-muted px-1 rounded text-[9px] font-mono">{creatorObj.role}</span>}
          </span>
        )}
        {editorObj && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold" title={`Edited ${editorObj.count ? `${editorObj.count}x` : ''} by ${editorObj.email || editorObj.name}`}>
            <Edit3 className="w-3 h-3 shrink-0" />
            <span>Edited {editorObj.count ? `${editorObj.count}x` : ''} by {editorObj.name || editorObj.email}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2 text-xs ${className}`}>
      {creatorObj && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Created by:</span>
            <span className="font-bold text-foreground">{creatorObj.name || creatorObj.email}</span>
            {creatorObj.email && creatorObj.email !== creatorObj.name && (
              <span className="text-muted-foreground text-[11px]">({creatorObj.email})</span>
            )}
            {creatorObj.role && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                {creatorObj.role}
              </span>
            )}
          </div>
          {(creatorObj.at || createdAt) && (
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(creatorObj.at || createdAt)}
            </span>
          )}
        </div>
      )}

      {editorObj && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/40">
          <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>Last Edited by:</span>
            <span className="font-bold text-foreground">{editorObj.name || editorObj.email}</span>
            {editorObj.email && editorObj.email !== editorObj.name && (
              <span className="text-muted-foreground text-[11px]">({editorObj.email})</span>
            )}
            {editorObj.role && (
              <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded">
                {editorObj.role}
              </span>
            )}
            {editorObj.count && editorObj.count > 0 && (
              <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                {editorObj.count} {editorObj.count === 1 ? 'edit' : 'edits'}
              </span>
            )}
          </div>
          {(editorObj.at || lastEditedAt) && (
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(editorObj.at || lastEditedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAuditTag;
