import { PDFDocument } from 'pdf-lib';
import { amountToWords } from '@/components/PDF/utils/amountToWords';

export interface RTGSData {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  amount: number;
  date?: string;
  companyName?: string;
  companyAccount?: string;
  companyBank?: string;
  companyBranch?: string;
  companyIfsc?: string;
  companyAddress?: string;
  companyPan?: string;
  companyPhone?: string;
  branch?: string;
  beneficiaryBranch?: string;
  narration?: string;
  mobile?: string;
  bankTemplate?: string;
}

const setTextFieldSafely = (form: any, fieldName: string, value: string | undefined | null) => {
  if (value === undefined || value === null || value === '') return;
  try {
    const field = form.getTextField(fieldName);
    if (field) {
      let strVal = String(value);
      try {
        const maxLen = field.getMaxLength();
        if (maxLen !== undefined && maxLen > 0 && strVal.length > maxLen) {
          strVal = strVal.slice(0, maxLen);
        }
      } catch (e) {}
      field.setText(strVal);
    }
  } catch (err) {
    // Silently continue if field name not in this specific bank form
  }
};

const setCheckboxSafely = (form: any, fieldName: string) => {
  try {
    const field = form.getCheckBox(fieldName);
    if (field) {
      field.check();
    }
  } catch (err) {
    // Silently continue if checkbox not found
  }
};

/**
 * Automatically populates the real bank-compliant fillable RTGS / NEFT form
 * (Default: Axis Bank Real Fillable Form) exactly matching real bank submission formats.
 */
export const generateRTGSSlip = async (data: RTGSData) => {
  try {
    const templateName = data.bankTemplate || '02_AXIS_Real_RTGS_Fillable.pdf';
    let url = `/rtgs-templates/${templateName}`;

    let response = await fetch(url);
    if (!response.ok) {
      // Fallback to default request form
      response = await fetch('/rtgs-neft-request.pdf');
    }

    if (!response.ok) {
      throw new Error(`Failed to load RTGS template form: ${response.statusText}`);
    }

    const existingPdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // 1. Format date as 8-digit DDMMYYYY (e.g., 21092026) required by bank form fields
    let rawDate = data.date || new Date().toISOString().slice(0, 10);
    let dateFormatted = '';
    if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts[0].length === 4) {
        dateFormatted = `${parts[2].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[0]}`;
      }
    } else {
      dateFormatted = rawDate.replace(/[^0-9]/g, '').slice(0, 8);
    }
    if (!dateFormatted || dateFormatted.length < 8) {
      const now = new Date();
      dateFormatted = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    }

    // 2. Format Amount and Words
    const plainAmount = Math.round(data.amount || 0).toString();
    const words = amountToWords(data.amount || 0);
    const formattedWords = (words.toLowerCase().endsWith('only') ? words : `${words} only`).replace(/\s+/g, ' ');

    // 3. Remitter (Applicant / Employer) Details
    const companyBranch = data.companyBranch || data.branch || 'LUNSIKUI, NAVSARI';
    setTextFieldSafely(form, 'branch', companyBranch);
    setTextFieldSafely(form, 'date', dateFormatted);
    setTextFieldSafely(form, 't1', plainAmount);
    setTextFieldSafely(form, 'amount in words', formattedWords);
    setTextFieldSafely(form, 'ac-name', data.companyAccount || '925030009706188');
    setTextFieldSafely(form, 'rmit-name', (data.companyName || 'KAMLA CONCHEM PVT.LTD').toUpperCase());
    setTextFieldSafely(form, 'address', (data.companyAddress || 'BLOCK NO:183BHATTAI NAVSARI').toUpperCase());
    setTextFieldSafely(form, 'PAN No', data.companyPan || 'AALCK3507C');

    const phone = (data.mobile || data.companyPhone || '8866322700').replace(/[^0-9]/g, '').slice(-10);
    setTextFieldSafely(form, 'MobileOther Number-0', phone);

    // 4. Beneficiary (Employee / Payee) Details
    setTextFieldSafely(form, 'ben-name', (data.beneficiaryName || '').toUpperCase());
    setTextFieldSafely(form, 'Beneficiary Account Number', (data.accountNumber || '').trim());
    setTextFieldSafely(form, 'Reconfirm Account Number', (data.accountNumber || '').trim());
    setTextFieldSafely(form, 'Beneficiary Bank Name', (data.bankName || '').toUpperCase());
    setTextFieldSafely(form, 'Beneficiary Bank IFSC Code', (data.ifscCode || '').toUpperCase().trim());
    setTextFieldSafely(form, 'ben-br', (data.beneficiaryBranch || data.branch || 'NAVSARI').toUpperCase());
    setTextFieldSafely(form, 'sender to rec', (data.narration || `SALARY ${rawDate}`).toUpperCase());

    // 5. Select Radio Button for Individual/Entity
    try {
      const radio = form.getRadioGroup('RadioButton');
      if (radio) {
        const opts = radio.getOptions();
        if (opts && opts.length > 0) radio.select(opts[0]);
      }
    } catch (e) {}

    // 6. Check debit authorization if present
    setCheckboxSafely(form, 'Debit my  our account Cheque is enclosed Please en');

    // 7. Serialize and trigger browser download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeName = (data.beneficiaryName || 'Beneficiary').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `RTGS_${safeName}_${dateFormatted}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    console.error('Error generating fillable RTGS PDF:', error);
    throw new Error(error.message || 'Failed to populate fillable RTGS PDF.');
  }
};

