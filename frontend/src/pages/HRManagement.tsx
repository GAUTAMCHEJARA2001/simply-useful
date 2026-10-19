import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';

import { EmployeeMasterTab } from './HRManagement/components/EmployeeMasterTab';
import { EmployeeDocumentsTab } from './HRManagement/components/EmployeeDocumentsTab';
import { AdvancedAttendanceTab } from './HRManagement/components/AdvancedAttendanceTab';
import { MonthlyAttendanceTab } from './HRManagement/components/MonthlyAttendanceTab';
import { OrgChartTab } from './HRManagement/components/OrgChartTab';
import { HRConfigTab } from './HRManagement/components/HRConfigTab';
import { EmployeeLedgerTab } from './HRManagement/components/EmployeeLedgerTab';
import { LeaveManagementTab } from './HRManagement/components/LeaveManagementTab';
import { TravelApprovalsTab } from './HRManagement/components/TravelApprovalsTab';
import { SalesTargetManagementTab } from './HRManagement/components/SalesTargetManagementTab';
import { ExpenseApprovalsTab } from './HRManagement/components/ExpenseApprovalsTab';

export type HRTab = 'employees' | 'documents' | 'targets' | 'attendance' | 'travel' | 'expenses' | 'leaves' | 'ledger' | 'payroll' | 'orgchart' | 'config';

const HRManagement: React.FC = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as HRTab) || 'employees';

  const hasAccess = can('view_inventory_dashboard') || can('view_hr_dashboard') || ['SUPERADMIN', 'ADMIN', 'HR'].includes(user?.role || '');
  if (!hasAccess) return <Navigate to="/" replace />;

  return (
    <div className="flex-1 w-full min-w-0 p-3 sm:p-5 lg:p-6 bg-background overflow-y-auto space-y-5">

      {/* ── ACTIVE TAB VIEW ── */}
      <div className="w-full">
        {tab === 'employees' && <EmployeeMasterTab />}
        {tab === 'documents' && <EmployeeDocumentsTab />}
        {tab === 'targets' && <SalesTargetManagementTab />}
        {tab === 'orgchart' && <OrgChartTab />}
        {tab === 'attendance' && <AdvancedAttendanceTab />}
        {tab === 'travel' && <TravelApprovalsTab />}
        {tab === 'expenses' && <ExpenseApprovalsTab />}
        {tab === 'leaves' && <LeaveManagementTab />}
        {tab === 'ledger' && <EmployeeLedgerTab />}
        {tab === 'payroll' && <MonthlyAttendanceTab />}
        {tab === 'config' && <HRConfigTab />}
      </div>
    </div>
  );
};

export default HRManagement;
