import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Users, FileText, CalendarCheck, Clock, Wallet, FileBarChart } from 'lucide-react';

import { EmployeeMasterTab } from './HRManagement/components/EmployeeMasterTab';
import { AdvancedAttendanceTab } from './HRManagement/components/AdvancedAttendanceTab';
import { MonthlyAttendanceTab } from './HRManagement/components/MonthlyAttendanceTab';
import { OrgChartTab } from './HRManagement/components/OrgChartTab';
import { HRConfigTab } from './HRManagement/components/HRConfigTab';
import { EmployeeLedgerTab } from './HRManagement/components/EmployeeLedgerTab';
import { LeaveManagementTab } from './HRManagement/components/LeaveManagementTab';



export type HRTab = 'employees' | 'attendance' | 'leaves' | 'ledger' | 'payroll' | 'orgchart' | 'config';

const HRManagement: React.FC = () => {
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as HRTab) || 'employees';
  const setTab = (newTab: HRTab) => setSearchParams({ tab: newTab });

  // We reuse inventory permission or introduce a new 'view_hr_dashboard'
  if (!can('view_inventory_dashboard')) return <Navigate to="/" replace />;

  const navItems = [
    { id: 'employees', label: 'Employee Master', icon: Users },
    { id: 'orgchart', label: 'Organization Chart', icon: Users },
    { id: 'attendance', label: 'Daily Attendance', icon: Clock },
    { id: 'leaves', label: 'Leave Management', icon: CalendarCheck },
    { id: 'ledger', label: 'Employee Ledger', icon: Wallet },
    { id: 'payroll', label: 'Payroll & Slips', icon: FileBarChart },
    { id: 'config', label: 'HR Config', icon: FileText },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar for HR */}
      <div className="w-full flex-none border-b border-border bg-card">
        <div className="p-4 sm:px-6 sm:pt-6 sm:pb-4">
          <h2 className="text-2xl font-bold text-foreground">HR & Payroll</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Manage staff, attendance, and Indian norms payroll</p>
          
          <div className="flex overflow-x-auto p-1 bg-muted/50 rounded-lg shrink-0 gap-1 snap-x scrollbar-hide">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id as HRTab)}
                className={`flex-none snap-start flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${tab === n.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}>
                <n.icon className="w-4 h-4" />
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
        {tab === 'employees' && <EmployeeMasterTab />}
        {tab === 'orgchart' && <OrgChartTab />}
        {tab === 'attendance' && <AdvancedAttendanceTab />}
        {tab === 'leaves' && <LeaveManagementTab />}
        {tab === 'ledger' && <EmployeeLedgerTab />}
        {tab === 'payroll' && <MonthlyAttendanceTab />}
        {tab === 'config' && <HRConfigTab />}
      </div>
    </div>
  );
};

export default HRManagement;
