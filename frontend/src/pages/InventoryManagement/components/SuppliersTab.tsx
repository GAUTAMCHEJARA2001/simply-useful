import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, Landmark } from 'lucide-react';
import { useSuppliers, useSupplierMutations } from '@/hooks/inventory/useSuppliers';
import { Modal } from '@/components/Modal';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const STORAGE_KEY = 'simply_saved_rtgs_payees_v3';

export const SuppliersTab: React.FC = () => {
  const navigate = useNavigate();
  const { data: suppliers = [], isLoading, error, refetch } = useSuppliers();
  const { saveSupplier, deleteSupplier } = useSupplierMutations();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleOpenEdit = (supplier: any) => {
    let saved: any = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        saved = map[`supp_${supplier.id}`] || {};
      }
    } catch {}

    setForm({
      ...supplier,
      bankName: saved.bankName || supplier.bankName || supplier.bank_name || '',
      accountNumber: saved.accountNumber || supplier.accountNumber || supplier.account_number || '',
      ifscCode: saved.ifscCode || supplier.ifscCode || supplier.ifsc_code || '',
      branch: saved.branch || supplier.branch || 'NAVSARI',
    });
    setModal(true);
  };

  const handleSave = async () => {
    // Save to backend supplier
    await saveSupplier(form);

    // Also persist bank credentials into RTGS cache
    if (form.id && (form.accountNumber || form.ifscCode)) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[`supp_${form.id}`] = {
          name: (form.name || '').toUpperCase(),
          category: 'SUPPLIER',
          bankName: (form.bankName || '').toUpperCase(),
          accountNumber: (form.accountNumber || '').trim(),
          ifscCode: (form.ifscCode || '').trim().toUpperCase(),
          branch: (form.branch || 'NAVSARI').toUpperCase(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {}
    }

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
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => navigate('/finance/rtgs-hub?tab=supplier')}
            className="border-purple-500/40 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 font-semibold"
          >
            <Landmark className="w-4 h-4 mr-1.5 text-purple-400" /> Axis Bank RTGS Hub
          </Button>
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
          </Button>
        </div>
      </div>

      <SafeDataView data={suppliers} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Name', 'Contact', 'Address', 'GST', 'Balance']}
          rows={suppliers.map((s: any) => [s.name, s.contact_info || s.contactInfo, s.address, s.gstNumber, Currency(s.balance)])}
          onEdit={i => handleOpenEdit(suppliers[i])}
          onDelete={i => handleDelete(suppliers[i].id)}
          customActions={i => (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/finance/rtgs-hub?tab=supplier&supplierId=${suppliers[i].id}`);
              }}
              className="h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 font-bold text-xs"
              title="Generate Axis Bank RTGS Slip"
            >
              <Landmark className="w-3.5 h-3.5 mr-1" /> RTGS
            </Button>
          )}
        />
      </SafeDataView>

      <Modal isOpen={modal} title={form.id ? "Edit Supplier" : "Add Supplier"} onClose={() => setModal(false)}>
        <div className="space-y-3.5 max-h-[80vh] overflow-y-auto pr-1">
          {[
            ['name', 'Supplier / Vendor Name'], 
            ['contact_person', 'Contact Person'], 
            ['contact_info', 'Contact Info / Phone'], 
            ['email', 'Email'], 
            ['address', 'Address'], 
            ['gstNumber', 'GST Number']
          ].map(([k, lbl]) => (
            <div key={k}>
              <label className="text-xs font-semibold block mb-1 text-slate-300">{lbl}</label>
              <input 
                value={form[k] || ''} 
                onChange={e => setForm({ ...form, [k]: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm" 
              />
            </div>
          ))}

          {/* RTGS / Bank Credentials Section */}
          <div className="border-t border-slate-700/60 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <Landmark className="w-3.5 h-3.5" />
              <span>RTGS / Bank Details (For Instant Axis Bank PDF)</span>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1 text-slate-300">Bank Name</label>
              <input 
                placeholder="e.g. HDFC Bank, SBI, ICICI Bank, Axis Bank"
                value={form.bankName || ''} 
                onChange={e => setForm({ ...form, bankName: e.target.value.toUpperCase() })}
                className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm uppercase" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1 text-slate-300">Account Number</label>
                <input 
                  placeholder="e.g. 123456789012"
                  value={form.accountNumber || ''} 
                  onChange={e => setForm({ ...form, accountNumber: e.target.value.trim() })}
                  className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm font-mono" 
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 text-slate-300">IFSC Code</label>
                <input 
                  placeholder="e.g. HDFC0001234"
                  value={form.ifscCode || ''} 
                  onChange={e => setForm({ ...form, ifscCode: e.target.value.trim().toUpperCase() })}
                  className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-sm font-mono uppercase font-bold text-emerald-400" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Supplier & Bank Info</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
