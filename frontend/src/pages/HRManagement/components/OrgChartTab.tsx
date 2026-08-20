import React, { useMemo } from 'react';
import { useHREmployees } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { User } from 'lucide-react';

export const OrgChartTab: React.FC = () => {
  const { data: employees = [], isLoading, error, refetch } = useHREmployees();

  const { rootNodes, childMap } = useMemo(() => {
    const map = new Map<string, any[]>();
    const roots: any[] = [];
    
    // Build adjacency list
    employees.forEach((emp: any) => {
      if (emp.reports_to) {
        const strId = String(emp.reports_to);
        if (!map.has(strId)) map.set(strId, []);
        map.get(strId)!.push(emp);
      } else {
        roots.push(emp);
      }
    });
    return { rootNodes: roots, childMap: map };
  }, [employees]);

  const renderNode = (emp: any) => {
    const children = childMap.get(String(emp.id)) || [];
    return (
      <div key={emp.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div className="bg-card border border-border shadow-sm rounded-xl p-4 w-48 text-center relative z-10 flex flex-col items-center gap-2 hover:border-primary transition-colors">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="w-full">
            <div className="font-bold text-sm truncate w-full">{emp.name}</div>
            <div className="text-xs text-primary truncate w-full font-medium my-0.5">
              {emp.designation || 'No Designation'}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {emp.department || 'No Dept'}
            </div>
          </div>
        </div>

        {/* Children Tree */}
        {children.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical line down from parent */}
            <div className="w-px h-6 bg-border"></div>
            {/* Horizontal connecting line across children */}
            <div className="flex relative">
              {/* Only show horizontal top border if > 1 child */}
              {children.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-border w-[calc(100%-48px)] mx-auto"></div>
              )}
              {children.map((child: any) => (
                <div key={child.id} className="flex flex-col items-center px-4 relative pt-6">
                  {/* Vertical line up to horizontal connection */}
                  <div className="absolute top-0 left-1/2 -ml-px w-px h-6 bg-border"></div>
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-xl border border-border">
        <h2 className="text-xl font-bold">Organization Chart</h2>
        <p className="text-sm text-muted-foreground mt-1">Visual hierarchy of departments and reporting structure.</p>
      </div>
      
      <SafeDataView isLoading={isLoading} error={error} data={employees} onRetry={refetch}>
        <div className="bg-muted/30 border border-border rounded-xl p-8 overflow-auto min-h-[500px] flex justify-center">
          <div className="flex gap-16">
            {rootNodes.map(renderNode)}
            {rootNodes.length === 0 && employees.length > 0 && (
              <div className="text-muted-foreground italic">No root employees found (everyone reports to someone).</div>
            )}
            {employees.length === 0 && (
              <div className="text-muted-foreground italic">No employees found.</div>
            )}
          </div>
        </div>
      </SafeDataView>
    </div>
  );
};
