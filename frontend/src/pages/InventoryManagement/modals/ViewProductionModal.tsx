import React from 'react';
import { Modal } from '@/components/Modal';

interface ViewProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: any;
}

export const ViewProductionModal: React.FC<ViewProductionModalProps> = ({ isOpen, onClose, production }) => {
  if (!production) return null;

  return (
    <Modal isOpen={isOpen} title={`View Production: ${production.referenceid || production.id}`} onClose={onClose}>
      <div className="p-4 space-y-6">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            🏭 Production Details
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Product</p>
              <p className="font-semibold">{production.finishedProductName || production.productName || production.productid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Warehouse</p>
              <p className="font-medium">{production.warehouseName || production.warehouseid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Quantity Produced</p>
              <p className="font-bold text-lg text-green-600">+{production.quantityProduced || production.quantity || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Date</p>
              <p className="font-medium">
                {production.createdAt || production.createdat ? new Date(production.createdAt || production.createdat).toLocaleDateString() : '—'}
              </p>
            </div>
            {production.reason && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Remarks</p>
                <p className="bg-background rounded p-2 text-xs border border-border">
                  {production.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
