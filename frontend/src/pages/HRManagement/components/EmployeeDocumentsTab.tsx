import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, Download, FileText, Award, CreditCard, 
  Copy, RefreshCw, Sparkles, Briefcase, ShieldCheck, 
  ChevronsUpDown, Check, User, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { useHREmployees } from '@/hooks/hr/useHR';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSearchParams } from 'react-router-dom';
import { cn } from "@/lib/utils";
import html2pdf from 'html2pdf.js';

export type DocumentType = 'offer_letter' | 'appointment_letter' | 'relieving_letter' | 'salary_certificate' | 'id_card';

export const EmployeeDocumentsTab: React.FC = () => {
  const { settings } = useData();
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useHREmployees();
  const [searchParams, setSearchParams] = useSearchParams();

  const printContainerRef = useRef<HTMLDivElement>(null);

  const [activeDoc, setActiveDoc] = useState<DocumentType>('offer_letter');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [empSelectorOpen, setEmpSelectorOpen] = useState(false);

  // Set initial employee from query param or first available
  useEffect(() => {
    const paramId = searchParams.get('employeeId');
    if (paramId && employees.some((e: any) => String(e.id) === String(paramId))) {
      setSelectedEmployeeId(String(paramId));
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(String(employees[0].id));
    }
  }, [employees, searchParams]);

  const selectedEmployee = employees.find((e: any) => String(e.id) === String(selectedEmployeeId)) || employees[0] || null;

  // Company details
  const companyName = settings?.company_name || 'KAMLA CONCHEM PVT LTD';
  const companyAddress = settings?.company_address || 'Phase-1, Industrial Area, Gujarat, India';
  const companyEmail = settings?.company_email || 'support@kamla.com';
  const companyPhone = settings?.company_phone || '+91 81559 31559';
  const companyGst = settings?.company_gst || '24AALCK3507C1ZX';
  const companyLogo = settings?.company_logo || '';

  const todayStr = new Date().toISOString().split('T')[0];

  // Configurable fields state
  const [docConfig, setDocConfig] = useState({
    issueDate: todayStr,
    signatoryName: 'Authorized Signatory',
    signatoryDesignation: 'Head of Human Resources',
    joiningDate: todayStr,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:00 PM (Monday to Saturday)',
    workLocation: 'Plant / Head Office',
    relievingDate: todayStr,
    conductRating: 'Satisfactory and Exemplary',
    relievingReason: 'Personal career progression',
    addressedTo: 'To Whom It May Concern',
    certificatePurpose: 'for Official Verification / Financial Application',
    bloodGroup: 'B+',
    emergencyContact: '+91 98765 43210',
    validUpto: `${new Date().getFullYear() + 3}-12-31`,
  });

  // Keep joiningDate & contact synced when selectedEmployee changes
  useEffect(() => {
    if (selectedEmployee) {
      setDocConfig(prev => ({
        ...prev,
        joiningDate: selectedEmployee.doj || prev.joiningDate,
        emergencyContact: selectedEmployee.contactinfo || prev.emergencyContact,
      }));
    }
  }, [selectedEmployee]);

  const resolveMediaUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const monthlyBase = Number(selectedEmployee?.base_salary_monthly || (selectedEmployee?.dailywage ? selectedEmployee.dailywage * 26 : 0) || 0);
  const annualCtc = monthlyBase * 12;

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!printContainerRef.current || !selectedEmployee) return;
    setIsGenerating(true);
    try {
      const docNameMapping: Record<DocumentType, string> = {
        offer_letter: 'Offer_Letter',
        appointment_letter: 'Appointment_Letter',
        relieving_letter: 'Experience_Certificate',
        salary_certificate: 'Salary_Certificate',
        id_card: 'Employee_ID_Card',
      };

      const filename = `${docNameMapping[activeDoc]}_${selectedEmployee.name.replace(/\s+/g, '_')}_${selectedEmployee.employee_id || 'EMP'}.pdf`;

      const opt: any = {
        margin: activeDoc === 'id_card' ? [5, 5, 5, 5] : [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: {
          unit: 'mm',
          format: activeDoc === 'id_card' ? [140, 95] : 'a4',
          orientation: activeDoc === 'id_card' ? 'landscape' : 'portrait'
        }
      };

      await html2pdf().set(opt).from(printContainerRef.current).save();
      toast({ title: 'Download Complete', description: `${filename} has been saved.` });
    } catch (err: any) {
      toast({ title: 'Error generating PDF', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    if (!printContainerRef.current || !selectedEmployee) return;
    const printContent = printContainerRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Popup Blocked', description: 'Please allow popups to print.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedEmployee.name} - ${activeDoc.toUpperCase()}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: ${activeDoc === 'id_card' ? 'auto' : 'A4'}; margin: ${activeDoc === 'id_card' ? '4mm' : '10mm'}; }
            }
          </style>
        </head>
        <body class="bg-white p-4">
          ${printContent}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!printContainerRef.current) return;
    navigator.clipboard.writeText(printContainerRef.current.innerText);
    toast({ title: 'Copied to Clipboard', description: 'Document text copied.' });
  };

  // Render Letterhead Header
  const renderHeader = () => (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {companyLogo ? (
            <img src={resolveMediaUrl(companyLogo)} alt={companyName} className="h-14 max-w-[180px] object-contain shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-xl tracking-wider shrink-0">
              {companyName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase leading-snug">{companyName}</h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{companyAddress}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium pt-0.5">
              {companyEmail && <span>Email: <strong className="text-slate-700 font-normal">{companyEmail}</strong></span>}
              {companyPhone && <span>• Tel: <strong className="text-slate-700 font-normal">{companyPhone}</strong></span>}
              {companyGst && <span>• GSTIN: <strong className="text-slate-700 font-normal">{companyGst}</strong></span>}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md min-w-[120px]">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">DATE OF ISSUE</span>
          <span className="text-xs font-black text-slate-900">{formatDate(docConfig.issueDate)}</span>
          <span className="text-[9px] font-mono text-slate-400 block mt-0.5">REF: {selectedEmployee?.employee_id || 'EMP'}</span>
        </div>
      </div>
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-700 via-indigo-600 to-transparent mt-3.5"></div>
    </div>
  );

  // Render Signatory Section
  const renderSignatory = () => (
    <div className="pt-10 mt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
      <div>
        <p className="text-slate-500 mb-1">For &amp; on behalf of</p>
        <p className="font-bold text-slate-900">{companyName}</p>
        <div className="h-16 flex items-end">
          <div className="border-b border-slate-400 w-44 pb-1">
            <span className="text-[10px] italic text-slate-400 block">[Authorized Signature &amp; Stamp]</span>
          </div>
        </div>
        <p className="font-semibold text-slate-900 mt-1">{docConfig.signatoryName}</p>
        <p className="text-slate-500 text-[11px]">{docConfig.signatoryDesignation}</p>
      </div>

      <div className="text-right flex flex-col justify-end items-end">
        <p className="text-slate-500 mb-1">Employee Acceptance / Acknowledgement</p>
        <p className="font-bold text-slate-900">{selectedEmployee?.name}</p>
        <div className="h-16 flex items-end">
          <div className="border-b border-slate-400 w-44 pb-1 text-right">
            <span className="text-[10px] italic text-slate-400 block">[Signature of Employee]</span>
          </div>
        </div>
        <p className="text-slate-500 text-[11px] mt-1">Date: ____________________</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      
      {/* ── UNIFIED EXECUTIVE CONTROL BAR (COMBINED HEADER + SELECTOR + ACTIONS + TABS) ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-4 space-y-3.5">
        
        {/* Row 1: Title, Searchable Employee Picker & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left: Module Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">Documents &amp; Letters</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  HR Studio
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Generate official employment letters &amp; ID cards</p>
            </div>
          </div>

          {/* Center: Searchable Employee Dropdown Selector */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="w-full">
              <Popover open={empSelectorOpen} onOpenChange={setEmpSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox" 
                    aria-expanded={empSelectorOpen} 
                    className="w-full justify-between font-normal text-xs px-3 py-2 h-10 text-left bg-background/60 hover:bg-background border-border"
                  >
                    {selectedEmployee ? (
                      <div className="flex items-center gap-2.5 truncate">
                        {selectedEmployee.employee_photo ? (
                          <img 
                            src={resolveMediaUrl(selectedEmployee.employee_photo)} 
                            alt={selectedEmployee.name} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 border" 
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">
                            {selectedEmployee.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-foreground truncate">{selectedEmployee.name}</span>
                        <span className="text-[11px] font-mono text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                          {selectedEmployee.employee_id || 'ID Pending'}
                        </span>
                        <span className="text-muted-foreground truncate hidden md:inline text-[11px]">
                          • {selectedEmployee.designation || 'Staff'} ({selectedEmployee.department || 'Production'})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select an employee...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee by name, ID, post..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((emp: any) => (
                          <CommandItem 
                            key={emp.id} 
                            value={`${emp.name} ${emp.employee_id} ${emp.department} ${emp.designation}`}
                            onSelect={() => {
                              setSelectedEmployeeId(String(emp.id));
                              setSearchParams({ tab: 'documents', employeeId: String(emp.id) });
                              setEmpSelectorOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", String(selectedEmployeeId) === String(emp.id) ? "opacity-100" : "opacity-0")} />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {emp.employee_photo ? (
                                <img src={resolveMediaUrl(emp.employee_photo)} alt={emp.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {emp.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-xs font-semibold truncate leading-tight">{emp.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Staff'} • {emp.department || 'Operations'}</p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedEmployee && (
              <div className="hidden xl:flex items-center gap-1.5 shrink-0 text-[11px]">
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                  {selectedEmployee.department || 'Production'}
                </span>
                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">
                  {formatCurrency(monthlyBase)}/mo
                </span>
              </div>
            )}
          </div>

          {/* Right: Action Buttons Group */}
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyText} 
              className="text-xs gap-1.5 h-10 px-3 hover:bg-muted"
              title="Copy plain text"
            >
              <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copy Text</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint} 
              className="text-xs gap-1.5 h-10 px-3 hover:bg-muted"
              title="Print directly"
            >
              <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownloadPdf} 
              disabled={isGenerating || !selectedEmployee} 
              className="text-xs gap-1.5 h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-all"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* Row 2: 5-Segment Document Switcher Tabs (Responsive Grid, NO SCROLLBAR) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2.5 border-t border-border/60">
          <button
            onClick={() => setActiveDoc('offer_letter')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDoc === 'offer_letter'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Offer Letter</span>
          </button>

          <button
            onClick={() => setActiveDoc('appointment_letter')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDoc === 'appointment_letter'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Appointment Letter</span>
          </button>

          <button
            onClick={() => setActiveDoc('relieving_letter')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDoc === 'relieving_letter'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3. Experience &amp; Relieving</span>
          </button>

          <button
            onClick={() => setActiveDoc('salary_certificate')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDoc === 'salary_certificate'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">4. Salary Certificate</span>
          </button>

          <button
            onClick={() => setActiveDoc('id_card')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all col-span-2 sm:col-span-1 ${
              activeDoc === 'id_card'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">5. Employee ID Card</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE (LEFT SETTINGS SIDEBAR + RIGHT STAGED DOCUMENT CANVAS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Document Customizer Sidebar (4 cols, Sticky) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 text-xs lg:sticky lg:top-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" /> Document Configuration
            </h3>
            <span className="text-[10px] text-muted-foreground">Live updates on right</span>
          </div>

          {/* Section A: Signatory & Dates */}
          <div className="space-y-3">
            <div>
              <label className="font-semibold block mb-1 text-muted-foreground">Document Issue Date</label>
              <input 
                type="date" 
                className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                value={docConfig.issueDate}
                onChange={(e) => setDocConfig({ ...docConfig, issueDate: e.target.value })}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-muted-foreground">Authorized Signatory Name</label>
              <input 
                type="text" 
                className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                value={docConfig.signatoryName}
                onChange={(e) => setDocConfig({ ...docConfig, signatoryName: e.target.value })}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-muted-foreground">Signatory Designation / Title</label>
              <input 
                type="text" 
                className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                value={docConfig.signatoryDesignation}
                onChange={(e) => setDocConfig({ ...docConfig, signatoryDesignation: e.target.value })}
              />
            </div>
          </div>

          {/* Section B: Dynamic Document Specific Options */}
          {activeDoc === 'offer_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Offer Terms</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Proposed Joining Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.joiningDate}
                  onChange={(e) => setDocConfig({ ...docConfig, joiningDate: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Probation Period</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.probationPeriod}
                  onChange={(e) => setDocConfig({ ...docConfig, probationPeriod: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Work Location</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.workLocation}
                  onChange={(e) => setDocConfig({ ...docConfig, workLocation: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'appointment_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Appointment Clauses</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Date of Joining (DOJ)</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.joiningDate}
                  onChange={(e) => setDocConfig({ ...docConfig, joiningDate: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Probation Period</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.probationPeriod}
                  onChange={(e) => setDocConfig({ ...docConfig, probationPeriod: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Notice Period on Separation</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.noticePeriod}
                  onChange={(e) => setDocConfig({ ...docConfig, noticePeriod: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Work Hours Schedule</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.workHours}
                  onChange={(e) => setDocConfig({ ...docConfig, workHours: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'relieving_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Relieving &amp; Experience Details</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Last Working Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.relievingDate}
                  onChange={(e) => setDocConfig({ ...docConfig, relievingDate: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Conduct Statement</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.conductRating}
                  onChange={(e) => setDocConfig({ ...docConfig, conductRating: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Reason for Separation</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.relievingReason}
                  onChange={(e) => setDocConfig({ ...docConfig, relievingReason: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'salary_certificate' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Certificate Recipient &amp; Purpose</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Addressed To (Recipient)</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  placeholder="e.g. To Whom It May Concern / Branch Manager, Bank"
                  value={docConfig.addressedTo}
                  onChange={(e) => setDocConfig({ ...docConfig, addressedTo: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Certificate Purpose</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.certificatePurpose}
                  onChange={(e) => setDocConfig({ ...docConfig, certificatePurpose: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'id_card' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">ID Card Badge Details</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Blood Group</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.bloodGroup}
                  onChange={(e) => setDocConfig({ ...docConfig, bloodGroup: e.target.value })}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Emergency Contact Phone</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.emergencyContact}
                  onChange={(e) => setDocConfig({ ...docConfig, emergencyContact: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Valid Upto Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.validUpto}
                  onChange={(e) => setDocConfig({ ...docConfig, validUpto: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Quick Snapshot Footer */}
          {selectedEmployee && (
            <div className="pt-3 border-t border-border space-y-1.5 text-muted-foreground text-[11px] bg-muted/20 p-3 rounded-xl">
              <span className="font-bold text-foreground block">Employee Snapshot:</span>
              <p>Name: <strong className="text-foreground">{selectedEmployee.name}</strong></p>
              <p>Designation: <strong className="text-foreground">{selectedEmployee.designation || 'Staff'}</strong></p>
              <p>Department: <strong className="text-foreground">{selectedEmployee.department || 'Operations'}</strong></p>
              <p>Base Compensation: <strong className="text-foreground">{formatCurrency(monthlyBase)}/mo</strong></p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Document Canvas Staging Area (8 cols) */}
        <div className="lg:col-span-8 flex justify-center items-start bg-slate-100/60 dark:bg-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border">
          
          {!selectedEmployee ? (
            <div className="w-full bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-3">
              <User className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <h3 className="font-bold text-foreground text-base">No Employee Selected</h3>
              <p className="text-xs">Please select an employee from the dropdown above to generate official documents.</p>
            </div>
          ) : (
            <div 
              ref={printContainerRef}
              className={`bg-white text-slate-900 shadow-xl border border-slate-200 rounded-sm font-sans transition-all w-full ${
                activeDoc === 'id_card' ? 'max-w-xl p-6' : 'max-w-[780px] p-8 sm:p-12 min-h-[960px]'
              }`}
              style={{ color: '#0f172a' }}
            >

              {/* ────────────────── 1. OFFER LETTER ────────────────── */}
              {activeDoc === 'offer_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-base text-slate-900">{selectedEmployee.name}</p>
                    {selectedEmployee.contactinfo && <p className="text-slate-600">Mobile: {selectedEmployee.contactinfo}</p>}
                    {selectedEmployee.aadhar_number && <p className="text-slate-600">Aadhaar Ref: {selectedEmployee.aadhar_number}</p>}
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Letter of Offer of Employment
                    </h2>
                  </div>

                  <p>Dear <strong>{selectedEmployee.name}</strong>,</p>

                  <p>
                    We are pleased to extend an offer of employment with <strong>{companyName}</strong> for the position of{' '}
                    <strong>{selectedEmployee.designation || 'Team Associate'}</strong> in our{' '}
                    <strong>{selectedEmployee.department || 'Operations'}</strong> Department.
                  </p>

                  <p>
                    We were thoroughly impressed with your experience and qualifications. We believe that your skill set, energy, and dedication will make an outstanding contribution to the continued success and growth of our organization.
                  </p>

                  {/* Terms & Compensation Table */}
                  <div className="my-4 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wider text-slate-700">
                      Summary of Terms &amp; Compensation
                    </div>
                    <table className="w-full text-xs text-left">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50 w-1/3">Designation / Role:</td>
                          <td className="px-3 py-2">{selectedEmployee.designation || 'Staff'}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Department:</td>
                          <td className="px-3 py-2">{selectedEmployee.department || 'General'}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Proposed Date of Joining:</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{formatDate(docConfig.joiningDate)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Work Location:</td>
                          <td className="px-3 py-2">{docConfig.workLocation}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Employment Type:</td>
                          <td className="px-3 py-2 font-medium">
                            {selectedEmployee.employee_type === 'FIXED' ? 'Regular Monthly Salaried' : 'Daily Wage Variable'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Gross Base Monthly Salary:</td>
                          <td className="px-3 py-2 font-bold text-purple-800 text-sm">{formatCurrency(monthlyBase)} / month</td>
                        </tr>
                        {selectedEmployee.employee_type === 'FIXED' && (
                          <tr className="border-b border-slate-200">
                            <td className="px-3 py-2 font-semibold bg-slate-50">Annual Cost to Company (CTC):</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{formatCurrency(annualCtc)} per annum</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3 py-2 font-semibold bg-slate-50">Probation Period:</td>
                          <td className="px-3 py-2">{docConfig.probationPeriod}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-slate-700">
                    Your appointment will be subject to satisfactory verification of your professional credentials, identity documents (Aadhaar, PAN), and background checks. A formal Appointment Letter containing detailed terms and conditions of employment will be issued to you upon your formal joining.
                  </p>

                  <p className="text-xs text-slate-700">
                    Kindly sign and return a duplicate copy of this letter as a token of your formal acceptance of this offer on or before{' '}
                    <strong>{formatDate(docConfig.joiningDate)}</strong>.
                  </p>

                  <p className="pt-2">
                    We look forward to welcoming you to the <strong>{companyName}</strong> family!
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 2. APPOINTMENT LETTER ────────────────── */}
              {activeDoc === 'appointment_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-base text-slate-900">{selectedEmployee.name}</p>
                    <p className="font-mono text-purple-700">Employee ID: {selectedEmployee.employee_id || 'EMP-TEMP'}</p>
                    {selectedEmployee.contactinfo && <p className="text-slate-600">Mobile: {selectedEmployee.contactinfo}</p>}
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Letter of Appointment
                    </h2>
                  </div>

                  <p>Dear <strong>{selectedEmployee.name}</strong>,</p>

                  <p>
                    Further to your acceptance of our offer, the management of <strong>{companyName}</strong> is pleased to confirm your appointment as{' '}
                    <strong>{selectedEmployee.designation || 'Executive'}</strong> in the{' '}
                    <strong>{selectedEmployee.department || 'Operations'}</strong> Department, effective from{' '}
                    <strong>{formatDate(docConfig.joiningDate)}</strong>.
                  </p>

                  <div className="space-y-3 text-xs text-slate-800">
                    <p className="font-bold text-sm text-slate-900 border-b pb-1">Terms and Conditions of Employment:</p>
                    
                    <p>
                      <strong>1. Remuneration &amp; Benefits:</strong> Your total monthly salary will be{' '}
                      <strong>{formatCurrency(monthlyBase)}</strong>, subject to statutory deductions (PF, ESIC, TDS if applicable) and attendance parameters as per company policy.
                    </p>

                    <p>
                      <strong>2. Probation &amp; Confirmation:</strong> You will be on probation for an initial period of{' '}
                      <strong>{docConfig.probationPeriod}</strong>. Upon satisfactory evaluation of your performance and conduct, your services will be confirmed in writing.
                    </p>

                    <p>
                      <strong>3. Working Hours &amp; Schedule:</strong> Your standard working hours will be{' '}
                      <strong>{docConfig.workHours}</strong>. You may be required to work additional hours or shifts depending on operational exigencies.
                    </p>

                    <p>
                      <strong>4. Roles &amp; Duties:</strong> You shall faithfully perform all duties and responsibilities assigned by management and abide by the standing orders, safety norms, and compliance guidelines of the company.
                    </p>

                    <p>
                      <strong>5. Confidentiality &amp; Non-Disclosure:</strong> You agree that all customer data, formulas, pricing, accounts, software, and trade secrets of {companyName} are strictly confidential and shall not be disclosed to any third party during or after your tenure.
                    </p>

                    <p>
                      <strong>6. Termination &amp; Notice Period:</strong> During probation, either party may terminate this employment by giving 15 days written notice. Post confirmation, the notice period shall be{' '}
                      <strong>{docConfig.noticePeriod}</strong> or salary in lieu thereof.
                    </p>
                  </div>

                  <p className="text-xs pt-2">
                    Please sign the duplicate copy of this letter as an endorsement of your acceptance of the terms outlined above.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 3. RELIEVING / EXPERIENCE CERTIFICATE ────────────────── */}
              {activeDoc === 'relieving_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-center my-6">
                    <h2 className="font-extrabold text-lg text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                      Relieving &amp; Experience Certificate
                    </h2>
                  </div>

                  <div className="text-xs text-right font-semibold text-slate-600">
                    Ref No: CERT/{selectedEmployee.employee_id || 'HR'}/{new Date().getFullYear()}
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    TO WHOMSOEVER IT MAY CONCERN
                  </div>

                  <p className="text-justify leading-7">
                    This is to formally certify that <strong>{selectedEmployee.name}</strong> (Employee ID:{' '}
                    <strong className="font-mono">{selectedEmployee.employee_id || 'N/A'}</strong>) was employed with{' '}
                    <strong>{companyName}</strong> from{' '}
                    <strong>{formatDate(selectedEmployee.doj || '2023-01-01')}</strong> to{' '}
                    <strong>{formatDate(docConfig.relievingDate)}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    At the time of leaving the services of the organization, they were designated as{' '}
                    <strong>{selectedEmployee.designation || 'Executive'}</strong> in the{' '}
                    <strong>{selectedEmployee.department || 'Operations'}</strong> Department.
                  </p>

                  <p className="text-justify leading-7">
                    During their tenure with us, we found them to be diligent, honest, hardworking, and dedicated to their duties. Their professional conduct and personal character were found to be{' '}
                    <strong>{docConfig.conductRating}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    {selectedEmployee.name} has been formally relieved from all responsibilities and company duties at the close of working hours on{' '}
                    <strong>{formatDate(docConfig.relievingDate)}</strong> following{' '}
                    {docConfig.relievingReason}. All company assets, tools, and dues have been properly cleared and accounted for.
                  </p>

                  <p className="pt-2">
                    We sincerely thank them for their contributions and wish them the very best in all their future endeavors and career pursuits.
                  </p>

                  <div className="pt-12">
                    {renderSignatory()}
                  </div>
                </div>
              )}

              {/* ────────────────── 4. SALARY CERTIFICATE ────────────────── */}
              {activeDoc === 'salary_certificate' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-center my-4">
                    <h2 className="font-extrabold text-lg text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                      Salary Certificate
                    </h2>
                  </div>

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-600">Issued To:</p>
                    <p className="font-bold text-sm text-slate-900">{docConfig.addressedTo}</p>
                  </div>

                  <p className="text-justify leading-7">
                    This is to certify that <strong>{selectedEmployee.name}</strong> (Employee Code:{' '}
                    <strong className="font-mono">{selectedEmployee.employee_id || 'N/A'}</strong>) is a bona fide employee of{' '}
                    <strong>{companyName}</strong>, working as{' '}
                    <strong>{selectedEmployee.designation || 'Staff'}</strong> in our{' '}
                    <strong>{selectedEmployee.department || 'Operations'}</strong> Department since{' '}
                    <strong>{formatDate(selectedEmployee.doj || '2023-01-01')}</strong>.
                  </p>

                  <p>
                    As per our official payroll and employment records, their current monthly compensation package is structured as follows:
                  </p>

                  {/* Salary Statement Table */}
                  <div className="my-3 border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase text-slate-700 flex justify-between">
                      <span>Salary Component</span>
                      <span>Monthly Amount (INR)</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">Basic Salary:</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.5)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">House Rent Allowance (HRA):</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.25)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">Special / Conveyance Allowance:</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.25)}</td>
                        </tr>
                        <tr className="bg-purple-50/60 font-bold border-t-2 border-purple-200">
                          <td className="px-4 py-2 text-purple-900">Total Gross Monthly Salary:</td>
                          <td className="px-4 py-2 font-mono text-purple-900 text-sm text-right">{formatCurrency(monthlyBase)}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-2 text-slate-800">Annual Gross Compensation (CTC):</td>
                          <td className="px-4 py-2 font-mono text-slate-900 text-sm text-right">{formatCurrency(annualCtc)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {selectedEmployee.bank_account_number && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">Bank Disbursement Account Details:</span>
                      <p>Bank: <strong>{selectedEmployee.bank_name || 'Designated Bank'}</strong> • A/C No: <strong className="font-mono">{selectedEmployee.bank_account_number}</strong> • IFSC: <strong className="font-mono">{selectedEmployee.bank_ifsc || '—'}</strong></p>
                    </div>
                  )}

                  <p className="text-xs text-slate-700 pt-2">
                    This certificate is issued at the specific request of the employee {docConfig.certificatePurpose}, without any financial liability or warranty on the part of the company or its signatories.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 5. EMPLOYEE ID CARD BADGE ────────────────── */}
              {activeDoc === 'id_card' && (
                <div className="space-y-6">
                  <div className="text-center pb-2 border-b">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
                      Printable Dual-Sided ID Badge (CR80 Standard / High Quality)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
                    
                    {/* FRONT SIDE */}
                    <div className="w-[280px] h-[440px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl bg-gradient-to-b from-white via-slate-50 to-purple-50/50 flex flex-col justify-between relative">
                      
                      {/* Top Lanyard Hole Visual */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 rounded-full bg-slate-200 border border-slate-300"></div>

                      {/* Header Ribbon */}
                      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white p-3 pt-6 text-center shadow">
                        <h3 className="font-black text-sm tracking-wider uppercase leading-tight">{companyName}</h3>
                        <p className="text-[9px] text-purple-200 uppercase tracking-widest font-semibold">Identity Card</p>
                      </div>

                      {/* Employee Photo */}
                      <div className="flex flex-col items-center px-4 -mt-2">
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
                          {selectedEmployee.employee_photo ? (
                            <img 
                              src={resolveMediaUrl(selectedEmployee.employee_photo)} 
                              alt={selectedEmployee.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-purple-100 text-purple-700 font-extrabold text-2xl flex items-center justify-center">
                              {selectedEmployee.name ? selectedEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                          )}
                        </div>

                        <h4 className="font-black text-base text-slate-900 mt-2 text-center leading-tight">{selectedEmployee.name}</h4>
                        <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">{selectedEmployee.designation || 'Staff'}</span>
                        <span className="text-[11px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full mt-1 border border-purple-200">
                          {selectedEmployee.employee_id || 'ID Pending'}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="px-5 py-2 text-[10px] space-y-1 text-slate-700">
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Department:</span>
                          <span className="font-bold text-slate-900">{selectedEmployee.department || 'Operations'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Blood Group:</span>
                          <span className="font-bold text-red-600">{docConfig.bloodGroup}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Joining Date:</span>
                          <span className="font-bold">{formatDate(selectedEmployee.doj || todayStr)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Valid Upto:</span>
                          <span className="font-bold">{formatDate(docConfig.validUpto)}</span>
                        </div>
                      </div>

                      {/* Bottom Visual Barcode Bar */}
                      <div className="bg-slate-900 text-white p-2 text-center">
                        <div className="font-mono text-[9px] tracking-[4px] uppercase text-slate-300">
                          * {selectedEmployee.employee_id || 'EMP-0001'} *
                        </div>
                      </div>
                    </div>

                    {/* BACK SIDE */}
                    <div className="w-[280px] h-[440px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl bg-white flex flex-col justify-between p-4 relative text-center">
                      
                      {/* Top Lanyard Hole Visual */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 rounded-full bg-slate-200 border border-slate-300"></div>

                      <div className="pt-4 space-y-1">
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase">{companyName}</h4>
                        <p className="text-[9px] text-slate-600 leading-tight px-2">{companyAddress}</p>
                        <p className="text-[9px] text-purple-700 font-semibold">Emergency: {docConfig.emergencyContact}</p>
                      </div>

                      {/* Terms */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[9px] text-slate-600 text-left space-y-1 leading-snug">
                        <p className="font-bold text-slate-900 uppercase">Instructions:</p>
                        <p>1. This card is property of {companyName} and must be displayed on duty.</p>
                        <p>2. If found, please return to the company registered office.</p>
                        <p>3. Non-transferable and must be surrendered upon separation.</p>
                      </div>

                      {/* Signature & Seal */}
                      <div className="border-t border-slate-200 pt-2 space-y-1">
                        <div className="h-10 flex items-center justify-center">
                          <span className="text-[10px] italic text-slate-400">[Authorized Signatory]</span>
                        </div>
                        <p className="font-bold text-[10px] text-slate-900">{docConfig.signatoryName}</p>
                        <p className="text-[9px] text-slate-500">{docConfig.signatoryDesignation}</p>
                      </div>

                      <div className="text-[8px] text-slate-400 font-mono">
                        System Generated • {companyEmail}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
