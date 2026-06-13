import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useAdjustments, useAdjustmentMutations } from '@/hooks/inventory/useAdjustments';
import { useProducts } from '@/hooks/inventory/useProducts';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';

export const AdjustmentsTab: React.FC = () => {
  const { data: adjustments = [], isLoading, error, refetch } = useAdjustments();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const { saveAdjustment, deleteAdjustment } = useAdjustmentMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = async () => {
    await saveAdjustment(form);
    setModalOpen(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this adjustment?')) return;
    await deleteAdjustment(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Adjustments (Manual)</h1>
        <Button size="sm" onClick={() => { setForm({}); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Adjustment
        </Button>
      </div>

      <SafeDataView data={adjustments} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Product', 'Warehouse', 'Change', 'Reason', 'Date']}
          rows={adjustments.map((a: any) => [
            a.productName || a.product?.name || '—', 
            a.warehouseName || a.warehouse?.name || '—', 
            (a.quantityChange > 0 ? `+${a.quantityChange}` : a.quantityChange) || 0, 
            a.reason, 
            a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'
          ])}
          onEdit={i => { setForm(adjustments[i]); setModalOpen(true); }}
          onDelete={i => handleDelete(adjustments[i].id)}
        />
      </SafeDataView>

      <Modal isOpen={modalOpen} title="Stock Adjustment" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Product</label>
            <select value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
              <option value="">-- Choose Product --</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Warehouse</label>
            <select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
              <option value="">-- Choose Warehouse --</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Quantity Change (+/-)</label>
            <input type="number" value={form.quantityChange || ''} onChange={e => setForm({ ...form, quantityChange: parseFloat(e.target.value) })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Reason</label>
            <input value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.productId || !form.warehouseId || !form.quantityChange || !form.reason}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
