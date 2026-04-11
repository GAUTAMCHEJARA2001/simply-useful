import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Warehouse, Plus, RefreshCw, X, Users, MapPin, Building2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';

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

const initialWarehouses = [
  { id: '1', name: 'Main Warehouse', location: 'Jaipur, Rajasthan', gst_number: '08AAAAA0000A1Z5' },
  { id: '2', name: 'South Depot', location: 'Chennai, Tamil Nadu', gst_number: '33BBBBB0000B1Z9' },
  { id: '3', name: 'West Distribution Center', location: 'Mumbai, Maharashtra', gst_number: '27CCCCC0000C1Z3' },
];

const WarehouseManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>(initialWarehouses);
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  if (user?.role !== 'SUPERADMIN') return <Navigate to="/" replace />;

  const handleSave = () => {
    if (!form.name) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (form.id) {
      setWarehouses(prev => prev.map(w => w.id === form.id ? { ...w, ...form } : w));
      toast({ title: 'Warehouse updated successfully' });
    } else {
      setWarehouses(prev => [...prev, { ...form, id: String(Date.now()) }]);
      toast({ title: 'Warehouse created successfully' });
    }
    setModal(null);
    setForm({});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    setWarehouses(prev => prev.filter(w => w.id !== id));
    toast({ title: 'Warehouse deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground">Administer warehouses and manage user access permissions.</p>
        </div>
        <Button onClick={() => { setForm({}); setModal('warehouse'); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Warehouse
        </Button>
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
            <DataTable 
              columns={['Name', 'Location', 'GST Number']}
              rows={warehouses.map(w => [w.name, w.location, w.gst_number])}
              onEdit={i => { setForm(warehouses[i]); setModal('warehouse'); }}
              onDelete={i => handleDelete(warehouses[i].id)}
            />
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
              <input value={form.gst_number || ''} onChange={e => setForm({ ...form, gst_number: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave}>
                {form.id ? 'Update Warehouse' : 'Create Warehouse'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseManagement;
