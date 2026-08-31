import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface RTGSData {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  amount: number;
  companyName?: string;
  companyAccount?: string;
  companyBank?: string;
  companyIfsc?: string;
}

export const generateRTGSSlip = async (data: RTGSData) => {
  try {
    // 1. Fetch the PDF template from the public folder
    const url = '/rtgs-neft-request.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    // 2. Load a PDFDocument from the existing PDF bytes
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // 3. Keep only the first page if there are multiple pages
    const pageCount = pdfDoc.getPageCount();
    for (let i = pageCount - 1; i > 0; i--) {
      pdfDoc.removePage(i);
    }

    // 4. Get the first page
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    
    // Embed the standard font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;
    const color = rgb(0, 0, 0);

    // 5. Draw text fields onto the PDF
    // IMPORTANT: These X, Y coordinates are estimated. 
    // In pdf-lib, (0,0) is the BOTTOM-LEFT corner of the page.
    
    // Example format: Y decreases as you go down the page from the top.
    // If standard A4 height is ~841 (at 72 dpi) and width is ~595

    // Helper to draw text
    const draw = (text: string | undefined, x: number, y: number) => {
      if (!text) return;
      page.drawText(text, { x, y, size: fontSize, font, color });
    };

    // --- ESTIMATED COORDINATES (adjust these after first test print) ---
    // The following coordinates have been shifted based on a typical RTGS form:
    
    // Top section: Date / Amount
    draw(new Date().toLocaleDateString('en-IN'), 400, height - 120); // Date
    draw(data.amount.toFixed(2), 250, height - 205); // Amount in figures
    
    // Applicant Details Section (Company)
    draw(data.companyName, 200, height - 250); // Applicant Name
    draw(data.companyAccount, 200, height - 275); // Applicant Account No
    draw(data.companyBank, 200, height - 300); // Applicant Bank Name
    draw(data.companyIfsc, 200, height - 325); // Applicant IFSC Code

    // Beneficiary Details Section (Employee)
    draw(data.beneficiaryName, 200, height - 420); // Beneficiary Name
    draw(data.bankName, 200, height - 445); // Bank Name
    draw(data.ifscCode, 200, height - 470); // IFSC Code
    draw(data.accountNumber, 200, height - 495); // Account No
    draw(data.accountNumber, 200, height - 520); // Confirm Account No

    // 6. Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // 7. Trigger the browser to download the PDF document
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RTGS_${data.beneficiaryName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error generating RTGS PDF:', error);
    throw new Error('Failed to generate RTGS PDF. Ensure the template exists at public/rtgs-neft-request.pdf');
  }
};
