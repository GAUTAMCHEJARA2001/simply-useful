import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useAttendance, useAttendanceMutations } from '@/hooks/inventory/useAttendance';
import { useLabour } from '@/hooks/inventory/useLabour';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const AttendanceTab: React.FC = () => {
  const { data: attendance = [], isLoading, error, refetch } = useAttendance();
  const { data: labours = [] } = useLabour();
  const { saveAttendance, deleteAttendance } = useAttendanceMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const handleSave = async () => {
    await saveAttendance(form);
    setModalOpen(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await deleteAttendance(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Labour Attendance</h1>
        <Button size="sm" onClick={() => { setForm({}); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Mark Attendance
        </Button>
      </div>

      <SafeDataView data={attendance} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Labour', 'Date', 'Status', 'Wage Calculated']}
          rows={attendance.map((a: any) => [
            a.labourName || a.labour?.name || '—',
            a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—',
            <span key={a.id} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : a.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>,
            Currency(a.wageCalculated || 0)
          ])}
          onEdit={i => { setForm(attendance[i]); setModalOpen(true); }}
          onDelete={i => handleDelete(attendance[i].id)}
        />
      </SafeDataView>

      <Modal isOpen={modalOpen} title="Mark Attendance" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Labour</label>
            <select value={form.labour_id || ''} onChange={e => setForm({ ...form, labour_id: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
              <option value="">-- Choose Labour --</option>
              {labours.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Date</label>
            <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <select value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
