import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  orderId: string;
  partyName?: string;
}

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  partyName
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Order Deletion" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1">
            <h4 className="font-bold text-foreground">Permanent Deletion</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete order <strong className="text-foreground">{orderId}</strong>
              {partyName ? ` for ${partyName}` : ''}? This will remove the order record and its items.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Order'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
