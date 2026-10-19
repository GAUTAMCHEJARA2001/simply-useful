export type DocumentType = 
  | 'offer_letter' 
  | 'appointment_letter' 
  | 'sales_incentive_letter' 
  | 'relieving_letter' 
  | 'salary_certificate' 
  | 'id_card' 
  | 'notice_letter';

export type TemplateCategory = 
  | 'Accounts' 
  | 'Stock' 
  | 'Receptionist' 
  | 'Sales' 
  | 'Production' 
  | 'HR' 
  | 'General'
  | 'Notices';

export type NoticeSeverity = 
  | 'Warning' 
  | 'Show Cause' 
  | 'PIP' 
  | 'Misconduct' 
  | 'Termination' 
  | 'Memo';

export interface IncentiveTier {
  id: string;
  tierName: string;
  achievementRange: string;
  incentiveRate: string;
  bonusAmount?: string;
  description: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  docType: DocumentType;
  description: string;
  isBuiltIn?: boolean;
  createdAt?: string;

  // Roles & Responsibilities
  rolesAndDuties?: string[];
  customClause?: string;

  // Specific to Sales Incentive Letter
  salesTargetAmount?: number;
  salesTargetUnit?: string;
  incentiveTiers?: IncentiveTier[];
  collectionDaysLimit?: number;
  travelAllowancePerKm?: number;
  dailyAllowance?: number;
  payoutDayOfMonth?: number;
  salesConditions?: string[];

  // Specific to Notice Letter
  noticeSeverity?: NoticeSeverity;
  noticeSubject?: string;
  noticeBody?: string;
  explanationDeadlineHours?: number;

  // Common Employment Terms
  probationPeriod?: string;
  noticePeriod?: string;
  workHours?: string;
  workLocation?: string;
}

