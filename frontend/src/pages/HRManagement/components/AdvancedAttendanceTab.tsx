import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useHREmployees, useHRAttendance, useHRAttendanceMutations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { Save, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const AdvancedAttendanceTab: React.FC = () => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  
  const { data: employees = [], isLoading: empLoading } = useHREmployees();
  const { data: attendance = [], isLoading: attLoading, refetch } = useHRAttendance(selectedMonth);
  const { saveAttendance } = useHRAttendanceMutations();

  // state format: formData[empId][YYYY-MM-DD] = { status, daily_advance, ot_hours, ... }
  const [formData, setFormData] = useState<any>({});
  
  // Detail Modal state
  const [detailCell, setDetailCell] = useState<{empId: string, dateStr: string, empName: string} | null>(null);

  const daysInMonth = useMemo(() => {
    if (!selectedMonth) return 30;
    const [year, month] = selectedMonth.split('-');
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, [selectedMonth]);
  
  const daysArray = Array.from({length: daysInMonth}, (_, i) => {
    const day = i + 1;
    return `${selectedMonth}-${day.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!employees.length) return;
    const initialForm: any = {};
    
    // Initialize structure
    employees.forEach((emp: any) => {
      initialForm[emp.id] = {};
    });

    // Populate with existing attendance
    attendance.forEach((r: any) => {
      if (initialForm[r.labour_id]) {
        initialForm[r.labour_id][r.date] = { ...r };
      }
    });

    setFormData(initialForm);
  }, [employees, attendance, selectedMonth]);

  const handleFieldChange = (empId: string, dateStr: string, field: string, value: any) => {
    setFormData((prev: any) => {
      const empData = prev[empId] || {};
      const record = empData[dateStr] || { labour_id: empId, date: dateStr, status: 'PRESENT' };
      return {
        ...prev,
        [empId]: {
          ...empData,
          [dateStr]: { ...record, [field]: value }
        }
      };
    });
  };

  const handleSave = async () => {
    // Flatten formData into an array of records
    const recordsToSave: any[] = [];
    Object.values(formData).forEach((empRecords: any) => {
      Object.values(empRecords).forEach((record: any) => {
        recordsToSave.push(record);
      });
    });
    
    if(recordsToSave.length > 0) {
      await saveAttendance(recordsToSave);
      refetch();
    }
  };

  const isLoading = empLoading || attLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold">Monthly Attendance Grid</h2>
          <p className="text-sm text-muted-foreground mt-1">Mark attendance and daily advances across the entire month.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background font-semibold"
          />
          <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save All</Button>
        </div>
      </div>

      <SafeDataView isLoading={isLoading} data={employees} onRetry={refetch}>
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium sticky left-0 bg-muted/95 backdrop-blur z-10 border-r border-border min-w-[200px]">Employee</th>
                {daysArray.map((dateStr, i) => (
                  <th key={dateStr} className="p-2 text-center font-bold border-b border-r border-border text-xs min-w-[80px]">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-muted/10 border-b border-border">
                  <td className="p-3 font-medium sticky left-0 bg-card z-10 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span>{emp.name}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.employee_type}</span>
                    </div>
                  </td>
                  {daysArray.map(dateStr => {
                    const cell = formData[emp.id]?.[dateStr] || {};
                    const status = cell.status || 'PRESENT'; // default if empty conceptually
                    
                    return (
                      <td key={dateStr} className="p-1 border-r border-border align-top relative group">
                        <div className="flex flex-col gap-1 h-full">
                          <select 
                            value={cell.status || ''} 
                            onChange={e => handleFieldChange(emp.id, dateStr, 'status', e.target.value)}
                            className={`border-0 rounded px-1 py-1 text-xs w-full font-bold focus:ring-1 focus:ring-primary
                              ${status === 'PRESENT' ? 'bg-green-100 text-green-700' : ''}
                              ${status === 'ABSENT' ? 'bg-red-100 text-red-700' : ''}
                              ${status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${status === 'WEEKLY_OFF' ? 'bg-gray-100 text-gray-500' : ''}
                              ${status === 'LEAVE' ? 'bg-blue-100 text-blue-700' : ''}
                            `}
                          >
                            <option value="">-</option>
                            <option value="PRESENT">P</option>
                            <option value="ABSENT">A</option>
                            <option value="HALF_DAY">HD</option>
                            <option value="WEEKLY_OFF">WO</option>
                            <option value="LEAVE">L</option>
                          </select>
                          
                          <input 
                            type="number"
                            placeholder="Adv ₹"
                            className="w-full text-[10px] border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-center bg-transparent"
                            value={cell.daily_advance || ''}
                            onChange={e => handleFieldChange(emp.id, dateStr, 'daily_advance', Number(e.target.value))}
                          />
                          
                          {/* Hover edit button for details (OT, Bags, etc) */}
                          <button 
                            onClick={() => setDetailCell({empId: emp.id, dateStr, empName: emp.name})}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-border p-0.5 rounded text-muted-foreground hover:text-primary transition-opacity"
                            title="Edit details (OT, KM, Bags)"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SafeDataView>

      {/* Details Modal */}
      <Dialog open={!!detailCell} onOpenChange={(open) => !open && setDetailCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra Details: {detailCell?.empName}</DialogTitle>
            <p className="text-sm text-muted-foreground">Date: {detailCell?.dateStr}</p>
          </DialogHeader>
          
          {detailCell && (() => {
            const row = formData[detailCell.empId]?.[detailCell.dateStr] || {};
            return (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">OT Hours</label>
                    <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.ot_hours || ''} onChange={e => handleFieldChange(detailCell.empId, detailCell.dateStr, 'ot_hours', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Late Hours</label>
                    <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.late_hours || ''} onChange={e => handleFieldChange(detailCell.empId, detailCell.dateStr, 'late_hours', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">KM Travelled</label>
                    <input type="number" min="0" step="1" className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.km_travelled || ''} onChange={e => handleFieldChange(detailCell.empId, detailCell.dateStr, 'km_travelled', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bags Produced</label>
                    <input type="number" min="0" step="1" className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.bags_produced || ''} onChange={e => handleFieldChange(detailCell.empId, detailCell.dateStr, 'bags_produced', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Sales Achieved (₹)</label>
                    <input type="number" min="0" step="1" className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.sales_achieved || ''} onChange={e => handleFieldChange(detailCell.empId, detailCell.dateStr, 'sales_achieved', Number(e.target.value))} />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button onClick={() => setDetailCell(null)}>Done</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
