import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface PromotionDemotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onSubmit: (data: any) => Promise<void>;
}

export const PromotionDemotionModal: React.FC<PromotionDemotionModalProps> = ({ isOpen, onClose, employee, onSubmit }) => {
  const [action, setAction] = useState<'Promotion' | 'Demotion'>('Promotion');
  const [employeeType, setEmployeeType] = useState('FIXED');
  const [fixedSalary, setFixedSalary] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setEmployeeType(employee.employee_type || 'FIXED');
      setFixedSalary(employee.fixed_salary?.toString() || '');
      setDailyWage(employee.daily_wage?.toString() || '');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setAction('Promotion');
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        action,
        employee_type: employeeType,
        fixed_salary: employeeType === 'FIXED' ? parseFloat(fixedSalary) || 0 : 0,
        daily_wage: employeeType === 'VARIABLE' ? parseFloat(dailyWage) || 0 : 0,
        reason,
        effectiveDate,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Employee Status" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={action} onValueChange={(v: any) => setAction(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Promotion">Promotion</SelectItem>
                <SelectItem value="Demotion">Demotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>New Employment Type</Label>
          <Select value={employeeType} onValueChange={setEmployeeType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed Salary</SelectItem>
              <SelectItem value="VARIABLE">Daily Wage (Variable)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {employeeType === 'FIXED' && (
          <div className="space-y-2">
            <Label>New Monthly Salary (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={fixedSalary}
              onChange={e => setFixedSalary(e.target.value)}
              placeholder="e.g. 25000"
              required
            />
            <p className="text-xs text-muted-foreground">Current: ₹{employee.fixed_salary}</p>
          </div>
        )}

        {employeeType === 'VARIABLE' && (
          <div className="space-y-2">
            <Label>New Daily Wage (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={dailyWage}
              onChange={e => setDailyWage(e.target.value)}
              placeholder="e.g. 500"
              required
            />
            <p className="text-xs text-muted-foreground">Current: ₹{employee.daily_wage}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Reason / Remarks (Optional)</Label>
          <Textarea 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            placeholder="Reason for this change..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : `Apply & Generate ${action} Letter`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