export const BUILTIN_TEMPLATES: DocumentTemplate[] = [
  // ──────────────────────────────────────────
  // 1. ACCOUNTS CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_acc_appointment',
    name: 'Senior Accountant / Accounts Executive Appointment',
    category: 'Accounts',
    docType: 'appointment_letter',
    description: 'Complete appointment terms with ledger audit, GST, TDS, BRS, and financial confidentiality clauses',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:30 AM – 6:30 PM (Monday to Saturday)',
    workLocation: 'Head Office - Accounts Department',
    rolesAndDuties: [
      'Maintain day-to-day double-entry bookkeeping, ledger entries, and voucher verification in ERP / Tally.',
      'Prepare monthly Bank Reconciliation Statements (BRS) for all corporate accounts on or before the 5th of each month.',
      'Scrutinize vendor bills, verify against Goods Receipt Notes (GRN) and Purchase Orders before payment recommendation.',
      'Assist in filing statutory returns including GSTR-1, GSTR-3B, TDS deductions, and monthly PF / ESIC remittances.',
      'Manage petty cash register, maintain daily cash balance book, and ensure zero variance at shift close.',
      'Cooperate with internal and external auditors, providing trial balance schedules and asset depreciation registers.'
    ],
    customClause: 'Financial Non-Disclosure & Integrity: You shall maintain absolute confidentiality regarding corporate balance sheets, profit margins, bank transactions, and dealer financial ledgers. Any unauthorized financial commitments or irregularities will invite immediate termination and legal recourse.'
  },
  {
    id: 'builtin_acc_offer',
    name: 'Accounts Executive / Billing Clerk Offer',
    category: 'Accounts',
    docType: 'offer_letter',
    description: 'Employment offer for accounting staff with reconciliation and invoice handling duties',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:30 AM – 6:30 PM (Monday to Saturday)',
    workLocation: 'Accounts & Finance Department',
    rolesAndDuties: [
      'Accurate tax invoicing for dispatch orders adhering strictly to GST rates and HSN/SAC codes.',
      'Reconciliation of customer payment receipts (NEFT, RTGS, Cheques, Cash) against open invoices.',
      'Monthly party ledger confirmation and dispatch of statements of accounts to distributors.'
    ],
    customClause: 'All company financial records, tax credentials, and banking portal keys entrusted to you are strictly confidential.'
  },

  // ──────────────────────────────────────────
  // 2. STOCK & WAREHOUSE CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_stock_appointment',
    name: 'Warehouse In-Charge / Store Keeper Appointment',
    category: 'Stock',
    docType: 'appointment_letter',
    description: 'Custody of materials, physical cycle count, GRN verification, FIFO rotation, and damage liability terms',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '8:30 AM – 5:30 PM (Plant / Depot Operations)',
    workLocation: 'Central Warehouse Depot',
    rolesAndDuties: [
      'Assume sole physical custody and accountability for all raw materials, packaging inventory, and finished stock.',
      'Verify inward material deliveries against Purchase Orders and Delivery Challans, recording accurate GRN entries.',
      'Enforce First-In, First-Out (FIFO) material issuance and systematically inspect batch numbers and shelf-life.',
      'Conduct weekly physical cycle audits and reconcile physical stock with the ERP Stock Ledger without variance.',
      'Supervise order picking and dispatch loading against verified sales orders, ensuring vehicle e-way bill compliance.',
      'Implement warehouse 5S housekeeping, safe stack heights, fire safety protocols, and pest control guidelines.'
    ],
    customClause: 'Inventory Custody & Material Damage Liability: As the authorized custodian of company inventory, you are directly accountable for stock security. Any unexplained inventory shortages, missing stock, or damages due to negligence will be investigated and may result in financial recovery and disciplinary action.'
  },
  {
    id: 'builtin_stock_offer',
    name: 'Store Keeper / Dispatch Clerk Offer',
    category: 'Stock',
    docType: 'offer_letter',
    description: 'Offer letter for warehouse dispatch personnel with stock upkeep and bin card management',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:00 PM (Monday to Saturday)',
    workLocation: 'Main Depot / Storage Facility',
    rolesAndDuties: [
      'Daily update of bin cards and real-time inventory ledger entries for inward and outward stock.',
      'Physical inspection of incoming goods for transit damage or packing defects prior to storage placement.',
      'Maintaining dispatch gate pass logs and coordinating transport loading with authorized vehicle drivers.'
    ],
    customClause: 'Physical safety norms, including protective footwear and warehouse handling rules, must be observed at all times.'
  },

  // ──────────────────────────────────────────
  // 3. RECEPTIONIST & FRONT DESK CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_reception_appointment',
    name: 'Front Desk Receptionist & Admin Executive Appointment',
    category: 'Receptionist',
    docType: 'appointment_letter',
    description: 'Guest relations, visitor logbooks, PBX call routing, mail handling, and corporate decorum standards',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:00 PM (Monday to Saturday)',
    workLocation: 'Corporate Reception & Front Office',
    rolesAndDuties: [
      'Warmly welcome, receive, and assist visiting clients, corporate guests, vendors, and job candidates.',
      'Maintain the digital Visitor Logbook, issue visitor passes, and notify respective department heads immediately.',
      'Manage the central EPABX telephone switchboard, routing calls courteously and taking clear message logs.',
      'Coordinate inward and outward courier consignments, registered post, and vendor hand deliveries with POD records.',
      'Oversee executive boardroom and conference room bookings, maintaining immaculate front lounge cleanliness.',
      'Monitor office stationery levels, executive pantry stock, and coordinate basic administrative requisitions.'
    ],
    customClause: 'Corporate Decorum & Punctuality: As the primary ambassador representing {{company_name}}, you are expected to maintain exemplary punctuality, professional corporate business attire, polite telephone etiquette, and strict discretion regarding visiting clients and internal meetings.'
  },
  {
    id: 'builtin_reception_offer',
    name: 'Receptionist & Office Assistant Offer',
    category: 'Receptionist',
    docType: 'offer_letter',
    description: 'Offer letter for front desk coordinator with customer hospitality and communications duties',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:00 PM (Monday to Saturday)',
    workLocation: 'Corporate Reception Desk',
    rolesAndDuties: [
      'Managing front desk hospitality and greeting visitors professionally.',
      'Operating the telephone switchboard and managing courier logistics.',
      'Assisting the HR department with interview coordination and candidate welcome.'
    ],
    customClause: 'You shall maintain professional front office etiquette and uphold the corporate image of the company.'
  },

  // ──────────────────────────────────────────
  // 4. SALES & FIELD INCENTIVE CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_sales_incentive_standard',
    name: 'Standard Field Sales Incentive & Commission Scheme',
    category: 'Sales',
    docType: 'sales_incentive_letter',
    description: 'Official monthly target policy with tiered commission slabs, collection realization criteria, and TA/DA allowance',
    isBuiltIn: true,
    salesTargetAmount: 500000,
    salesTargetUnit: 'Monthly Net Sales Turnover (INR)',
    collectionDaysLimit: 30,
    travelAllowancePerKm: 3.5,
    dailyAllowance: 250,
    payoutDayOfMonth: 10,
    incentiveTiers: [
      {
        id: 'tier_1',
        tierName: 'Tier 1 (Base Target Achiever)',
        achievementRange: '80% – 100% of Monthly Target',
        incentiveRate: '1.50% on Total Net Realized Sales',
        bonusAmount: '₹2,500 Flat Milestone Bonus',
        description: 'Applicable upon achieving the minimum monthly qualifying threshold.'
      },
      {
        id: 'tier_2',
        tierName: 'Tier 2 (Star Performer)',
        achievementRange: '101% – 120% of Monthly Target',
        incentiveRate: '2.50% on Net Realized Sales Value',
        bonusAmount: '₹5,000 Milestone Bonus',
        description: 'For exceeding sales targets with strong secondary liquidation.'
      },
      {
        id: 'tier_3',
        tierName: 'Tier 3 (Super Achiever & Champion)',
        achievementRange: '> 120% of Monthly Target',
        incentiveRate: '4.00% on Incremental Turnover',
        bonusAmount: '₹10,000 Bonus + Quarterly Trophy',
        description: 'Top-tier performance with eligibility for the annual executive trip reward.'
      }
    ],
    salesConditions: [
      'Payment Realization Clause: Incentive calculations are strictly based on realized payments collected from dealers within approved credit terms (maximum 30 days). Uncleared or overdue payments will not qualify.',
      'Sales Returns Deduction: Any goods returned from the market or credited adjustments will be deducted from the respective month\'s qualifying sales turnover.',
      'Daily Reporting Requirement: Eligibility for incentive payout requires consistent daily GPS visit check-ins (minimum 8-10 dealers/day) and odometer log submissions in the mobile ERP app.',
      'Disbursement Schedule: Incentives will be computed at the close of the calendar month and disbursed on or before the 10th of the following month along with regular monthly remuneration.'
    ],
    customClause: 'Management Discretion: The incentive policy is an operational performance recognition scheme and does not constitute a permanent component of fixed salary. Management reserves the right to amend targets and territory allocations.'
  },
  {
    id: 'builtin_sales_officer_appointment',
    name: 'Field Sales Officer (SO / ASM) Appointment',
    category: 'Sales',
    docType: 'appointment_letter',
    description: 'Appointment terms for territory sales officers covering beat mapping, dealer onboarding, and collections',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:00 AM – 6:30 PM (Field Beat Schedule)',
    workLocation: 'Designated Sales Territory & Beats',
    rolesAndDuties: [
      'Execute structured weekly Beat Plan covering retail dealers, stockists, and prospective commercial counters.',
      'Achieve assigned monthly sales volume and turnover targets across all product lines (Cement, Chemicals, Admixtures).',
      'Onboard new retail partners, verify dealer KYC documents, and establish sustainable retail replenishment.',
      'Actively monitor outstanding dealer accounts, ensuring payment collections are realized within approved credit terms.',
      'Log daily field customer visits, dealer stock status, GPS check-ins, and odometer travel logs via the mobile app.'
    ],
    customClause: 'Market Integrity & Territory Bounds: You shall operate strictly within your assigned beat territory. No unauthorized price discounts, credit extensions, or cash withholding will be tolerated.'
  },

  // ──────────────────────────────────────────
  // 5. PRODUCTION & PLANT CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_prod_supervisor_appointment',
    name: 'Production Supervisor / Plant Executive Appointment',
    category: 'Production',
    docType: 'appointment_letter',
    description: 'Plant floor terms covering daily output, BOM recipe compliance, QC checks, safety PPE, and machine logs',
    isBuiltIn: true,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '8:00 AM – 5:00 PM (Rotational Shift Schedule)',
    workLocation: 'Manufacturing Plant Facility',
    rolesAndDuties: [
      'Supervise daily factory line output to meet planned manufacturing work orders and dispatch schedules.',
      'Strictly enforce verified Bill of Materials (BOM) formulas, chemical dosing ratios, and mixing cycle times.',
      'Conduct rigorous quality control checks (viscosity, specific gravity, color matching, and seal testing).',
      'Oversee floor labour muster roll, track machine operational hours, and minimize raw material wastage.',
      'Enforce mandatory Personal Protective Equipment (PPE) compliance including helmets, safety boots, and masks.',
      'Perform daily pre-operation machine inspections and report maintenance requirements immediately.'
    ],
    customClause: 'Industrial Safety & Quality Non-Negotiable: Adherence to factory safety protocols and standard chemical recipes is mandatory. Willful bypassing of safety guards or recipe alteration will result in immediate termination.'
  },

  // ──────────────────────────────────────────
  // 6. NOTICES & DISCIPLINARY CATEGORY
  // ──────────────────────────────────────────
  {
    id: 'builtin_notice_late_coming',
    name: 'Warning Notice: Repeated Late Coming & Attendance Irregularity',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Formal warning issued for unpunctuality, shift delays, and unauthorized late arrivals',
    isBuiltIn: true,
    noticeSeverity: 'Warning',
    noticeSubject: 'Formal Warning: Habitual Late Coming and Disregard of Shift Timings',
    explanationDeadlineHours: 24,
    noticeBody: `It has been observed from our biometric attendance records that you have arrived significantly late for your designated work shifts on multiple occasions during the current month without prior written approval or valid justification.

Your reporting hours are {{work_hours}}. Repeated unpunctuality disrupts department operations, delays team handovers, and violates the company's code of conduct.

You are hereby formally cautioned to strictly adhere to the designated working hours with immediate effect. Please be advised that any further late arrivals may result in loss of pay, forfeiture of allowances, and formal disciplinary proceedings.`
  },
  {
    id: 'builtin_notice_absenteeism',
    name: 'Show Cause Notice: Continuous Unauthorized Absence Without Leave',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Notice demanding written explanation for unapproved leave and continuous absence',
    isBuiltIn: true,
    noticeSeverity: 'Show Cause',
    noticeSubject: 'Show Cause Notice: Continuous Unauthorized Absence from Duty Without Prior Intimation',
    explanationDeadlineHours: 48,
    noticeBody: `You have remained absent from your duties without submitting any leave application or obtaining prior written permission from your reporting authority.

Furthermore, repeated attempts by the HR department to contact you via telephone and email have gone unanswered. Your continuous absence without intimation is a serious breach of company discipline and standing employment regulations.

You are hereby called upon to report to the HR Department within 48 hours of receipt of this notice and submit a written explanation showing cause why your absence should not be treated as abandonment of employment and disciplinary action should not be initiated against you.`
  },
  {
    id: 'builtin_notice_pip',
    name: 'Performance Improvement Plan (PIP) Notice',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Official 30-Day PIP notice with specific milestone expectations and review schedule',
    isBuiltIn: true,
    noticeSeverity: 'PIP',
    noticeSubject: 'Official Notice: Placement on 30-Day Performance Improvement Plan (PIP)',
    explanationDeadlineHours: 48,
    noticeBody: `Following comprehensive evaluations of your work output and key performance metrics (KPIs), management has observed that your performance has consistently fallen below the expected standards for the role of {{designation}} in the {{department}} Department.

In order to provide structured support and an opportunity to meet organization standards, you are hereby placed on a formal 30-Day Performance Improvement Plan (PIP) effective from {{issue_date}}.

During this period:
1. You will be assigned specific daily/weekly milestone targets agreed upon with your reporting supervisor.
2. Formal weekly progress review meetings will be conducted to assess quality and output.
3. You will receive necessary operational guidance and coaching.

Please note that satisfactory completion of this PIP is mandatory. If your performance does not meet the required benchmark by the conclusion of the 30-day period, the company reserves the right to terminate your employment.`
  },
  {
    id: 'builtin_notice_misconduct',
    name: 'Disciplinary Notice: Breach of Code of Conduct & Insubordination',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Notice addressing insubordination, policy violations, or improper conduct in the workplace',
    isBuiltIn: true,
    noticeSeverity: 'Misconduct',
    noticeSubject: 'Disciplinary Notice: Insubordination and Violation of Company Code of Conduct',
    explanationDeadlineHours: 24,
    noticeBody: `A formal complaint has been filed against you regarding serious misconduct, including willful insubordination, refusal to carry out lawful instructions from your reporting supervisor, and breach of workplace decorum.

Such behavior violates the core ethics, values, and standing orders of {{company_name}} and cannot be tolerated in our professional environment.

You are hereby directed to provide a comprehensive written explanation regarding this incident to the undersigned within 24 hours of receiving this notice. Pending your response and an inquiry into the matter, management reserves the right to take appropriate disciplinary measures, including suspension or termination.`
  },
  {
    id: 'builtin_notice_safety',
    name: 'Safety Violation Notice: Non-Compliance with Plant Safety Norms',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Notice for violation of industrial safety protocols, failure to wear PPE, or unsafe work practices',
    isBuiltIn: true,
    noticeSeverity: 'Warning',
    noticeSubject: 'Safety Notice: Violation of Mandatory Plant Safety and PPE Regulations',
    explanationDeadlineHours: 24,
    noticeBody: `During plant floor safety inspections, you were found operating within active machinery and chemical handling zones without wearing mandatory Personal Protective Equipment (PPE), specifically safety goggles/helmets/gloves.

{{company_name}} maintains a zero-tolerance policy regarding industrial safety. Working without prescribed protective gear poses a severe hazard to your physical well-being and the safety of your colleagues.

You are hereby strictly warned to comply with all safety protocols and PPE requirements at all times during your shifts. Any future safety violation will be treated as gross misconduct and will lead to immediate suspension.`
  },
  {
    id: 'builtin_notice_termination_warning',
    name: 'Final Warning Before Termination of Employment',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Last chance warning notice issued prior to final separation for ongoing infractions',
    isBuiltIn: true,
    noticeSeverity: 'Termination',
    noticeSubject: 'Final Warning Notice: Last Opportunity for Corrective Action Prior to Separation',
    explanationDeadlineHours: 48,
    noticeBody: `Despite previous written warnings, counseling sessions, and multiple opportunities provided to you, management notes with deep regret that there has been no satisfactory improvement in your attendance / performance / professional conduct.

This letter serves as your FINAL WARNING. You are given a final grace period of 7 days from the receipt of this letter to demonstrate full compliance with organization standards.

Please understand that if your performance and conduct fail to meet the required standards within this period, your services with {{company_name}} will be terminated forthwith without any further notice or consideration.`
  },
  {
    id: 'builtin_notice_memo',
    name: 'Official Workplace Policy Memo / Circular',
    category: 'Notices',
    docType: 'notice_letter',
    description: 'Official administrative memo detailing operational guidelines, policy updates, and decorum',
    isBuiltIn: true,
    noticeSeverity: 'Memo',
    noticeSubject: 'Office Memorandum: Strict Adherence to Workplace Guidelines and Asset Usage',
    explanationDeadlineHours: 48,
    noticeBody: `This memorandum is issued to remind all personnel of company policy concerning workplace decorum, resource utilization, and operational procedures.

All employees are required to ensure strict compliance with working schedules, proper documentation of daily activities, and careful handling of company equipment and digital assets.

Your continued cooperation in upholding the highest professional standards of {{company_name}} is greatly appreciated.`
  }
];

