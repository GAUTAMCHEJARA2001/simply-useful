import React from 'react';
import { SalesModal } from '../modals/SalesModal';
import { PurchaseModal } from '../modals/PurchaseModal';
import { ReturnOrderModal } from '../modals/ReturnOrderModal';
import { ViewProductionModal } from '../modals/ViewProductionModal';
import { useSales } from '@/hooks/inventory/useSales';
import { usePurchases } from '@/hooks/inventory/usePurchases';
import { useProductions } from '@/hooks/inventory/useProductions';
import { useReturns } from '@/hooks/inventory/useReturns';

interface GlobalTransactionViewerProps {
  type: string | null;
  referenceId: string | null;
  onClose: () => void;
}

export const GlobalTransactionViewer: React.FC<GlobalTransactionViewerProps> = ({ type, referenceId, onClose }) => {
  const { data: sales = [] } = useSales();
  const { data: purchases = [] } = usePurchases();
  const { data: productions = [] } = useProductions();
  const { data: returns = [] } = useReturns();

  if (!type || !referenceId) return null;

  // Find the exact transaction based on referenceId or internal id
  const findTx = (list: any[]) => list.find(t => 
    t.id === referenceId || 
    t.orderid === referenceId || 
    t.purchaseid === referenceId || 
    t.referenceid === referenceId ||
    t.docNo === referenceId ||
    (t.id && referenceId.includes(t.id)) ||
    (t.orderid && referenceId.includes(t.orderid))
  );

  const sale = type === 'sale' ? findTx(sales) : null;
  const purchase = type === 'purchase' ? findTx(purchases) : null;
  const production = type === 'production' ? findTx(productions) : null;
  const ret = type === 'return' ? findTx(returns) : null;

  return (
    <>
      {type === 'sale' && (
        <SalesModal 
          isOpen={true} 
          onClose={onClose} 
          sale={sale || { id: referenceId }} 
          readOnly 
        />
      )}
      {type === 'purchase' && (
        <PurchaseModal 
          isOpen={true} 
          onClose={onClose} 
          purchase={purchase || { id: referenceId }} 
          readOnly 
        />
      )}
      {type === 'return' && (
        <ReturnOrderModal 
          isOpen={true} 
          onClose={onClose} 
          returnOrder={ret || { id: referenceId }} 
          readOnly 
        />
      )}
      {type === 'production' && (
        <ViewProductionModal 
          isOpen={true} 
          onClose={onClose} 
          production={production || { id: referenceId, referenceid: referenceId }} 
        />
      )}
    </>
  );
};
