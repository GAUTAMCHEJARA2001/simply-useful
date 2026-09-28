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
  const { toast } = useToast();
  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const { saveCategory, deleteCategory } = useCategoryMutations();

  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    const parentIdVal = form.parentId ?? form.parent_id;
    if (!parentIdVal) {
      toast({
        title: 'Validation Error',
        description: 'Please select a parent category.',
        variant: 'destructive',
      });
      return;
    }
    const nameVal = (form.name || '').trim();
    if (!nameVal) {
      toast({
        title: 'Validation Error',
        description: 'Sub category name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: nameVal,
        parentId: parseInt(String(parentIdVal), 10),
      };
      if (form.id) {
        payload.id = form.id;
      }
      await saveCategory(payload);
      setModal(false); 
      setForm({});
      await refetch();
    } catch (err: any) {
      console.error('Failed to save subcategory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this Sub Category?')) return;
    try {
      await deleteCategory(String(id));
      await refetch();
    } catch (err) {
      console.error('Failed to delete subcategory:', err);
    }
  };

  const filtered = categories.filter(c => (c.parentId != null && c.parentId !== '') || (c.parent_id != null && c.parent_id !== ''));
  const parents = categories.filter(c => (c.parentId == null || c.parentId === '') && (c.parent_id == null || c.parent_id === ''));

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
          rows={filtered.map(c => [
            c.name, 
            categories.find(p => String(p.id) === String(c.parentId ?? c.parent_id))?.name || '—'
          ])}
          onEdit={INVENTORY_ROLES.includes(user?.role as any) ? i => { 
            const item = filtered[i];
            setForm({ 
              ...item, 
              parentId: item.parentId ?? item.parent_id ?? '' 
            }); 
            setModal(true); 
          } : undefined}
          onDelete={INVENTORY_ROLES.includes(user?.role as any) ? i => handleDelete(filtered[i].id) : undefined} 
        />
      </SafeDataView>

      <Modal isOpen={modal} title={form.id ? "Edit Sub Category" : "Add Sub Category"} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name <span className="text-destructive">*</span></label>
            <input 
              value={form.name || ''} 
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. TILE ADHESIVE"
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              required 
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Parent Category <span className="text-destructive">*</span></label>
            <select 
              value={form.parentId != null ? String(form.parentId) : ''} 
              onChange={e => setForm({ ...form, parentId: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              required
            >
              <option value="" disabled>-- Select Parent Category --</option>
              {parents.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
