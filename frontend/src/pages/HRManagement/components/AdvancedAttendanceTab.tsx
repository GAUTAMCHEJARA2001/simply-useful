import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useHREmployees, useHRAttendance, useHRAttendanceMutations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { Save } from 'lucide-react';

export const AdvancedAttendanceTab: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const monthStr = selectedDate.slice(0, 7);
  
  const { data: employees = [], isLoading: empLoading } = useHREmployees();
  const { data: attendance = [], isLoading: attLoading, refetch } = useHRAttendance(monthStr);
  const { saveAttendance } = useHRAttendanceMutations();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!employees.length) return;
    
    // Load attendance for the selected date into the form state
    const currentRecords = attendance.filter((a: any) => a.date === selectedDate);
    const initialForm: any = {};
    
    employees.forEach((emp: any) => {
      const record = currentRecords.find((r: any) => r.labour_id === emp.id);
      if (record) {
        initialForm[emp.id] = { ...record };
      } else {
        // Defaults
        initialForm[emp.id] = {
          labour_id: emp.id,
          date: selectedDate,
          status: 'PRESENT',
          ot_hours: 0,
          late_hours: 0,
          km_travelled: 0,
          bags_produced: 0,
          sales_achieved: 0
        };
      }
    });
    setFormData(initialForm);
  }, [employees, attendance, selectedDate]);

  const handleFieldChange = (empId: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    const recordsToSave = Object.values(formData);
    await saveAttendance(recordsToSave);
    refetch();
  };

  const isLoading = empLoading || attLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold">Daily Attendance & Metrics</h2>
          <p className="text-sm text-muted-foreground mt-1">Mark attendance, OT, and variable stats for the day.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background"
          />
          <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save Day</Button>
        </div>
      </div>

      <SafeDataView isLoading={isLoading} data={employees} onRetry={refetch}>
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Employee Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">OT Hours</th>
                <th className="px-4 py-3 font-medium text-center">Late Hours</th>
                <th className="px-4 py-3 font-medium text-center">KM Travelled</th>
                <th className="px-4 py-3 font-medium text-center">Bags</th>
                <th className="px-4 py-3 font-medium text-right">Sales Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp: any) => {
                const row = formData[emp.id] || {};
                return (
                  <tr key={emp.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-1 rounded-full ${emp.employee_type === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {emp.employee_type}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <select 
                        value={row.status || 'PRESENT'} 
                        onChange={e => handleFieldChange(emp.id, 'status', e.target.value)}
                        className="border rounded-md px-2 py-1 bg-background text-sm w-32"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="ABSENT">Absent</option>
                        <option value="WEEKLY_OFF">Weekly Off</option>
                        <option value="LEAVE">Leave</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="0.5" className="border rounded-md px-2 py-1 w-20 text-center"
                        value={row.ot_hours || 0} onChange={e => handleFieldChange(emp.id, 'ot_hours', Number(e.target.value))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="0.5" className="border rounded-md px-2 py-1 w-20 text-center"
                        value={row.late_hours || 0} onChange={e => handleFieldChange(emp.id, 'late_hours', Number(e.target.value))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="1" className="border rounded-md px-2 py-1 w-24 text-center"
                        value={row.km_travelled || 0} onChange={e => handleFieldChange(emp.id, 'km_travelled', Number(e.target.value))}
                        disabled={emp.travel_allowance_per_km <= 0} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="1" className="border rounded-md px-2 py-1 w-20 text-center"
                        value={row.bags_produced || 0} onChange={e => handleFieldChange(emp.id, 'bags_produced', Number(e.target.value))}
                        disabled={emp.bag_incentive_rate <= 0} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" min="0" step="1" className="border rounded-md px-2 py-1 w-28 text-right"
                        value={row.sales_achieved || 0} onChange={e => handleFieldChange(emp.id, 'sales_achieved', Number(e.target.value))}
                        disabled={emp.sales_incentive_pct <= 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SafeDataView>
    </div>
  );
};
