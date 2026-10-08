import React, { useState, useRef } from 'react';
import { 
  X, Printer, Download, FileText, Award, CreditCard, 
  Calendar, CheckCircle, Copy, RefreshCw, Eye, Sparkles, Building2,
  Briefcase, ShieldCheck, Mail, Phone, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';

interface EmployeeDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export type DocumentType = 'offer_letter' | 'appointment_letter' | 'relieving_letter' | 'salary_certificate' | 'id_card';

export const EmployeeDocumentsModal: React.FC<EmployeeDocumentsModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const { settings } = useData();
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [activeDoc, setActiveDoc] = useState<DocumentType>('offer_letter');
  const [isGenerating, setIsGenerating] = useState(false);

  // Company details fallback
  const companyName = settings?.company_name || 'KAMLA INDUSTRIES';
  const companyAddress = settings?.company_address || 'Phase-1, Industrial Area, Rajasthan, India';
  const companyEmail = settings?.company_email || 'office@kamlaerl.com';
  const companyPhone = settings?.company_phone || '+91 98765 43210';
  const companyGst = settings?.company_gst || '08ABCDE1234F1Z5';
  const companyLogo = settings?.company_logo || '';

  const todayStr = new Date().toISOString().split('T')[0];

  // Configurable fields state per document
  const [docConfig, setDocConfig] = useState({
    // Common
    issueDate: todayStr,
    signatoryName: 'Authorized Signatory',
    signatoryDesignation: 'Head of Human Resources',
    // Offer / Appointment
    joiningDate: employee?.doj || todayStr,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:00 PM (Monday to Saturday)',
    workLocation: 'Plant / Head Office',
    // Relieving / Experience
    relievingDate: todayStr,
    conductRating: 'Satisfactory and Exemplary',
    relievingReason: 'Personal career progression',
    // Salary Certificate
    addressedTo: 'To Whom It May Concern',
    certificatePurpose: 'for Official Verification / Financial Application',
    includeAllowances: true,
    // ID Card
    bloodGroup: 'B+',
    emergencyContact: employee?.contactinfo || '+91 98765 43210',
    validUpto: `${new Date().getFullYear() + 3}-12-31`,
  });

  if (!isOpen || !employee) return null;

  const resolveMediaUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const monthlyBase = Number(employee.base_salary_monthly || employee.dailywage * 26 || 0);
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
    if (!printContainerRef.current) return;
    setIsGenerating(true);
    try {
      const docNameMapping: Record<DocumentType, string> = {
        offer_letter: 'Offer_Letter',
        appointment_letter: 'Appointment_Letter',
        relieving_letter: 'Experience_Certificate',
        salary_certificate: 'Salary_Certificate',
        id_card: 'Employee_ID_Card',
      };

      const filename = `${docNameMapping[activeDoc]}_${employee.name.replace(/\s+/g, '_')}_${employee.employee_id || 'EMP'}.pdf`;

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
    if (!printContainerRef.current) return;
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
          <title>${employee.name} - ${activeDoc.toUpperCase()}</title>
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
    <div className="border-b-2 border-primary/30 pb-4 mb-6 flex items-start justify-between">
      <div className="flex items-center gap-3">
        {companyLogo ? (
          <img src={resolveMediaUrl(companyLogo)} alt={companyName} className="h-14 w-auto object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center text-xl tracking-wider">
            {companyName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground uppercase">{companyName}</h1>
          <p className="text-xs text-muted-foreground max-w-md">{companyAddress}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
            {companyEmail && <span>Email: {companyEmail}</span>}
            {companyPhone && <span>• Tel: {companyPhone}</span>}
            {companyGst && <span>• GSTIN: {companyGst}</span>}
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Ref Date</span>
        <span className="text-xs font-bold text-foreground">{formatDate(docConfig.issueDate)}</span>
      </div>
    </div>
  );

  // Render Signatory Section
  const renderSignatory = () => (
    <div className="pt-10 mt-6 border-t border-border/40 grid grid-cols-2 gap-8 text-xs">
      <div>
        <p className="text-muted-foreground mb-1">For &amp; on behalf of</p>
        <p className="font-bold text-foreground">{companyName}</p>
        <div className="h-16 flex items-end">
          <div className="border-b border-foreground/30 w-44 pb-1">
            <span className="text-[10px] italic text-muted-foreground block">[Authorized Signature &amp; Stamp]</span>
          </div>
        </div>
        <p className="font-semibold text-foreground mt-1">{docConfig.signatoryName}</p>
        <p className="text-muted-foreground text-[11px]">{docConfig.signatoryDesignation}</p>
      </div>

      <div className="text-right flex flex-col justify-end items-end">
        <p className="text-muted-foreground mb-1">Employee Acceptance / Acknowledgement</p>
        <p className="font-bold text-foreground">{employee.name}</p>
        <div className="h-16 flex items-end">
          <div className="border-b border-foreground/30 w-44 pb-1 text-right">
            <span className="text-[10px] italic text-muted-foreground block">[Signature of Employee]</span>
          </div>
        </div>
        <p className="text-muted-foreground text-[11px] mt-1">Date: ____________________</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-5">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Official HR Documents &amp; Letters</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-semibold border border-purple-500/20">
                  {employee.name} ({employee.employee_id || 'ID Pending'})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Generate, customize, print and download official HR employment certificates and ID cards</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyText} className="text-xs gap-1.5 h-8">
              <Copy className="w-3.5 h-3.5" /> Copy Text
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs gap-1.5 h-8">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="text-xs gap-1.5 h-8 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="flex overflow-x-auto px-6 py-2 border-b border-border bg-muted/30 gap-2 shrink-0 scrollbar-hide">
          <button
            onClick={() => setActiveDoc('offer_letter')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeDoc === 'offer_letter'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> 1. Offer Letter
          </button>
          <button
            onClick={() => setActiveDoc('appointment_letter')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeDoc === 'appointment_letter'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 2. Appointment Letter
          </button>
          <button
            onClick={() => setActiveDoc('relieving_letter')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeDoc === 'relieving_letter'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> 3. Experience / Relieving Certificate
          </button>
          <button
            onClick={() => setActiveDoc('salary_certificate')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeDoc === 'salary_certificate'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> 4. Salary Certificate
          </button>
          <button
            onClick={() => setActiveDoc('id_card')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeDoc === 'id_card'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 5. Employee ID Card
          </button>
        </div>

        {/* Modal Main Split: Left Configuration Form & Right Live Document Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT: Configuration Panel (3.5 cols) */}
          <div className="lg:col-span-4 border-r border-border p-4 overflow-y-auto bg-muted/10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Document Settings
              </h3>
              <span className="text-[10px] text-muted-foreground">Updates live in preview</span>
            </div>

            {/* Common Inputs */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Issue Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                  value={docConfig.issueDate}
                  onChange={(e) => setDocConfig({ ...docConfig, issueDate: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Authorized Signatory Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                  value={docConfig.signatoryName}
                  onChange={(e) => setDocConfig({ ...docConfig, signatoryName: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Signatory Title</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                  value={docConfig.signatoryDesignation}
                  onChange={(e) => setDocConfig({ ...docConfig, signatoryDesignation: e.target.value })}
                />
              </div>
            </div>

            {/* Document-Specific Inputs */}
            {activeDoc === 'offer_letter' && (
              <div className="space-y-3 pt-3 border-t border-border">
                <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Offer Terms</span>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Joining Deadline Date</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.joiningDate}
                    onChange={(e) => setDocConfig({ ...docConfig, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Probation Period</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.probationPeriod}
                    onChange={(e) => setDocConfig({ ...docConfig, probationPeriod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Work Location</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
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
                  <label className="font-semibold block mb-1 text-muted-foreground">Effective Date of Joining</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.joiningDate}
                    onChange={(e) => setDocConfig({ ...docConfig, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Probation Period</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.probationPeriod}
                    onChange={(e) => setDocConfig({ ...docConfig, probationPeriod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Notice Period on Resignation</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.noticePeriod}
                    onChange={(e) => setDocConfig({ ...docConfig, noticePeriod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Work Hours Schedule</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.workHours}
                    onChange={(e) => setDocConfig({ ...docConfig, workHours: e.target.value })}
                  />
                </div>
              </div>
            )}

            {activeDoc === 'relieving_letter' && (
              <div className="space-y-3 pt-3 border-t border-border">
                <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Experience &amp; Relieving</span>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Last Working Date</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.relievingDate}
                    onChange={(e) => setDocConfig({ ...docConfig, relievingDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Conduct Statement</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.conductRating}
                    onChange={(e) => setDocConfig({ ...docConfig, conductRating: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Reason for Relieving</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.relievingReason}
                    onChange={(e) => setDocConfig({ ...docConfig, relievingReason: e.target.value })}
                  />
                </div>
              </div>
            )}

            {activeDoc === 'salary_certificate' && (
              <div className="space-y-3 pt-3 border-t border-border">
                <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Salary Certificate</span>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Addressed To (Recipient)</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    placeholder="e.g. To Whom It May Concern / The Manager, HDFC Bank"
                    value={docConfig.addressedTo}
                    onChange={(e) => setDocConfig({ ...docConfig, addressedTo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Certificate Purpose</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
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
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
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
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.emergencyContact}
                    onChange={(e) => setDocConfig({ ...docConfig, emergencyContact: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Valid Till</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                    value={docConfig.validUpto}
                    onChange={(e) => setDocConfig({ ...docConfig, validUpto: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Quick Employee Info card */}
            <div className="pt-3 border-t border-border space-y-1.5 text-muted-foreground text-[11px]">
              <span className="font-bold text-foreground block">Employee Snapshot:</span>
              <p>Designation: <strong className="text-foreground">{employee.designation || 'Staff'}</strong></p>
              <p>Department: <strong className="text-foreground">{employee.department || 'Operations'}</strong></p>
              <p>Pay Type: <strong className="text-foreground">{employee.employee_type}</strong></p>
              <p>Base Compensation: <strong className="text-foreground">{formatCurrency(monthlyBase)}/mo</strong></p>
            </div>
          </div>

          {/* RIGHT: Live High-Resolution Document Canvas (8.5 cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto bg-muted/30 flex justify-center items-start">
            
            {/* The Document Sheet */}
            <div 
              ref={printContainerRef}
              className={`bg-white text-slate-900 shadow-2xl rounded-sm font-sans transition-all w-full ${
                activeDoc === 'id_card' ? 'max-w-xl p-6' : 'max-w-[780px] p-8 sm:p-12 min-h-[960px]'
              }`}
              style={{ color: '#0f172a' }}
            >

              {/* ────────────────── 1. OFFER LETTER ────────────────── */}
              {activeDoc === 'offer_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold">To,</p>
                    <p className="font-bold text-base text-slate-900">{employee.name}</p>
                    {employee.contactinfo && <p className="text-slate-600">Mobile: {employee.contactinfo}</p>}
                    {employee.aadhar_number && <p className="text-slate-600">Aadhaar Ref: {employee.aadhar_number}</p>}
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Letter of Offer of Employment
                    </h2>
                  </div>

                  <p>Dear <strong>{employee.name}</strong>,</p>

                  <p>
                    We are pleased to extend an offer of employment with <strong>{companyName}</strong> for the position of{' '}
                    <strong>{employee.designation || 'Team Associate'}</strong> in our{' '}
                    <strong>{employee.department || 'Operations'}</strong> Department.
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
                          <td className="px-3 py-2">{employee.designation || 'Staff'}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Department:</td>
                          <td className="px-3 py-2">{employee.department || 'General'}</td>
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
                            {employee.employee_type === 'FIXED' ? 'Regular Monthly Salaried' : 'Daily Wage Variable'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Gross Base Monthly Salary:</td>
                          <td className="px-3 py-2 font-bold text-purple-800 text-sm">{formatCurrency(monthlyBase)} / month</td>
                        </tr>
                        {employee.employee_type === 'FIXED' && (
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
                    <p className="font-semibold">To,</p>
                    <p className="font-bold text-base text-slate-900">{employee.name}</p>
                    <p className="font-mono text-purple-700">Employee ID: {employee.employee_id || 'EMP-TEMP'}</p>
                    {employee.contactinfo && <p className="text-slate-600">Mobile: {employee.contactinfo}</p>}
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Letter of Appointment
                    </h2>
                  </div>

                  <p>Dear <strong>{employee.name}</strong>,</p>

                  <p>
                    Further to your acceptance of our offer, the management of <strong>{companyName}</strong> is pleased to confirm your appointment as{' '}
                    <strong>{employee.designation || 'Executive'}</strong> in the{' '}
                    <strong>{employee.department || 'Operations'}</strong> Department, effective from{' '}
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
                    Ref No: CERT/{employee.employee_id || 'HR'}/{new Date().getFullYear()}
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    TO WHOMSOEVER IT MAY CONCERN
                  </div>

                  <p className="text-justify leading-7">
                    This is to formally certify that <strong>{employee.name}</strong> (Employee ID:{' '}
                    <strong className="font-mono">{employee.employee_id || 'N/A'}</strong>) was employed with{' '}
                    <strong>{companyName}</strong> from{' '}
                    <strong>{formatDate(employee.doj || '2023-01-01')}</strong> to{' '}
                    <strong>{formatDate(docConfig.relievingDate)}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    At the time of leaving the services of the organization, they were designated as{' '}
                    <strong>{employee.designation || 'Executive'}</strong> in the{' '}
                    <strong>{employee.department || 'Operations'}</strong> Department.
                  </p>

                  <p className="text-justify leading-7">
                    During their tenure with us, we found them to be diligent, honest, hardworking, and dedicated to their duties. Their professional conduct and personal character were found to be{' '}
                    <strong>{docConfig.conductRating}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    {employee.name} has been formally relieved from all responsibilities and company duties at the close of working hours on{' '}
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
                    This is to certify that <strong>{employee.name}</strong> (Employee Code:{' '}
                    <strong className="font-mono">{employee.employee_id || 'N/A'}</strong>) is a bona fide employee of{' '}
                    <strong>{companyName}</strong>, working as{' '}
                    <strong>{employee.designation || 'Staff'}</strong> in our{' '}
                    <strong>{employee.department || 'Operations'}</strong> Department since{' '}
                    <strong>{formatDate(employee.doj || '2023-01-01')}</strong>.
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

                  {employee.bank_account_number && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">Bank Disbursement Account Details:</span>
                      <p>Bank: <strong>{employee.bank_name || 'Designated Bank'}</strong> • A/C No: <strong className="font-mono">{employee.bank_account_number}</strong> • IFSC: <strong className="font-mono">{employee.bank_ifsc || '—'}</strong></p>
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
                          {employee.employee_photo ? (
                            <img 
                              src={resolveMediaUrl(employee.employee_photo)} 
                              alt={employee.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-purple-100 text-purple-700 font-extrabold text-2xl flex items-center justify-center">
                              {employee.name ? employee.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                          )}
                        </div>

                        <h4 className="font-black text-base text-slate-900 mt-2 text-center leading-tight">{employee.name}</h4>
                        <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">{employee.designation || 'Staff'}</span>
                        <span className="text-[11px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full mt-1 border border-purple-200">
                          {employee.employee_id || 'ID Pending'}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="px-5 py-2 text-[10px] space-y-1 text-slate-700">
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Department:</span>
                          <span className="font-bold text-slate-900">{employee.department || 'Operations'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Blood Group:</span>
                          <span className="font-bold text-red-600">{docConfig.bloodGroup}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Joining Date:</span>
                          <span className="font-bold">{formatDate(employee.doj || todayStr)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Valid Upto:</span>
                          <span className="font-bold">{formatDate(docConfig.validUpto)}</span>
                        </div>
                      </div>

                      {/* Bottom Visual Barcode Bar */}
                      <div className="bg-slate-900 text-white p-2 text-center">
                        <div className="font-mono text-[9px] tracking-[4px] uppercase text-slate-300">
                          * {employee.employee_id || 'EMP-0001'} *
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
          </div>
        </div>

      </div>
    </div>
  );
};