// Helper: Get local storage key scoped to company schema
export const getTemplateStorageKey = (schemaName?: string) => {
  return `hr_custom_letter_templates_${schemaName || 'default'}`;
};

// Helper: Load all templates (built-in + custom from localStorage)
export const loadAllTemplates = (schemaName?: string): DocumentTemplate[] => {
  try {
    const raw = localStorage.getItem(getTemplateStorageKey(schemaName));
    const customList: DocumentTemplate[] = raw ? JSON.parse(raw) : [];
    return [...BUILTIN_TEMPLATES, ...customList];
  } catch {
    return BUILTIN_TEMPLATES;
  }
};

// Helper: Save a new or edited template
export const saveCustomTemplate = (template: DocumentTemplate, schemaName?: string): DocumentTemplate[] => {
  try {
    const key = getTemplateStorageKey(schemaName);
    const raw = localStorage.getItem(key);
    let customList: DocumentTemplate[] = raw ? JSON.parse(raw) : [];

    const existingIndex = customList.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      customList[existingIndex] = { ...template, isBuiltIn: false };
    } else {
      customList.push({
        ...template,
        id: template.id || `custom_${Date.now()}`,
        isBuiltIn: false,
        createdAt: new Date().toISOString()
      });
    }

    localStorage.setItem(key, JSON.stringify(customList));
    return [...BUILTIN_TEMPLATES, ...customList];
  } catch (err) {
    console.error('Failed to save custom template:', err);
    return BUILTIN_TEMPLATES;
  }
};

