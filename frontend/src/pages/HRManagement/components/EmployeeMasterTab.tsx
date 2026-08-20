import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { useHREmployees, useHREmployeeMutations, useHRDepartments, useHRDesignations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { DataTable } from '@/components/DataTable';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const SearchableSelect = ({ options, value, onChange, placeholder }: { options: {label: string, value: any}[], value: any, onChange: (v: any) => void, placeholder: string }) => {
  const [open, setOpen] = useState(false);
  // Find label, value might be number or string so use loose equality if needed, but best strict
  const selectedLabel = options.find((opt) => String(opt.value) === String(value))?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal text-sm px-3 py-2 h-auto text-left">
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                - None -
              </CommandItem>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.label} onSelect={() => { onChange(option.value); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", String(value) === String(option.value) ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const EmployeeMasterTab: React.FC = () => {
  const { data: employees = [], isLoading, error, refetch } = useHREmployees();
  const { data: departments = [] } = useHRDepartments();
  const { data: designations = [] } = useHRDesignations();
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
      bike_allowance_per_km: 0,
      car_allowance_per_km: 0,
      sales_incentive_pct: 0,
      bag_incentive_rate: 0,
      contactinfo: '',
      department: '',
      designation: '',
      reports_to: '',
      is_ot_eligible: false,
      is_late_deduction_eligible: false,
      is_km_eligible: false,
      is_bag_eligible: false
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
              <label className="text-sm font-medium">Overtime Multiplier (e.g. 1.5x)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.overtime_hourly_rate} onChange={e => setFormData({...formData, overtime_hourly_rate: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Late Deduction Multiplier (e.g. 1.0x)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.late_deduction_rate} onChange={e => setFormData({...formData, late_deduction_rate: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bike Allowance (₹/km)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.bike_allowance_per_km} onChange={e => setFormData({...formData, bike_allowance_per_km: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Car Allowance (₹/km)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={formData.car_allowance_per_km} onChange={e => setFormData({...formData, car_allowance_per_km: Number(e.target.value)})} />
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

          <div className="pt-4 border-t border-border">
            <h3 className="text-md font-semibold mb-4 text-primary">Hierarchy & Eligibility</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <SearchableSelect 
                  placeholder="- Select Department -"
                  value={formData.department || ''}
                  onChange={(val) => setFormData({...formData, department: val})}
                  options={departments.map((d: any) => ({ label: d.name, value: d.name }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Post (Designation)</label>
                <SearchableSelect 
                  placeholder="- Select Post -"
                  value={formData.designation || ''}
                  onChange={(val) => setFormData({...formData, designation: val})}
                  options={designations.map((d: any) => ({ label: d.name, value: d.name }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reports To (Manager)</label>
                <SearchableSelect 
                  placeholder="- None -"
                  value={formData.reports_to || ''}
                  onChange={(val) => setFormData({...formData, reports_to: val})}
                  options={employees.filter((e: any) => e.id !== formData.id).map((e: any) => ({ 
                    label: `${e.name} (${e.designation || e.department || 'No Post'})`, 
                    value: e.id 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
                <input type="checkbox" checked={!!formData.is_ot_eligible} onChange={e => setFormData({...formData, is_ot_eligible: e.target.checked})} />
                OT Eligible
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
                <input type="checkbox" checked={!!formData.is_late_deduction_eligible} onChange={e => setFormData({...formData, is_late_deduction_eligible: e.target.checked})} />
                Late Deduction
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
                <input type="checkbox" checked={!!formData.is_km_eligible} onChange={e => setFormData({...formData, is_km_eligible: e.target.checked})} />
                KM Eligible
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
                <input type="checkbox" checked={!!formData.is_bag_eligible} onChange={e => setFormData({...formData, is_bag_eligible: e.target.checked})} />
                Bag Eligible
              </label>
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

  const columns = ['Name', 'Department', 'Post', 'Type', 'Base Pay', 'OT Multiplier', 'Bike/Car Rate'];
  
  const rows = employees.map((emp: any) => [
    emp.name,
    emp.department || '-',
    emp.designation || '-',
    emp.employee_type === 'FIXED' ? 'Fixed (Monthly)' : 'Variable (Daily)',
    emp.employee_type === 'FIXED' ? `₹${emp.base_salary_monthly}/mo` : `₹${emp.dailywage}/day`,
    emp.is_ot_eligible ? `${emp.overtime_hourly_rate || 0}x` : 'N/A',
    emp.is_km_eligible ? `₹${emp.bike_allowance_per_km} / ₹${emp.car_allowance_per_km}` : 'N/A'
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
