import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, ClipboardList } from 'lucide-react';

interface PurchaseOrdersTabProps {
  purchaseOrders: any[];
  onAdd: () => void;
  onRowClick: (po: any) => void;
  Currency: (v: number) => string;
}

export const PurchaseOrdersTab: React.FC<PurchaseOrdersTabProps> = ({ 
  purchaseOrders, 
  onAdd, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchase Orders</h1>
        <Button size="sm" onClick={onAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Create New PO
        </Button>
      </div>
      <DataTable 
        columns={['PO #', 'Supplier', 'Expected Date', 'Amount', 'Status', 'Date']}
        rows={purchaseOrders.map(po => [
          po.po_number,
          po.supplier_name,
          po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN') : '—',
          Currency(po.net_amount),
          <span key={po.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            po.status === 'DRAFT' ? 'bg-muted text-muted-foreground' : 
            po.status === 'ORDERED' ? 'bg-blue-100 text-blue-700' : 
            po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>{po.status}</span>,
          new Date(po.created_at).toLocaleDateString('en-IN')
        ])}
        onRowClick={i => onRowClick(purchaseOrders[i])}
      />
    </div>
  );
};
