import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PromotionData {
  employeeName: string;
  action: 'Promotion' | 'Demotion';
  oldType: string;
  newType: string;
  oldSalary: number;
  newSalary: number;
  oldWage: number;
  newWage: number;
  reason: string;
  companyName: string;
  effectiveDate: string;
}

export const generatePromotionLetter = async (data: PromotionData) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let y = height - 80;
    
    // Header
    page.drawText(data.companyName, { x: 50, y, size: 24, font: boldFont, color: rgb(0, 0.2, 0.5) });
    y -= 40;
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
    
    y -= 40;
    
    // Date & Subject
    page.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, { x: 50, y, size: 12, font });
    y -= 30;
    
    const subject = `Subject: Official Notice of ${data.action}`;
    page.drawText(subject, { x: 50, y, size: 14, font: boldFont });
    y -= 40;
    
    // Salutation
    page.drawText(`Dear ${data.employeeName},`, { x: 50, y, size: 12, font });
    y -= 30;
    
    // Body Text
    const isPromo = data.action === 'Promotion';
    const body1 = `This letter serves as official notice of your ${data.action.toLowerCase()}, effective as of ${data.effectiveDate}.`;
    const body2 = isPromo 
      ? `We recognize and appreciate your hard work and dedication to the company.`
      : `This decision has been made after careful consideration of your recent performance and company needs.`;
    
    page.drawText(body1, { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText(body2, { x: 50, y, size: 12, font });
    y -= 40;
    
    // Changes Summary
    page.drawText('Salary & Wage Adjustments:', { x: 50, y, size: 12, font: boldFont });
    y -= 25;
    
    const drawRow = (label: string, oldVal: string, newVal: string) => {
      page.drawText(label, { x: 70, y, size: 11, font });
      page.drawText(`Previous: ${oldVal}`, { x: 200, y, size: 11, font });
      page.drawText(`New: ${newVal}`, { x: 350, y, size: 11, font: boldFont });
      y -= 20;
    };
    
    if (data.oldType !== data.newType) {
      drawRow('Employment Type', data.oldType, data.newType);
    }
    
    if (data.newType === 'FIXED' || data.oldType === 'FIXED') {
      drawRow('Monthly Salary', `₹${data.oldSalary}`, `₹${data.newSalary}`);
    }
    
    if (data.newType === 'VARIABLE' || data.oldType === 'VARIABLE') {
      drawRow('Daily Wage', `₹${data.oldWage}`, `₹${data.newWage}`);
    }
    
    y -= 20;
    
    if (data.reason) {
      page.drawText('Additional Remarks:', { x: 50, y, size: 12, font: boldFont });
      y -= 20;
      page.drawText(data.reason, { x: 70, y, size: 11, font });
      y -= 40;
    }
    
    // Signatures
    y -= 40;
    page.drawText('Sincerely,', { x: 50, y, size: 12, font });
    y -= 40;
    page.drawText('________________________', { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText('Human Resources', { x: 50, y, size: 12, font: boldFont });
    page.drawText(data.companyName, { x: 50, y: y - 15, size: 11, font });
    
    const pdfBytes = await pdfDoc.save();
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.action}_Letter_${data.employeeName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error(`Error generating ${data.action} PDF:`, error);
    throw new Error(`Failed to generate ${data.action} letter`);
  }
};
