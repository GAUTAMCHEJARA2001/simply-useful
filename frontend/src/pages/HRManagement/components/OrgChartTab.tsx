import React, { useMemo, useState, useRef } from 'react';
import { useHREmployees } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import {
  User, ZoomIn, ZoomOut, Maximize, Search, ChevronDown, ChevronRight,
  Building, Phone, Filter, Layers, Network, Minimize2, Check, Sparkles,
  Users, Briefcase, Eye, ChevronUp
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
};

const getDepartmentColor = (dept?: string | null) => {
  const d = (dept || '').toLowerCase();
  if (d.includes('sale') || d.includes('market')) return { bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30', border: 'border-l-blue-500', dot: 'bg-blue-500' };
  if (d.includes('prod') || d.includes('plant') || d.includes('factory')) return { bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', border: 'border-l-emerald-500', dot: 'bg-emerald-500' };
  if (d.includes('hr') || d.includes('admin') || d.includes('personnel')) return { bg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30', border: 'border-l-violet-500', dot: 'bg-violet-500' };
  if (d.includes('acc') || d.includes('fin')) return { bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30', border: 'border-l-amber-500', dot: 'bg-amber-500' };
  if (d.includes('dispatch') || d.includes('logist') || d.includes('ware')) return { bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30', border: 'border-l-cyan-500', dot: 'bg-cyan-500' };
  return { bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30', border: 'border-l-primary', dot: 'bg-primary' };
};

export const OrgChartTab: React.FC = () => {
  const { data: employees = [], isLoading, error, refetch } = useHREmployees();

  // Active view: 'tree' | 'department' | 'directory'
  const [activeView, setActiveView] = useState<'tree' | 'department' | 'directory'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [compactLeavesMode, setCompactLeavesMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e: any) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Build hierarchy maps
  const { executiveRoots, unassignedStaff, childMap, parentMap } = useMemo(() => {
    const children = new Map<string, any[]>();
    const parents = new Map<string, string>();
    const allRoots: any[] = [];

    const activeList = selectedDept === 'ALL' 
      ? employees 
      : employees.filter((e: any) => e.department === selectedDept);

    const activeIds = new Set(activeList.map((e: any) => String(e.id)));

    activeList.forEach((emp: any) => {
      const reportsTo = emp.reports_to ? String(emp.reports_to) : null;
      if (reportsTo && activeIds.has(reportsTo)) {
        if (!children.has(reportsTo)) children.set(reportsTo, []);
        children.get(reportsTo)!.push(emp);
        parents.set(String(emp.id), reportsTo);
      } else {
        allRoots.push(emp);
      }
    });

    const execRoots: any[] = [];
    const unassigned: any[] = [];

    allRoots.forEach((root: any) => {
      const hasKids = (children.get(String(root.id)) || []).length > 0;
      const desig = (root.designation || '').toLowerCase();
      const isLeadership = hasKids || 
                           desig.includes('director') || 
                           desig.includes('ceo') || 
                           desig.includes('head') || 
                           desig.includes('managing') || 
                           desig.includes('owner') ||
                           desig.includes('manager');

      if (isLeadership) {
        execRoots.push(root);
      } else {
        unassigned.push(root);
      }
    });

    if (execRoots.length === 0 && unassigned.length > 0) {
      return { 
        executiveRoots: unassigned, 
        unassignedStaff: [], 
        childMap: children, 
        parentMap: parents 
      };
    }

    return { 
      executiveRoots: execRoots, 
      unassignedStaff: unassigned, 
      childMap: children, 
      parentMap: parents 
    };
  }, [employees, selectedDept]);

  // Auto-expand ancestry path when searching
  React.useEffect(() => {
    if (!searchTerm.trim()) return;
    const term = searchTerm.toLowerCase();
    const toUncollapse: Record<string, boolean> = {};
    employees.forEach((emp: any) => {
      const matches = (emp.name && emp.name.toLowerCase().includes(term)) ||
                      (emp.designation && emp.designation.toLowerCase().includes(term)) ||
                      (emp.department && emp.department.toLowerCase().includes(term));
      if (matches) {
        let currParent = parentMap.get(String(emp.id));
        while (currParent) {
          toUncollapse[currParent] = false;
          currParent = parentMap.get(currParent);
        }
      }
    });
    setCollapsedNodes(prev => ({ ...prev, ...toUncollapse }));
  }, [searchTerm, employees, parentMap]);

  // Toggle single node collapse
  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    setCollapsedNodes({});
  };

  const handleCollapseAll = () => {
    const newCollapsed: Record<string, boolean> = {};
    employees.forEach((emp: any) => {
      const hasChildren = (childMap.get(String(emp.id)) || []).length > 0;
      if (hasChildren) newCollapsed[String(emp.id)] = true;
    });
    setCollapsedNodes(newCollapsed);
  };

  // Collapse only leaf teams (managers whose children have no subordinates of their own)
  const handleCollapseLeafTeams = () => {
    const newCollapsed: Record<string, boolean> = {};
    employees.forEach((emp: any) => {
      const children = childMap.get(String(emp.id)) || [];
      if (children.length > 0) {
        const hasGrandchildren = children.some(c => (childMap.get(String(c.id)) || []).length > 0);
        if (!hasGrandchildren && children.length >= 3) {
          newCollapsed[String(emp.id)] = true;
        }
      }
    });
    setCollapsedNodes(newCollapsed);
  };

  // Check if an employee matches search
  const isMatch = (emp: any) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.designation && emp.designation.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(term))
    );
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Render a Single Org Card
  const renderEmployeeCard = (emp: any, isLeafInGrid = false) => {
    const children = childMap.get(String(emp.id)) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = !!collapsedNodes[String(emp.id)];
    const matched = isMatch(emp);
    const isSelected = selectedEmployee?.id === emp.id;
    const deptStyle = getDepartmentColor(emp.department);

    return (
      <div
        onClick={() => setSelectedEmployee(emp)}
        className={cn(
          "bg-card border rounded-xl shadow-sm transition-all duration-200 cursor-pointer select-none relative group",
          deptStyle.border,
          "border-l-4",
          isLeafInGrid ? "w-44 p-2.5 text-left" : "w-52 p-3 text-center",
          matched ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg bg-primary/5" : "hover:border-primary/70 hover:shadow-md",
          isSelected ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20" : ""
        )}
      >
        <div className={cn("flex items-center gap-2.5", isLeafInGrid ? "flex-row text-left" : "flex-col text-center")}>
          {/* Avatar / Photo */}
          <div className="relative shrink-0">
            {emp.employee_photo ? (
              <img
                src={resolveMediaUrl(emp.employee_photo)}
                alt={emp.name}
                className={cn("rounded-full object-cover border border-border shadow-sm", isLeafInGrid ? "w-9 h-9" : "w-12 h-12")}
              />
            ) : (
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold text-primary bg-primary/10 border border-primary/20",
                isLeafInGrid ? "w-9 h-9 text-xs" : "w-12 h-12 text-sm"
              )}>
                {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
              </div>
            )}
            {/* Status dot */}
            <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-card", deptStyle.dot)} />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 w-full">
            <div className="font-bold text-sm text-foreground truncate" title={emp.name}>
              {emp.name}
            </div>
            <div className="text-xs font-semibold text-primary truncate" title={emp.designation || 'No Post'}>
              {emp.designation || 'Staff / Officer'}
            </div>

            <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
              {emp.department && (
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate max-w-[120px]", deptStyle.bg)}>
                  {emp.department}
                </span>
              )}
              {emp.employee_id && (
                <span className="text-[10px] font-mono text-muted-foreground px-1 bg-muted rounded">
                  {emp.employee_id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand / Collapse Badge for Managers */}
        {hasChildren && !isLeafInGrid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(String(emp.id));
            }}
            className={cn(
              "mt-2 w-full py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border",
              isCollapsed
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                : "bg-muted hover:bg-muted/80 text-foreground border-border/80"
            )}
            title={isCollapsed ? `Click to reveal ${children.length} direct reports` : "Click to hide subordinate branch"}
          >
            <Users className="w-3 h-3" />
            <span>{children.length} {children.length === 1 ? 'Report' : 'Reports'}</span>
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  };

  // Render a Node and its Subordinates
  const renderNode = (emp: any) => {
    const children = childMap.get(String(emp.id)) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = !!collapsedNodes[String(emp.id)];

    // Partition children into those who lead sub-teams vs direct individual contributors
    const branchChildren = children.filter(c => (childMap.get(String(c.id)) || []).length > 0);
    const leafChildren = children.filter(c => (childMap.get(String(c.id)) || []).length === 0);

    // Use compact grid if compactLeavesMode is ON and there are at least 2 leaf members
    const shouldUseCompactGrid = compactLeavesMode && leafChildren.length >= 2;

    return (
      <div key={emp.id} className="flex flex-col items-center">
        {/* The Node Card */}
        {renderEmployeeCard(emp)}

        {/* Subordinate Tree (if expanded) */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center">
            {/* Vertical connector down from parent */}
            <div className="w-0.5 h-6 bg-primary/40"></div>

            {/* Direct leaf team members in a balanced 2-3 column grid (prevents infinite horizontal spreading) */}
            {shouldUseCompactGrid ? (
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-px bg-primary/40"></div>
                <div className="mt-2 p-3 bg-muted/40 border border-border/70 rounded-2xl shadow-sm">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Direct Team Members ({leafChildren.length})</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-xl">
                    {leafChildren.map(child => (
                      <div key={child.id} className="flex justify-center">
                        {renderEmployeeCard(child, true)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* If there are also branch children who have sub-teams, show their tree beneath */}
                {branchChildren.length > 0 && (
                  <div className="flex flex-col items-center mt-3">
                    <div className="w-0.5 h-6 bg-primary/40"></div>
                    {branchChildren.length > 1 && (
                      <div className="w-[calc(100%-48px)] h-0.5 bg-primary/30 mx-auto"></div>
                    )}
                    <div className="flex relative gap-6 pt-2">
                      {branchChildren.map(child => (
                        <div key={child.id} className="flex flex-col items-center relative pt-4">
                          <div className="absolute top-0 left-1/2 -ml-[1px] w-0.5 h-4 bg-primary/30"></div>
                          {renderNode(child)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Standard Hierarchical Tree Branch */
              <div className="flex relative">
                {children.length > 1 && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30 w-[calc(100%-48px)] mx-auto"></div>
                )}
                {children.map(child => (
                  <div key={child.id} className="flex flex-col items-center px-2 relative pt-6">
                    <div className="absolute top-0 left-1/2 -ml-[1px] w-0.5 h-6 bg-primary/30"></div>
                    {renderNode(child)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Department Grouped View
  const departmentGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    employees.forEach((e: any) => {
      const dept = e.department || 'Unassigned Department';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(e);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [employees]);

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Top Header Card */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Interactive Organization Chart</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Company reporting hierarchy, leadership tree, and department team structures.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border self-start md:self-auto">
          <Button
            variant={activeView === 'tree' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('tree')}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
          >
            <Network className="w-3.5 h-3.5" />
            Visual Tree
          </Button>
          <Button
            variant={activeView === 'department' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('department')}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
          >
            <Layers className="w-3.5 h-3.5" />
            By Department
          </Button>
          <Button
            variant={activeView === 'directory' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('directory')}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
          >
            <Users className="w-3.5 h-3.5" />
            Staff Directory
          </Button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search person, post, department, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-9 px-2 text-xs">
              Clear
            </Button>
          )}
        </div>

        {/* Tree Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeView === 'tree' && (
            <>
              <Button
                variant={compactLeavesMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompactLeavesMode(!compactLeavesMode)}
                className="h-8 text-xs font-medium"
                title="When ON, large teams of workers/SO appear in neat 2-3 column grids below their manager rather than spreading 3000px horizontally"
              >
                <Layers className="w-3.5 h-3.5 mr-1" />
                {compactLeavesMode ? 'Compact Teams: ON' : 'Compact Teams: OFF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExpandAll} className="h-8 text-xs font-medium">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseLeafTeams} className="h-8 text-xs font-medium" title="Collapse large teams to see high-level leadership">
                Collapse Teams
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseAll} className="h-8 text-xs font-medium">
                Collapse All
              </Button>
            </>
          )}

          {/* Department Filter (Available for both Visual Tree and Department View) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3 text-primary" /> Dept:
            </span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="h-8 text-xs border rounded-lg px-2 bg-background font-medium"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 text-xs font-medium"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize className="w-3.5 h-3.5 mr-1" />}
            {isFullscreen ? 'Exit Full' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <SafeDataView isLoading={isLoading} error={error} data={employees} onRetry={refetch}>
        {/* VIEW 1: INTERACTIVE ZOOMABLE TREE */}
        {activeView === 'tree' && (
          <div className="bg-muted/20 border border-border rounded-xl overflow-hidden min-h-[650px] h-[calc(100vh-280px)] relative shadow-inner">
            <TransformWrapper
              initialScale={0.9}
              minScale={0.15}
              maxScale={2.5}
              centerOnInit={true}
              limitToBounds={false}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Floating Canvas Action Panel */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-background/95 backdrop-blur-md p-1.5 rounded-xl border shadow-lg">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomIn(0.2)} title="Zoom In">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomOut(0.2)} title="Zoom Out">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => resetTransform()} title="Center & Fit">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Quick Stats Pill */}
                  <div className="absolute top-4 left-4 z-20 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-sm text-xs font-medium text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <strong>{employees.length}</strong> Total Members
                    </span>
                    <span className="w-px h-3 bg-border" />
                    <span>
                      <strong>{executiveRoots.length}</strong> Hierarchy Heads
                    </span>
                    {compactLeavesMode && (
                      <>
                        <span className="w-px h-3 bg-border" />
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Anti-Spread Compact Mode
                        </span>
                      </>
                    )}
                  </div>

                  {/* Drag & Pan Canvas */}
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <div className="flex flex-col items-center p-12 min-w-max min-h-max pt-8">
                      {/* Unassigned / Direct Staff Collateral Box (keeps executive tree clean and prevents horizontal explosion) */}
                      {unassignedStaff.length > 0 && selectedDept === 'ALL' && (
                        <div className="mb-8 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs max-w-4xl mx-auto">
                          <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                                Unassigned / Direct Staff ({unassignedStaff.length})
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                • Individual staff without an assigned manager
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {unassignedStaff.map(emp => (
                              <div key={emp.id} className="flex justify-center">
                                {renderEmployeeCard(emp, true)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Leadership & Subordinate Trees */}
                      <div className="flex gap-12 justify-center items-start">
                        {executiveRoots.map(renderNode)}
                      </div>

                      {executiveRoots.length === 0 && employees.length > 0 && (
                        <div className="p-8 text-center text-muted-foreground italic bg-card border rounded-xl">
                          No team hierarchy found for the selected department filter.
                        </div>
                      )}
                      {employees.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground italic bg-card border rounded-xl">
                          No employees found in the organization master.
                        </div>
                      )}
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        )}

        {/* VIEW 2: DEPARTMENT & TEAMS MATRIX */}
        {activeView === 'department' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {departmentGroups
              .filter(([dept]) => selectedDept === 'ALL' || dept === selectedDept)
              .map(([dept, members]) => {
                const deptColor = getDepartmentColor(dept);
                return (
                  <div key={dept} className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-3 h-3 rounded-full", deptColor.dot)} />
                        <h3 className="font-bold text-base text-foreground">{dept}</h3>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {members.map((emp: any) => {
                        const managerName = emp.reports_to ? employees.find((e: any) => e.id === emp.reports_to)?.name : null;
                        return (
                          <div
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 hover:bg-muted/30 transition-all cursor-pointer",
                              selectedEmployee?.id === emp.id ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                            )}
                          >
                            {emp.employee_photo ? (
                              <img src={resolveMediaUrl(emp.employee_photo)} alt={emp.name} className="w-10 h-10 rounded-full object-cover shrink-0 border" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate text-foreground">{emp.name}</div>
                              <div className="text-xs text-primary font-medium truncate">{emp.designation || 'Staff'}</div>
                              {managerName && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Reports to: <span className="font-semibold text-foreground/80">{managerName}</span>
                                </div>
                              )}
                            </div>

                            {emp.contactinfo && (
                              <a
                                href={`tel:${emp.contactinfo}`}
                                onClick={e => e.stopPropagation()}
                                className="p-1.5 text-muted-foreground hover:text-primary rounded-md border bg-card"
                                title={emp.contactinfo}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* VIEW 3: STAFF DIRECTORY & REPORTING CHAINS */}
        {activeView === 'directory' && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Employee Reporting Directory</h3>
                <p className="text-xs text-muted-foreground">Linear audit of every employee's designated manager and reporting lineage.</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {employees.length} Records
              </Badge>
            </div>

            <div className="divide-y divide-border/60">
              {employees
                .filter(e => isMatch(e) || !searchTerm)
                .map((emp: any) => {
                  const manager = employees.find((m: any) => m.id === emp.reports_to);
                  const directReports = childMap.get(String(emp.id)) || [];

                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className={cn(
                        "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer",
                        selectedEmployee?.id === emp.id ? "bg-primary/5" : ""
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.employee_photo ? (
                          <img src={resolveMediaUrl(emp.employee_photo)} alt={emp.name} className="w-10 h-10 rounded-full object-cover shrink-0 border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                            {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{emp.name}</span>
                            {emp.employee_id && (
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {emp.employee_id}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-primary font-medium">
                            {emp.designation || 'Staff'} · <span className="text-muted-foreground">{emp.department || 'No Dept'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        {/* Reports to badge */}
                        <div className="min-w-[140px]">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Reports To</span>
                          {manager ? (
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <User className="w-3 h-3 text-primary" /> {manager.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic font-medium">Top Leadership / None</span>
                          )}
                        </div>

                        {/* Direct reports count */}
                        <div className="min-w-[80px]">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Team Size</span>
                          <span className="font-semibold text-foreground">
                            {directReports.length} {directReports.length === 1 ? 'Person' : 'People'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </SafeDataView>

      {/* Selected Employee Quick Drawer / Modal */}
      {selectedEmployee && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Employee Profile
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>

            <div className="flex flex-col items-center text-center space-y-2">
              {selectedEmployee.employee_photo ? (
                <img
                  src={resolveMediaUrl(selectedEmployee.employee_photo)}
                  alt={selectedEmployee.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xl border-2 border-primary/20">
                  {selectedEmployee.name ? selectedEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                </div>
              )}
              <div>
                <h4 className="font-bold text-lg text-foreground">{selectedEmployee.name}</h4>
                <p className="text-sm font-semibold text-primary">{selectedEmployee.designation || 'Staff / Officer'}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs">{selectedEmployee.department || 'No Dept'}</Badge>
                  {selectedEmployee.employee_id && (
                    <Badge variant="secondary" className="font-mono text-xs">{selectedEmployee.employee_id}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm divide-y divide-border/60">
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground text-xs font-medium">Reporting Manager</span>
                <span className="font-semibold text-foreground text-xs">
                  {selectedEmployee.reports_to
                    ? employees.find((e: any) => e.id === selectedEmployee.reports_to)?.name || 'Manager'
                    : 'Board / Top Leadership'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground text-xs font-medium">Direct Reports</span>
                <span className="font-semibold text-foreground text-xs">
                  {(childMap.get(String(selectedEmployee.id)) || []).length} direct reports
                </span>
              </div>
              {selectedEmployee.contactinfo && (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground text-xs font-medium">Contact Phone</span>
                  <a href={`tel:${selectedEmployee.contactinfo}`} className="font-semibold text-xs text-primary hover:underline">
                    {selectedEmployee.contactinfo}
                  </a>
                </div>
              )}
              {selectedEmployee.doj && (
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Joining Date</span>
                  <span className="font-semibold text-foreground text-xs">{selectedEmployee.doj}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground text-xs font-medium">Compensation Plan</span>
                <span className="font-semibold text-foreground text-xs">
                  {selectedEmployee.employee_type === 'FIXED' ? 'Fixed Monthly' : selectedEmployee.employee_type === 'VARIABLE' ? 'Variable Daily Wage' : 'Org Chart Only'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6">
            <Button className="w-full text-xs" variant="outline" onClick={() => setSelectedEmployee(null)}>
              Close Panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
