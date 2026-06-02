import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Warehouse, Plus, RefreshCw, X, Users, MapPin, Building2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { useWarehouses, useWarehouseMutations } from '@/hooks/inventory/useMasters';
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

const WarehouseManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: warehouses = [], isLoading, error, refetch } = useWarehouses();
  const { saveWarehouse, isSaving, deleteWarehouse } = useWarehouseMutations();
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  if (user?.role !== 'SUPERADMIN') return <Navigate to="/" replace />;

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        id: form.id || undefined,
        name: form.name,
        location: form.location || '',
        gstNumber: form.gstNumber || form.gst_number || '',
        active: form.active !== undefined ? form.active : true,
      };

      await saveWarehouse(payload);
      setModal(null);
      setForm({});
    } catch (err: any) {
      // Error handled by mutation toast
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await deleteWarehouse(id);
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground">Administer warehouses and manage user access permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm({}); setModal('warehouse'); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Warehouse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" />
              All Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SafeDataView data={warehouses} isLoading={isLoading} error={error} onRetry={() => refetch()}>
              <DataTable 
                columns={['Name', 'Location', 'GST Number']}
                rows={warehouses.map(w => [w.name, w.location, w.gstNumber || w.gst_number || '-'])}
                onEdit={i => { setForm(warehouses[i]); setModal('warehouse'); }}
                onDelete={i => handleDelete(warehouses[i].id)}
              />
            </SafeDataView>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-muted-foreground">Total Warehouses</p>
              <p className="text-3xl font-bold text-primary">{warehouses.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-accent/50 border border-border">
              <p className="text-sm text-muted-foreground">Active Locations</p>
              <p className="text-3xl font-bold text-foreground">
                {new Set(warehouses.map(w => w.location)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {modal === 'warehouse' && (
        <Modal title={form.id ? "Edit Warehouse" : "Add Warehouse"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Name
              </label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jaipur Main Warehouse"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location/Address
              </label>
              <textarea value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Full address of the warehouse"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">GST Number</label>
              <input value={form.gstNumber || form.gst_number || ''} onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : form.id ? 'Update Warehouse' : 'Create Warehouse'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseManagement;
