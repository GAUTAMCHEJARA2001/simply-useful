import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useSuppliers, useSupplierMutations } from '@/hooks/inventory/useSuppliers';
import { Modal } from '@/components/Modal';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const SuppliersTab: React.FC = () => {
  const { data: suppliers = [], isLoading, error, refetch } = useSuppliers();
  const { saveSupplier, deleteSupplier } = useSupplierMutations();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = async () => {
    await saveSupplier(form);
    setModal(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    await deleteSupplier(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
        </Button>
      </div>

      <SafeDataView data={suppliers} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Name', 'Contact', 'Address', 'GST', 'Balance']}
          rows={suppliers.map((s: any) => [s.name, s.contact_info || s.contactInfo, s.address, s.gstNumber, Currency(s.balance)])}
          onEdit={i => { setForm(suppliers[i]); setModal(true); }}
          onDelete={i => handleDelete(suppliers[i].id)}
        />
      </SafeDataView>

      <Modal isOpen={modal} title={form.id ? "Edit Supplier" : "Add Supplier"} onClose={() => setModal(false)}>
        <div className="space-y-4">
          {[
            ['name', 'Name'], 
            ['contact_person', 'Contact Person'], 
            ['contact_info', 'Contact'], 
            ['email', 'Email'], 
            ['address', 'Address'], 
            ['gstNumber', 'GST Number']
          ].map(([k, lbl]) => (
            <div key={k}>
              <label className="text-sm font-medium block mb-1">{lbl}</label>
              <input 
                value={form[k] || ''} 
                onChange={e => setForm({ ...form, [k]: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
