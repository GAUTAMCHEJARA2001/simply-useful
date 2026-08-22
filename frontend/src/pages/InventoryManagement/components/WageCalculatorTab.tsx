import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SafeDataView } from '@/components/SafeDataView';
import { useAttendance } from '@/hooks/inventory/useAttendance';
import { useLabour } from '@/hooks/inventory/useLabour';
import { Download, Printer } from 'lucide-react';
import { DataTable } from '@/components/DataTable';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const WageCalculatorTab: React.FC = () => {
  const { data: attendance = [], isLoading: isAttLoading, error: attError, refetch: refetchAtt } = useAttendance();
  const { data: labours = [], isLoading: isLabLoading, error: labError, refetch: refetchLab } = useLabour();
  
  // Default to current month (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const isLoading = isAttLoading || isLabLoading;
  const error = attError || labError;

  const handleRefetch = () => {
    refetchAtt();
    refetchLab();
  };

  const wageData = useMemo(() => {
    if (!labours.length || !attendance.length) return [];

    // Filter attendance by selected month
    const filteredAttendance = attendance.filter((a: any) => {
      if (!a.date) return false;
      return a.date.startsWith(selectedMonth);
    });

    // Group by labour
    const summary = labours.map((labour: any) => {
      const records = filteredAttendance.filter((a: any) => 
        String(a.labour_id) === String(labour.id) || String(a.labourId) === String(labour.id)
      );

      let present = 0;
      let halfDays = 0;
      let absent = 0;
      let calculatedWage = 0;

      records.forEach((record: any) => {
        if (record.status === 'PRESENT') {
          present += 1;
          calculatedWage += (record.wageCalculated || labour.dailyWage || 0);
        } else if (record.status === 'HALF_DAY') {
          halfDays += 1;
          calculatedWage += (record.wageCalculated || (labour.dailyWage / 2) || 0);
        } else if (record.status === 'ABSENT') {
          absent += 1;
        }
      });

      return {
        id: labour.id,
        name: labour.name,
        dailyWage: labour.dailyWage || 0,
        present,
        halfDays,
        absent,
        totalDays: present + (halfDays * 0.5),
        calculatedWage
      };
    });

    return summary;
  }, [attendance, labours, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Salary / Wage Calculator</h1>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 bg-background text-sm h-9"
          />
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-9 gap-1.5 hidden sm:flex">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-sm font-semibold text-primary">Monthly Payroll Summary</h2>
          <p className="text-xs text-muted-foreground mt-1">Calculated totals for {new Date(selectedMonth + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Payout Expected</p>
          <p className="text-2xl font-bold text-foreground">
            {Currency(wageData.reduce((acc, row) => acc + row.calculatedWage, 0))}
          </p>
        </div>
      </div>

      <SafeDataView data={wageData} isLoading={isLoading} error={error} onRetry={handleRefetch}>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Labour Name</th>
                <th className="px-4 py-3 font-semibold text-right">Daily Base Wage</th>
                <th className="px-4 py-3 font-semibold text-center">Present</th>
                <th className="px-4 py-3 font-semibold text-center">Half Days</th>
                <th className="px-4 py-3 font-semibold text-center">Absent</th>
                <th className="px-4 py-3 font-semibold text-right text-primary">Total Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wageData.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 text-right">{Currency(row.dailyWage)}</td>
                  <td className="px-4 py-3 text-center font-medium text-green-600">{row.present || '-'}</td>
                  <td className="px-4 py-3 text-center font-medium text-yellow-600">{row.halfDays || '-'}</td>
                  <td className="px-4 py-3 text-center font-medium text-red-500">{row.absent || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{Currency(row.calculatedWage)}</td>
                </tr>
              ))}
              {wageData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No labour records found to calculate wages for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SafeDataView>
    </div>
  );
};
