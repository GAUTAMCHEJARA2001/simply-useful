/**
 * HR LETTER CATALOGUE — Types and Definitions
 * Enterprise-grade HR document type definitions, categories, and metadata.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type HRLetterCategory =
  | 'A_Recruitment'
  | 'B_Appointment'
  | 'C_Attendance_Discipline'
  | 'D_Leave_Benefits'
  | 'E_Payroll'
  | 'F_Performance'
  | 'G_Grievance'
  | 'H_Policy'
  | 'I_Safety_Compliance'
  | 'J_Separation'
  | 'K_Certificates'
  | 'L_Manager_HR';

export type SignatoryRequirement = 'hr_only' | 'management' | 'director' | 'committee';
export type EmployeeAcknowledgment = 'required' | 'not_required' | 'optional';
export type DocumentSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface HRInputField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'multiline_list';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
}

export interface HRLetterSection {
  id: string;
  type: 'paragraph' | 'heading' | 'table_terms' | 'bullet_list' | 'numbered_list' | 'notice_box' | 'roles_duties' | 'salary_breakdown' | 'blank_lines';
  label?: string;
  content?: string;
  items?: string[];
  rows?: Array<{ label: string; value: string }>;
  severity?: 'info' | 'warning' | 'danger' | 'success';
  optional?: boolean;
}

export interface HRLetterDefinition {
  id: string;
  title: string;
  shortTitle: string;
  category: HRLetterCategory;
  subCategory?: string;
  purpose: string;
  audience: 'individual' | 'group' | 'department' | 'all_staff';
  specificFields: HRInputField[];
  employeeAcknowledgment: EmployeeAcknowledgment;
  acknowledgmentLabel?: string;
  signatoryRequirement: SignatoryRequirement;
  sensitivity: DocumentSensitivity;
  legalNotes?: string[];
  legalDisclaimer?: string;
  requiresApproval: boolean;
  bodyTemplate: HRLetterSection[];
  filePrefix: string;
  refCode: string;
  isBuiltIn: true;
}

export interface HRCategoryMeta {
  id: HRLetterCategory;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const HR_CATEGORY_META: HRCategoryMeta[] = [
  { id: 'A_Recruitment', label: 'Recruitment & Hiring', shortLabel: 'Recruitment', icon: 'UserPlus', color: 'blue', description: 'Offer letters, appointments, interview communications, joining documents' },
  { id: 'B_Appointment', label: 'Employment Administration', shortLabel: 'Employment', icon: 'FileText', color: 'purple', description: 'Promotions, transfers, salary revisions, confirmations, probation' },
  { id: 'C_Attendance_Discipline', label: 'Attendance & Discipline', shortLabel: 'Discipline', icon: 'AlertTriangle', color: 'orange', description: 'Warnings, show-cause notices, PIPs, disciplinary actions' },
  { id: 'D_Leave_Benefits', label: 'Leave & Benefits', shortLabel: 'Leave', icon: 'Calendar', color: 'teal', description: 'Leave approvals, rejections, maternity, benefits communication' },
  { id: 'E_Payroll', label: 'Payroll & Incentives', shortLabel: 'Payroll', icon: 'IndianRupee', color: 'green', description: 'Salary certificates, incentive schemes, payroll communications' },
  { id: 'F_Performance', label: 'Performance & Development', shortLabel: 'Performance', icon: 'Target', color: 'indigo', description: 'Appraisals, appreciation, training, PIP closures' },
  { id: 'G_Grievance', label: 'Grievance & Conduct', shortLabel: 'Grievance', icon: 'Shield', color: 'red', description: 'Grievance acknowledgments, investigations, workplace conduct' },
  { id: 'H_Policy', label: 'Policy & Communications', shortLabel: 'Policy', icon: 'BookOpen', color: 'slate', description: 'Policy circulars, holiday notices, policy acknowledgments' },
  { id: 'I_Safety_Compliance', label: 'Safety & Compliance', shortLabel: 'Safety', icon: 'ShieldCheck', color: 'amber', description: 'Safety notices, compliance communications, statutory HR' },
  { id: 'J_Separation', label: 'Separation & Exit', shortLabel: 'Exit', icon: 'LogOut', color: 'rose', description: 'Resignation acceptance, relieving, termination, retirement' },
  { id: 'K_Certificates', label: 'Certificates & Records', shortLabel: 'Certificates', icon: 'Award', color: 'emerald', description: 'Salary cert, experience cert, NOC, employment verification' },
  { id: 'L_Manager_HR', label: 'Manager & HR Actions', shortLabel: 'Manager', icon: 'Layers', color: 'violet', description: 'Manager communications, HR audit, manpower requisitions' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getCategoryMeta = (categoryId: HRLetterCategory): HRCategoryMeta | undefined =>
  HR_CATEGORY_META.find(m => m.id === categoryId);

export const requiresEmployeeAck = (def: HRLetterDefinition | undefined): boolean =>
  def ? def.employeeAcknowledgment === 'required' : true;

export const getAckLabel = (def: HRLetterDefinition | undefined): string =>
  def?.acknowledgmentLabel ?? 'Employee Acceptance';

export const isRestrictedLetter = (def: HRLetterDefinition | undefined): boolean =>
  def ? def.sensitivity === 'restricted' : false;

export const buildRefNumber = (letterId: string, refCode: string, employeeId: string, companyCode: string = 'KCPL'): string => {
  const year = new Date().getFullYear();
  const nextYear = String(year + 1).slice(-2);
  const empPart = (employeeId || 'REF').replace(/[^a-zA-Z0-9]/g, '');
  return `${companyCode}/HR/${refCode}/${year}-${nextYear}/${empPart}`;
};

export const buildTokenMap = (data: {
  employeeName?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  doj?: string;
  salary?: string;
  annualCtc?: string;
  workLocation?: string;
  workHours?: string;
  probationPeriod?: string;
  noticePeriod?: string;
  employeeId?: string;
  issueDate?: string;
  [key: string]: string | number | undefined;
}): Record<string, string> => {
  const base: Record<string, string> = {
    '{{employee_name}}': String(data.employeeName || 'Employee'),
    '{{designation}}': String(data.designation || 'Staff'),
    '{{department}}': String(data.department || 'Operations'),
    '{{company_name}}': String(data.companyName || 'The Company'),
    '{{doj}}': String(data.doj || '—'),
    '{{salary}}': String(data.salary || '—'),
    '{{annual_ctc}}': String(data.annualCtc || '—'),
    '{{work_location}}': String(data.workLocation || 'Head Office'),
    '{{work_hours}}': String(data.workHours || 'Standard Working Hours'),
    '{{probation_period}}': String(data.probationPeriod || '3 Months'),
    '{{notice_period}}': String(data.noticePeriod || '30 Days'),
    '{{employee_id}}': String(data.employeeId || 'REF'),
    '{{issue_date}}': String(data.issueDate || new Date().toLocaleDateString('en-IN')),
  };
  // Add all extra keys as snake_case tokens
  const skipKeys = new Set(['employeeName','designation','department','companyName','doj','salary','annualCtc','workLocation','workHours','probationPeriod','noticePeriod','employeeId','issueDate']);
  for (const [k, v] of Object.entries(data)) {
    if (!skipKeys.has(k)) {
      const snakeKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
      base[`{{${snakeKey}}}`] = String(v ?? '');
    }
  }
  return base;
};

export const applyTokens = (template: string, tokens: Record<string, string>): string => {
  if (!template) return '';
  let result = template;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'gi'), value);
  }
  return result;
};
