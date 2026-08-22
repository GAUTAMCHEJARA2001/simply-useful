import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { useLeavePolicies, useLeavePolicyMutations, useLeaveTypes, useHRDepartments, useHRDesignations } from '@/hooks/hr/useHR';
import { Plus, Trash2, Edit } from 'lucide-react';

export const LeavePoliciesTab = () => {
  const { data: policies = [], isLoading, error, refetch } = useLeavePolicies();
  const { createPolicy, updatePolicy, deletePolicy, allocateLeaves } = useLeavePolicyMutations();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: depts = [] } = useHRDepartments();
  const { data: desigs = [] } = useHRDesignations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    leave_type_id: '',
    department_id: '',
    designation_id: '',
    frequency: 'YEARLY',
    days_to_allocate: 0,
    is_active: true
  });

  const handleOpenModal = (policy?: any) => {
    if (policy) {
      setEditingId(policy.id);
      setFormData({
        leave_type_id: policy.leave_type_id || '',
        department_id: policy.department_id || '',
        designation_id: policy.designation_id || '',
        frequency: policy.frequency || 'YEARLY',
        days_to_allocate: policy.days_to_allocate || 0,
        is_active: policy.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        leave_type_id: '',
        department_id: '',
        designation_id: '',
        frequency: 'YEARLY',
        days_to_allocate: 0,
        is_active: true
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.leave_type_id || formData.days_to_allocate <= 0) return;
    
    const payload = {
      leave_type_id: Number(formData.leave_type_id),
      department_id: formData.department_id ? Number(formData.department_id) : null,
      designation_id: formData.designation_id ? Number(formData.designation_id) : null,
      frequency: formData.frequency,
      days_to_allocate: Number(formData.days_to_allocate),
      is_active: formData.is_active
    };

    if (editingId) {
      updatePolicy.mutate({ id: editingId, data: payload }, {
        onSuccess: () => setModalOpen(false)
      });
    } else {
      createPolicy.mutate(payload, {
        onSuccess: () => setModalOpen(false)
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this policy?')) {
      deletePolicy.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Leave Allocation Rules</h3>
          <p className="text-sm text-gray-500">Define automatic rules to allocate leaves to staff based on department or designation.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => allocateLeaves.mutate()} variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            Process Due Allocations
          </Button>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>
      </div>

      <SafeDataView data={policies} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider">
                <th className="p-3 font-semibold rounded-tl-lg">Leave Type</th>
                <th className="p-3 font-semibold">Department</th>
                <th className="p-3 font-semibold">Designation</th>
                <th className="p-3 font-semibold">Frequency</th>
                <th className="p-3 font-semibold">Days to Allocate</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {policies.length > 0 ? policies.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 text-sm">
                  <td className="p-3 font-medium text-gray-800">{p.leave_type_name}</td>
                  <td className="p-3 text-gray-600">{p.department_name}</td>
                  <td className="p-3 text-gray-600">{p.designation_name}</td>
                  <td className="p-3 text-gray-600">{p.frequency}</td>
                  <td className="p-3 text-gray-800 font-medium">{p.days_to_allocate}</td>
                  <td className="p-3 text-center">
                    {p.is_active ? 
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span> : 
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Disabled</span>
                    }
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(p)} className="text-blue-600 h-8 w-8 p-0 mr-2"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-600 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-4 text-center text-sm text-gray-500">No leave policies defined.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SafeDataView>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Rule' : 'New Rule'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type *</label>
            <select className="w-full p-2 border rounded" value={formData.leave_type_id} onChange={e => setFormData({...formData, leave_type_id: e.target.value})}>
              <option value="">Select Leave Type...</option>
              {leaveTypes.map((lt: any) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department Filter (Optional)</label>
              <select className="w-full p-2 border rounded" value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                <option value="">All Departments</option>
                {depts.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Designation Filter (Optional)</label>
              <select className="w-full p-2 border rounded" value={formData.designation_id} onChange={e => setFormData({...formData, designation_id: e.target.value})}>
                <option value="">All Designations</option>
                {desigs
                  .filter((d: any) => !formData.department_id || d.department_id === Number(formData.department_id) || !d.department_id)
                  .map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select className="w-full p-2 border rounded" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}>
                <option value="YEARLY">Yearly</option>
                <option value="HALF_YEARLY">Half Yearly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="BI_MONTHLY">Bi-Monthly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Days to Allocate</label>
              <input type="number" step="0.5" className="w-full p-2 border rounded" value={formData.days_to_allocate} onChange={e => setFormData({...formData, days_to_allocate: Number(e.target.value)})} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
            <label htmlFor="active" className="text-sm font-medium">Rule is Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.leave_type_id || formData.days_to_allocate <= 0 || createPolicy.isPending || updatePolicy.isPending}>
              Save Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
