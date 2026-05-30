import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { inventoryService } from '@/api/services/inventory.service';
import { useAuth } from '@/contexts/AuthContext';
import { SafeDataView } from '@/components/SafeDataView';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/Modal';
import { INVENTORY_ROLES } from '@/constants/roles';


import { useCategories, useCategoryMutations } from '@/hooks/inventory/useCategories';

export const SubCategoriesTab: React.FC = () => {
  const { user } = useAuth();
  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const { saveCategory, deleteCategory } = useCategoryMutations();

  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({});

  const handleSave = async () => {
    if (!form.parentId && !form.parent_id) {
        alert('Please select a parent category.');
        return;
    }
    await saveCategory(form);
    setModal(false); 
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Sub Category?')) return;
    await deleteCategory(id);
  };

  const filtered = categories.filter(c => c.parentId || c.parent_id);
  const parents = categories.filter(c => !c.parentId && !c.parent_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sub Categories</h1>
        {INVENTORY_ROLES.includes(user?.role as any) && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Sub Category
          </Button>
        )}
      </div>

      <SafeDataView
        data={filtered}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : error}
        onRetry={() => refetch()}
        emptyMessage="No sub-categories found"
      >
        <DataTable
          columns={['Name', 'Parent Category']}
          rows={filtered.map(c => [c.name, categories.find(p => p.id === c.parentId)?.name || '—'])}
          onEdit={INVENTORY_ROLES.includes(user?.role as any) ? i => { setForm(filtered[i]); setModal(true); } : undefined}
          onDelete={INVENTORY_ROLES.includes(user?.role as any) ? i => handleDelete(filtered[i].id) : undefined} 
        />
      </SafeDataView>


      <Modal isOpen={modal} title={form.id ? "Edit Sub Category" : "Add Sub Category"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Parent Category</label>
              <select value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" required>
                <option value="" disabled>-- Select Parent --</option>
                {parents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
