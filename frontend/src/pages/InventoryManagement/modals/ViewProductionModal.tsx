import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import apiClient from '@/api/client';
import { RefreshCw } from 'lucide-react';

interface ViewProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: any;
}

export const ViewProductionModal: React.FC<ViewProductionModalProps> = ({ isOpen, onClose, production }) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && production?.id) {
      setLoading(true);
      apiClient<any[]>(`/inv/transactions/productions/${production.id}/materials`)
        .then(res => {
          setMaterials(res.success ? res.data : (Array.isArray(res) ? res : []));
        })
        .catch(err => console.error('Failed to load materials', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, production?.id]);

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
              <p className="text-muted-foreground text-xs mb-1">Finished Product</p>
              <p className="font-semibold">{production.finishedProductName || production.productName || production.productid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Warehouse</p>
              <p className="font-medium">{production.warehouseName || production.warehouseid?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Actual Quantity Produced</p>
              <p className="font-bold text-lg text-green-600">+{production.quantityProduced || production.quantity || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Production Date</p>
              <p className="font-medium">
                {production.createdAt || production.createdat ? new Date(production.createdAt || production.createdat).toLocaleDateString('en-IN') : '—'}
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

        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wide">Consumed Raw Materials</h3>
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </div>
          <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
            {materials.length === 0 && !loading ? (
              <p className="text-sm text-center py-4 text-muted-foreground">No raw materials recorded.</p>
            ) : (
              materials.map((mat, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                  <div>
                    <p className="font-medium text-sm">{mat.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mat.unit || 'KG'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-red-500">
                      -{mat.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
