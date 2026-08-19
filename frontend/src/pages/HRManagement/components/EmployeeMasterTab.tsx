import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useHREmployees, useHREmployeeMutations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { DataTable } from '@/components/DataTable';

export const EmployeeMasterTab: React.FC = () => {
  const { data: employees = [], isLoading, error, refetch } = useHREmployees();
  const { saveEmployee, deleteEmployee } = useHREmployeeMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const handleEdit = (emp: any) => {
    setFormData(emp);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      employee_type: 'VARIABLE',
      base_salary_monthly: 0,
      dailywage: 0,
      overtime_hourly_rate: 0,
      late_deduction_rate: 0,
      travel_allowance_per_km: 0,
      sales_incentive_pct: 0,
      bag_incentive_rate: 0,
      contactinfo: ''
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmployee(formData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-3xl">
        <h2 className="text-lg font-bold mb-6">{formData.id ? 'Edit Employee' : 'New Employee'}</h2>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee Type</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.employee_type} onChange={e => setFormData({...formData, employee_type: e.target.value})}>
                <option value="VARIABLE">Variable / Daily Wage</option>
                <option value="FIXED">Fixed / Monthly Salary</option>
              </select>
            </div>
            
            {formData.employee_type === 'FIXED' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Monthly Base Salary (₹)</label>
                <input required type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.base_salary_monthly} onChange={e => setFormData({...formData, base_salary_monthly: Number(e.target.value)})} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Daily Base Wage (₹)</label>
                <input required type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={formData.dailywage} onChange={e => setFormData({...formData, dailywage: Number(e.target.value)})} />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Overtime Hourly Rate (₹)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.overtime_hourly_rate} onChange={e => setFormData({...formData, overtime_hourly_rate: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Late Deduction Hourly Rate (₹)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.late_deduction_rate} onChange={e => setFormData({...formData, late_deduction_rate: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Allowance (₹/km)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.travel_allowance_per_km} onChange={e => setFormData({...formData, travel_allowance_per_km: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sales Incentive (%)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.sales_incentive_pct} onChange={e => setFormData({...formData, sales_incentive_pct: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bag Incentive Rate (₹/bag)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.bag_incentive_rate} onChange={e => setFormData({...formData, bag_incentive_rate: Number(e.target.value)})} />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="submit">Save Employee</Button>
          </div>
        </form>
      </div>
    );
  }

  const columns = ['Name', 'Type', 'Base Pay', 'OT Rate', 'Travel Rate'];
  
  const rows = employees.map((emp: any) => [
    emp.name,
    emp.employee_type === 'FIXED' ? 'Fixed (Monthly)' : 'Variable (Daily)',
    emp.employee_type === 'FIXED' ? `₹${emp.base_salary_monthly}/mo` : `₹${emp.dailywage}/day`,
    `₹${emp.overtime_hourly_rate}/hr`,
    `₹${emp.travel_allowance_per_km}/km`
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Employee Master</h2>
        <Button onClick={handleAddNew} className="gap-2"><Plus className="w-4 h-4" /> Add Employee</Button>
      </div>
      <SafeDataView isLoading={isLoading} error={error} data={employees} onRetry={refetch}>
        <DataTable 
          columns={columns} 
          rows={rows} 
          onEdit={(idx) => handleEdit(employees[idx])}
          onDelete={(idx) => {
            if(confirm('Deactivate employee?')) deleteEmployee(employees[idx].id);
          }}
        />
      </SafeDataView>
    </div>
  );
};
