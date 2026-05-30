import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useLabour, useLabourMutations } from '@/hooks/inventory/useLabour';
import { Modal } from '@/components/Modal';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const LabourTab: React.FC = () => {
  const { data: labours = [], isLoading, error, refetch } = useLabour();
  const { saveLabour, deleteLabour } = useLabourMutations();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = async () => {
    await saveLabour(form);
    setModal(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this labour record?')) return;
    await deleteLabour(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Labour Master (Staff)</h1>
        <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Labour
        </Button>
      </div>

      <SafeDataView data={labours} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Name', 'Daily Wage']}
          rows={labours.map((l: any) => [l.name, Currency(l.dailyWage)])}
          onEdit={i => { setForm(labours[i]); setModal(true); }}
          onDelete={i => handleDelete(labours[i].id)}
        />
      </SafeDataView>

      <Modal isOpen={modal} title={form.id ? "Edit Labour" : "Add Labour"} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input 
              value={form.name || ''} 
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Daily Wage</label>
            <input 
              type="number"
              value={form.dailyWage || ''} 
              onChange={e => setForm({ ...form, dailyWage: parseFloat(e.target.value) })}
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
