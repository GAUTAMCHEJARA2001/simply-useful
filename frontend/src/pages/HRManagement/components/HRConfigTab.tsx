import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save } from 'lucide-react';
import { useHRDepartments, useHRDesignations, useHRMasterMutations } from '@/hooks/hr/useHR';
import { useSettings } from '@/hooks/inventory/useMasters';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';


export const HRConfigTab = () => {
  const { data: depts, isLoading: loadingDepts, refetch: refetchDepts } = useHRDepartments();
  const { data: desigs, isLoading: loadingDesigs, refetch: refetchDesigs } = useHRDesignations();
  const { addDepartment, deleteDepartment, addDesignation, deleteDesignation } = useHRMasterMutations();
  
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [newDesigDeptId, setNewDesigDeptId] = useState<number | ''>('');

  const { data: settingsData } = useSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [basicPct, setBasicPct] = useState(50);
  const [hraPct, setHraPct] = useState(30);
  const [allowancePct, setAllowancePct] = useState(20);

  React.useEffect(() => {
    if (settingsData?.hr_salary_components) {
      setBasicPct(settingsData.hr_salary_components.basic || 50);
      setHraPct(settingsData.hr_salary_components.hra || 30);
      setAllowancePct(settingsData.hr_salary_components.allowances || 20);
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => api.put('/masters/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Success', description: 'Salary settings updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to save settings', variant: 'destructive' });
    }
  });

  const handleSaveSalarySettings = () => {
    const total = basicPct + hraPct + allowancePct;
    if (total !== 100) {
      toast({ title: 'Error', description: `Percentages must add up to 100%. Current total: ${total}%`, variant: 'destructive' });
      return;
    }
    const updatedSettings = {
      ...settingsData,
      hr_salary_components: {
        basic: basicPct,
        hra: hraPct,
        allowances: allowancePct
      }
    };
    saveSettingsMutation.mutate(updatedSettings);
  };

  const handleAddDept = async () => {
    if(!newDept.trim()) return;
    await addDepartment(newDept.trim());
    setNewDept('');
  };

  const handleAddDesig = async () => {
    if(!newDesig.trim()) return;
    await addDesignation({ name: newDesig.trim(), department_id: newDesigDeptId ? Number(newDesigDeptId) : undefined });
    setNewDesig('');
    setNewDesigDeptId('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Departments</h3>
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="e.g. Sales, Production..." 
              value={newDept} 
              onChange={e => setNewDept(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDept()}
            />
            <Button onClick={handleAddDept} disabled={loadingDepts}><Plus className="w-4 h-4" /></Button>
          </div>
          
          <div className="space-y-2">
            {loadingDepts && <p className="text-sm text-muted-foreground text-center py-4">Loading departments...</p>}
            {!loadingDepts && depts?.map((d: any) => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                <span className="font-medium text-sm">{d.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                  onClick={() => deleteDepartment(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {!loadingDepts && depts?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No departments configured.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Positions (Designations)</h3>
          <div className="flex gap-2 mb-6">
            <select 
              className="w-1/3 p-2 border border-border rounded-md text-sm bg-background"
              value={newDesigDeptId}
              onChange={(e) => setNewDesigDeptId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">(All Depts)</option>
              {depts?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <Input 
              placeholder="e.g. Manager, Staff..." 
              value={newDesig} 
              onChange={e => setNewDesig(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDesig()}
              className="flex-1"
            />
            <Button onClick={handleAddDesig} disabled={loadingDesigs}><Plus className="w-4 h-4" /></Button>
          </div>
          
          <div className="space-y-2">
            {loadingDesigs && <p className="text-sm text-muted-foreground text-center py-4">Loading positions...</p>}
            {!loadingDesigs && desigs?.map((d: any) => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{d.name}</span>
                  {d.department_name && <span className="text-xs text-muted-foreground">{d.department_name}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                  onClick={() => deleteDesignation(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {!loadingDesigs && desigs?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No positions configured.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Salary Components (Fixed Salaries)</h3>
              <p className="text-sm text-muted-foreground">Define how the monthly base salary is split for compliance (must equal 100%).</p>
            </div>
            <Button onClick={handleSaveSalarySettings} disabled={saveSettingsMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" /> Save Settings
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Basic Pay (%)</label>
              <Input 
                type="number" 
                value={basicPct} 
                onChange={(e) => setBasicPct(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">HRA (%)</label>
              <Input 
                type="number" 
                value={hraPct} 
                onChange={(e) => setHraPct(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Other Allowances (%)</label>
              <Input 
                type="number" 
                value={allowancePct} 
                onChange={(e) => setAllowancePct(Number(e.target.value))} 
              />
            </div>
          </div>
          
          <div className={`mt-4 text-sm font-medium p-3 rounded-lg border ${basicPct + hraPct + allowancePct === 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            Total: {basicPct + hraPct + allowancePct}% 
            {basicPct + hraPct + allowancePct !== 100 && " (Must equal 100%)"}
          </div>
        </Card>
    </div>
  );
};