/**
 * Compiles multiple RTGS slips into a single, merged multi-page PDF document.
 * Each slip is flattened so field names do not conflict across pages.
 */
export const generateCombinedBulkRTGSPdf = async (items: RTGSData[], filename?: string) => {
  if (!items || items.length === 0) return;

  const mergedDoc = await PDFDocument.create();
  const templateName = items[0]?.bankTemplate || '02_AXIS_Real_RTGS_Fillable.pdf';
  let url = `/rtgs-templates/${templateName}`;

  let response = await fetch(url);
  if (!response.ok) {
    response = await fetch('/rtgs-neft-request.pdf');
  }
  if (!response.ok) {
    throw new Error(`Failed to load RTGS template form: ${response.statusText}`);
  }
  const templateBytes = await response.arrayBuffer();

  for (const data of items) {
    const singleDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = singleDoc.getForm();

    // 1. Format date as 8-digit DDMMYYYY
    let rawDate = data.date || new Date().toISOString().slice(0, 10);
    let dateFormatted = '';
    if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts[0].length === 4) {
        dateFormatted = `${parts[2].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[0]}`;
      }
    } else {
      dateFormatted = rawDate.replace(/[^0-9]/g, '').slice(0, 8);
    }
    if (!dateFormatted || dateFormatted.length < 8) {
      const now = new Date();
      dateFormatted = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    }

    const plainAmount = Math.round(data.amount || 0).toString();
    const words = amountToWords(data.amount || 0);
    const formattedWords = (words.toLowerCase().endsWith('only') ? words : `${words} only`).replace(/\s+/g, ' ');

    const companyBranch = data.companyBranch || data.branch || 'LUNSIKUI, NAVSARI';
    setTextFieldSafely(form, 'branch', companyBranch);
    setTextFieldSafely(form, 'date', dateFormatted);
    setTextFieldSafely(form, 't1', plainAmount);
    setTextFieldSafely(form, 'amount in words', formattedWords);
    setTextFieldSafely(form, 'ac-name', data.companyAccount || '925030009706188');
    setTextFieldSafely(form, 'rmit-name', (data.companyName || 'KAMLA CONCHEM PVT.LTD').toUpperCase());
    setTextFieldSafely(form, 'address', (data.companyAddress || 'BLOCK NO:183BHATTAI NAVSARI').toUpperCase());
    setTextFieldSafely(form, 'PAN No', data.companyPan || 'AALCK3507C');

    const phone = (data.mobile || data.companyPhone || '8866322700').replace(/[^0-9]/g, '').slice(-10);
    setTextFieldSafely(form, 'MobileOther Number-0', phone);

    // Beneficiary Details
    setTextFieldSafely(form, 'ben-name', (data.beneficiaryName || '').toUpperCase());
    setTextFieldSafely(form, 'Beneficiary Account Number', (data.accountNumber || '').trim());
    setTextFieldSafely(form, 'Reconfirm Account Number', (data.accountNumber || '').trim());
    setTextFieldSafely(form, 'Beneficiary Bank Name', (data.bankName || '').toUpperCase());
    setTextFieldSafely(form, 'Beneficiary Bank IFSC Code', (data.ifscCode || '').toUpperCase().trim());
    setTextFieldSafely(form, 'ben-br', (data.beneficiaryBranch || data.branch || 'NAVSARI').toUpperCase());
    setTextFieldSafely(form, 'sender to rec', (data.narration || `RTGS ${rawDate}`).toUpperCase());

    try {
      const radio = form.getRadioGroup('RadioButton');
      if (radio) {
        const opts = radio.getOptions();
        if (opts && opts.length > 0) radio.select(opts[0]);
      }
    } catch (e) {}

    setCheckboxSafely(form, 'Debit my  our account Cheque is enclosed Please en');

    // Flatten form so fields on this page become permanent vector text
    try {
      form.flatten();
    } catch (e) {}

    // Copy page into merged document
    const copiedPages = await mergedDoc.copyPages(singleDoc, singleDoc.getPageIndices());
    copiedPages.forEach(p => mergedDoc.addPage(p));
  }

  const mergedBytes = await mergedDoc.save();
  const blob = new Blob([mergedBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `Axis_Bank_Bulk_RTGS_${items.length}_Slips_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
