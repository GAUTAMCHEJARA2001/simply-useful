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
    <div className="flex-1 flex flex-col sm:flex-row h-full overflow-hidden bg-background">
      {/* Sidebar for HR */}
      <div className="w-full sm:w-64 flex-none border-b sm:border-b-0 sm:border-r border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">HR & Payroll</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage staff, attendance, and Indian norms payroll</p>
        </div>
        <div className="p-3 space-y-1">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id as HRTab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${tab === n.id ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <n.icon className="w-4 h-4 shrink-0" />
              {n.label}
            </button>
          ))}
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
