import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, X } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { SafeDataView } from '@/components/SafeDataView';


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

export const CategoriesTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);


  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await apiClient<any[]>('/inv/masters/categories');
      setCategories(Array.isArray(c) ? c : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    try {
      const payload = { ...form, parent_id: null }; // Force top-level
      if (form.id) {
        await apiClient(`/inv/masters/categories/${form.id}`, { method: 'PUT', data: payload });
        toast({ title: 'Category updated' });
      } else {
        await apiClient('/inv/masters/categories', { method: 'POST', data: payload });
        toast({ title: 'Category saved' });
      }
      setModal(false); setForm({});
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Category?')) return;
    try {
      await apiClient(`/inv/masters/categories/${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted' });
      loadData();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filtered = categories.filter(c => !c.parent_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Categories (Parent)</h1>
        {['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        )}
      </div>

      <SafeDataView
        data={filtered}
        isLoading={loading}
        error={error}
        onRetry={loadData}
        emptyMessage="No parent categories found"
      >
        <DataTable
          columns={['Name']}
          rows={filtered.map(c => [c.name])}
          onEdit={['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') ? i => { setForm(filtered[i]); setModal(true); } : undefined}
          onDelete={['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '') ? i => handleDelete(filtered[i].id) : undefined} 
        />
      </SafeDataView>


      {modal && (
        <Modal title={form.id ? "Edit Category" : "Add Category"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
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
