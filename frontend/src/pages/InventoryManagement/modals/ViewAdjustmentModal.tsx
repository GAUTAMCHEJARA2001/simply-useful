import React from 'react';
import { Modal } from '@/components/Modal';

interface ViewAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: any;
}

export const ViewAdjustmentModal: React.FC<ViewAdjustmentModalProps> = ({ isOpen, onClose, adjustment }) => {
  if (!adjustment) return null;

  return (
    <Modal isOpen={isOpen} title={`View Adjustment: ${adjustment.referenceid || adjustment.id || 'ADJ'}`} onClose={onClose}>
      <div className="p-4 space-y-6">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            ⚖️ Adjustment Details
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Product</p>
              <p className="font-semibold">{adjustment.productName || adjustment.productid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Warehouse</p>
              <p className="font-medium">{adjustment.warehouseName || adjustment.warehouseid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Quantity Change</p>
              <p className={`font-bold text-lg ${adjustment.quantityChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {adjustment.quantityChange > 0 ? '+' : ''}{adjustment.quantityChange || adjustment.quantity || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Date</p>
              <p className="font-medium">
                {adjustment.createdAt || adjustment.createdat ? new Date(adjustment.createdAt || adjustment.createdat).toLocaleDateString() : '—'}
              </p>
            </div>
            {adjustment.reason && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Reason</p>
                <p className="bg-background rounded p-2 text-xs border border-border">
                  {adjustment.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
