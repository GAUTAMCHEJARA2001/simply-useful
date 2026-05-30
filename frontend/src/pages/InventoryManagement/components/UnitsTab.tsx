import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useUnits, useUnitMutations } from '@/hooks/inventory/useMasters';
import { Modal } from '@/components/Modal';
import { SafeDataView } from '@/components/SafeDataView';
import { useAuth } from '@/contexts/AuthContext';

export const UnitsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: units = [], isLoading, error, refetch } = useUnits();
  const { saveUnit, deleteUnit } = useUnitMutations();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const canManage = ['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '');

  const handleSave = async () => {
    await saveUnit(form);
    setModal(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    await deleteUnit(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Units</h1>
        {canManage && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Unit
          </Button>
        )}
      </div>

      <SafeDataView data={units} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Name']}
          rows={units.map((u: any) => [u.name])}
          onEdit={canManage ? i => { setForm(units[i]); setModal(true); } : undefined}
          onDelete={canManage ? i => handleDelete(units[i].id) : undefined}
        />
      </SafeDataView>

      <Modal isOpen={modal} title={form.id ? "Edit Unit" : "Add Unit"} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input 
              value={form.name || ''} 
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
