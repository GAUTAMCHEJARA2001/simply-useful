import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface RTGSData {
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  amount: number;
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
    const draw = (text: string, x: number, y: number) => {
      if (!text) return;
      page.drawText(text, { x, y, size: fontSize, font, color });
    };

    // --- ESTIMATED COORDINATES (adjust these after first test print) ---
    // Top section: Branch / Date / Amount
    draw(new Date().toLocaleDateString('en-IN'), 400, height - 120); // Date
    draw(data.amount.toFixed(2), 200, height - 190); // Amount in figures
    
    // Beneficiary Details Section
    draw(data.beneficiaryName, 200, height - 280); // Beneficiary Name
    draw(data.bankName, 200, height - 310); // Bank Name
    draw(data.ifscCode, 200, height - 340); // IFSC Code
    draw(data.accountNumber, 200, height - 370); // Account No
    draw(data.accountNumber, 200, height - 400); // Confirm Account No

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