// Helper: Delete a custom template
export const deleteCustomTemplate = (templateId: string, schemaName?: string): DocumentTemplate[] => {
  try {
    const key = getTemplateStorageKey(schemaName);
    const raw = localStorage.getItem(key);
    let customList: DocumentTemplate[] = raw ? JSON.parse(raw) : [];
    customList = customList.filter(t => t.id !== templateId);
    localStorage.setItem(key, JSON.stringify(customList));
    return [...BUILTIN_TEMPLATES, ...customList];
  } catch (err) {
    console.error('Failed to delete template:', err);
    return BUILTIN_TEMPLATES;
  }
};

// Helper: Replace dynamic template placeholders with actual employee and company values
export const substitutePlaceholders = (
  text: string, 
  data: {
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
  }
): string => {
  if (!text) return '';
  return text
    .replace(/\{\{employee_name\}\}/gi, data.employeeName || 'Employee / Candidate')
    .replace(/\{\{designation\}\}/gi, data.designation || 'Staff')
    .replace(/\{\{department\}\}/gi, data.department || 'Operations')
    .replace(/\{\{company_name\}\}/gi, data.companyName || 'The Company')
    .replace(/\{\{doj\}\}/gi, data.doj || 'Joining Date')
    .replace(/\{\{salary\}\}/gi, data.salary || 'Salary')
    .replace(/\{\{annual_ctc\}\}/gi, data.annualCtc || 'Annual CTC')
    .replace(/\{\{work_location\}\}/gi, data.workLocation || 'Head Office')
    .replace(/\{\{work_hours\}\}/gi, data.workHours || 'Standard Working Hours')
    .replace(/\{\{probation_period\}\}/gi, data.probationPeriod || '3 Months')
    .replace(/\{\{notice_period\}\}/gi, data.noticePeriod || '30 Days')
    .replace(/\{\{employee_id\}\}/gi, data.employeeId || 'REF')
    .replace(/\{\{issue_date\}\}/gi, data.issueDate || new Date().toLocaleDateString('en-IN'));
};
