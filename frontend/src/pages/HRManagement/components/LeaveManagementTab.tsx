import React, { useState } from 'react';
import { useLeaveTypes, useLeaveBalances, useLeaveRecords, useLeaveMutations, useHREmployees } from '@/hooks/hr/useHR';
import { Plus, Save, Trash2, CalendarCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Settings } from 'lucide-react';
import { LeavePoliciesTab } from './LeavePoliciesTab';

export const LeaveManagementTab = () => {
  const [activeSubTab, setActiveSubTab] = useState<'balances' | 'records' | 'types' | 'policies'>('balances');

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'balances' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('balances')}
        >
          <Wallet className="w-4 h-4" /> Leave Balances
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'records' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('records')}
        >
          <CalendarCheck className="w-4 h-4" /> Leave Records
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'types' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('types')}
        >
          <Save className="w-4 h-4" /> Leave Types
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'policies' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('policies')}
        >
          <Settings className="w-4 h-4" /> Allocation Rules
        </button>
      </div>

      <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm min-h-[500px]">
        {activeSubTab === 'balances' && <LeaveBalances />}
        {activeSubTab === 'records' && <LeaveRecords />}
        {activeSubTab === 'types' && <LeaveTypes />}
        {activeSubTab === 'policies' && <LeavePoliciesTab />}
      </div>
    </div>
  );
};

const LeaveTypes = () => {
  const { data: leaveTypes = [], isLoading } = useLeaveTypes();
  const { createLeaveType } = useLeaveMutations();
  const [newTypeName, setNewTypeName] = useState('');

  const handleCreate = () => {
    if (!newTypeName.trim()) return;
    createLeaveType.mutate({ name: newTypeName }, {
      onSuccess: () => setNewTypeName('')
    });
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Leave Types Configuration</h3>
        <p className="text-sm text-gray-500">Define the types of leaves available in your company (e.g., Sick Leave, Casual Leave).</p>
      </div>

      <div className="flex gap-4 items-end max-w-md">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">New Leave Type</label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
            placeholder="e.g. Paid Vacation"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={!newTypeName || createLeaveType.isPending}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {leaveTypes.map((t: any) => (
          <Card key={t.id} className="p-4 flex items-center justify-between border-gray-200">
            <span className="font-medium text-gray-700">{t.name}</span>
          </Card>
        ))}
        {leaveTypes.length === 0 && <div className="text-sm text-gray-500">No leave types defined yet.</div>}
      </div>
    </div>
  );
};

const LeaveBalances = () => {
  const { data: employees = [], isLoading: empLoading } = useHREmployees();
  const { data: leaveTypes = [], isLoading: typesLoading } = useLeaveTypes();
  const { data: balances = [], isLoading: balLoading } = useLeaveBalances();
  const { updateLeaveBalance } = useLeaveMutations();

  const [selectedEmp, setSelectedEmp] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<number | ''>('');
  const [allocated, setAllocated] = useState<number>(0);

  const handleUpdate = () => {
    if (!selectedEmp || !selectedType) return;
    updateLeaveBalance.mutate({
      labour_id: selectedEmp,
      leave_type_id: selectedType,
      allocated_days: allocated
    }, {
      onSuccess: () => {
        setAllocated(0);
      }
    });
  };

  if (empLoading || typesLoading || balLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Allocate Leave Balances</h3>
        <p className="text-sm text-gray-500">Assign annual leave quotas to employees.</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={selectedEmp}
            onChange={e => setSelectedEmp(Number(e.target.value) || '')}
          >
            <option value="">Select Employee...</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={selectedType}
            onChange={e => setSelectedType(Number(e.target.value) || '')}
          >
            <option value="">Select Leave Type...</option>
            {leaveTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="w-[120px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Allocated Days</label>
          <input 
            type="number"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            value={allocated}
            onChange={e => setAllocated(Number(e.target.value))}
            min={0}
            step={0.5}
          />
        </div>
        <Button onClick={handleUpdate} disabled={!selectedEmp || !selectedType || updateLeaveBalance.isPending}>
          Save Allocation
        </Button>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider">
              <th className="p-3 font-semibold rounded-tl-lg">Employee</th>
              <th className="p-3 font-semibold">Leave Type</th>
              <th className="p-3 font-semibold text-right">Allocated</th>
              <th className="p-3 font-semibold text-right">Used</th>
              <th className="p-3 font-semibold text-right rounded-tr-lg">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {balances.length > 0 ? balances.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50 text-sm">
                <td className="p-3 font-medium text-gray-800">{b.labour_name}</td>
                <td className="p-3 text-gray-600">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {b.leave_type_name}
                  </span>
                </td>
                <td className="p-3 text-right text-gray-700">{b.allocated_days}</td>
                <td className="p-3 text-right text-red-600 font-medium">{b.used_days}</td>
                <td className="p-3 text-right text-green-700 font-semibold">{b.allocated_days - b.used_days}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-4 text-center text-sm text-gray-500">No balances allocated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeaveRecords = () => {
  const { data: employees = [] } = useHREmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: records = [], isLoading } = useLeaveRecords();
  const { recordLeave } = useLeaveMutations();

  const [empId, setEmpId] = useState<number | ''>('');
  const [typeId, setTypeId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [status, setStatus] = useState('FULL_DAY');

  const handleSubmit = () => {
    if (!empId || !date) return;
    recordLeave.mutate({
      labour_id: empId,
      leave_type_id: typeId || null,
      date,
      is_paid: isPaid,
      status
    }, {
      onSuccess: () => {
        setEmpId('');
        setDate('');
      }
    });
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Record a Leave</h3>
        <p className="text-sm text-gray-500">Log an employee's time off. Paid leaves will deduct from their allocated balance and count as "Present" in payroll generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Employee *</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={empId}
            onChange={e => setEmpId(Number(e.target.value) || '')}
          >
            <option value="">Select Employee...</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
          <input 
            type="date"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type (if Paid)</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={typeId}
            onChange={e => setTypeId(Number(e.target.value) || '')}
            disabled={!isPaid}
          >
            <option value="">None / Unpaid</option>
            {leaveTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Duration & Pay</label>
          <div className="flex gap-2">
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="FULL_DAY">Full Day</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
            <button 
              className={`p-2 rounded-lg text-sm font-medium border w-24 ${isPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}
              onClick={() => setIsPaid(!isPaid)}
            >
              {isPaid ? 'Paid' : 'Unpaid'}
            </button>
          </div>
        </div>

        <div className="flex items-end">
          <Button onClick={handleSubmit} disabled={!empId || !date || recordLeave.isPending} className="w-full">
            Log Leave
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Leave Records</h4>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider">
              <th className="p-3 font-semibold rounded-tl-lg">Date</th>
              <th className="p-3 font-semibold">Employee</th>
              <th className="p-3 font-semibold">Leave Type</th>
              <th className="p-3 font-semibold">Duration</th>
              <th className="p-3 font-semibold rounded-tr-lg">Pay Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.length > 0 ? records.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50 text-sm">
                <td className="p-3 font-medium text-gray-800">{new Date(r.date).toLocaleDateString()}</td>
                <td className="p-3 text-gray-700">{r.labour_name}</td>
                <td className="p-3 text-gray-600">{r.leave_type_name || 'N/A'}</td>
                <td className="p-3 text-gray-600">{r.status === 'HALF_DAY' ? 'Half Day' : 'Full Day'}</td>
                <td className="p-3">
                  {r.is_paid ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Paid Leave</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Unpaid Leave</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-4 text-center text-sm text-gray-500">No leave records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
