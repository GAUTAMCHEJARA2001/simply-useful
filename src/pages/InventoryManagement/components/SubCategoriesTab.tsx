import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, X } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { apiClient } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

export const SubCategoriesTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const c = await apiClient<any[]>('/inv/masters/categories').catch(() => []);
      setCategories(Array.isArray(c) ? c : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    try {
      if (!form.parent_id) {
          toast({ title: 'Validation Error', description: 'Please select a parent category.', variant: 'destructive' });
          return;
      }
      if (form.id) {
        await apiClient(`/inv/masters/categories/${form.id}`, { method: 'PUT', data: form });
        toast({ title: 'Sub Category updated' });
      } else {
        await apiClient('/inv/masters/categories', { method: 'POST', data: form });
        toast({ title: 'Sub Category saved' });
      }
      setModal(false); setForm({});
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Sub Category?')) return;
    try {
      await apiClient(`/inv/masters/categories/${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted' });
      loadData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filtered = categories.filter(c => c.parent_id);
  const parents = categories.filter(c => !c.parent_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sub Categories</h1>
        {['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Sub Category
          </Button>
        )}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Sub Categories…</div>}

      <DataTable
        columns={['Name', 'Parent Category']}
        rows={filtered.map(c => [c.name, categories.find(p => p.id === c.parent_id)?.name || '—'])}
        onEdit={['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') ? i => { setForm(filtered[i]); setModal(true); } : undefined}
        onDelete={['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') ? i => handleDelete(filtered[i].id) : undefined} 
      />

      {modal && (
        <Modal title={form.id ? "Edit Sub Category" : "Add Sub Category"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Parent Category</label>
              <select value={form.parent_id || ''} onChange={e => setForm({ ...form, parent_id: e.target.value })}
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
      )}
    </div>
  );
};
