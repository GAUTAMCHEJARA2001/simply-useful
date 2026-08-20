import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useHRDepartments, useHRDesignations, useHRMasterMutations } from '@/hooks/hr/useHR';

export const HRConfigTab = () => {
  const { data: depts, isLoading: loadingDepts, refetch: refetchDepts } = useHRDepartments();
  const { data: desigs, isLoading: loadingDesigs, refetch: refetchDesigs } = useHRDesignations();
  const { addDepartment, deleteDepartment, addDesignation, deleteDesignation } = useHRMasterMutations();
  
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');

  const handleAddDept = async () => {
    if(!newDept.trim()) return;
    await addDepartment(newDept.trim());
    setNewDept('');
  };

  const handleAddDesig = async () => {
    if(!newDesig.trim()) return;
    await addDesignation(newDesig.trim());
    setNewDesig('');
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
            <Button onClick={handleAddDept}><Plus className="w-4 h-4" /></Button>
          </div>
          
          <div className="space-y-2">
            {depts?.map((d: any) => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                <span className="font-medium text-sm">{d.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                  onClick={() => deleteDepartment(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {depts?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No departments configured.</p>
            )}
          </div>
        </Card>

      <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Positions (Designations)</h3>
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="e.g. Manager, Staff..." 
              value={newDesig} 
              onChange={e => setNewDesig(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDesig()}
            />
            <Button onClick={handleAddDesig}><Plus className="w-4 h-4" /></Button>
          </div>
          
          <div className="space-y-2">
            {desigs?.map((d: any) => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border">
                <span className="font-medium text-sm">{d.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                  onClick={() => deleteDesignation(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {desigs?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No positions configured.</p>
            )}
          </div>
        </Card>
    </div>
  );
};
