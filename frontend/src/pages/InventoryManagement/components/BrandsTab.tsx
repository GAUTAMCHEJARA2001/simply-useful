import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { INVENTORY_ROLES } from '@/constants/roles';
import { useBrands, useBrandMutations } from '@/hooks/inventory/useBrands';
import { Brand } from '@/types';



export const BrandsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: brands = [], isLoading, error, refetch } = useBrands();
  const { saveBrand, deleteBrand } = useBrandMutations();

  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<Partial<Brand>>({});

  const handleSave = async () => {
    await saveBrand(form);
    setModal(false); 
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Brand?')) return;
    await deleteBrand(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Brands</h1>
        {INVENTORY_ROLES.includes(user?.role as any) && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Brand
          </Button>
        )}
      </div>

      <SafeDataView
        data={brands}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : error}
        onRetry={() => refetch()}
        emptyMessage="No brands found"
      >
        <DataTable
          columns={['Name']}
          rows={brands.map(b => [b.name])}
          onEdit={INVENTORY_ROLES.includes(user?.role as any) ? i => { setForm(brands[i]); setModal(true); } : undefined}
          onDelete={INVENTORY_ROLES.includes(user?.role as any) ? i => handleDelete(brands[i].id) : undefined} 
        />
      </SafeDataView>


      <Modal isOpen={modal} title={form.id ? "Edit Brand" : "Add Brand"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" required />
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
