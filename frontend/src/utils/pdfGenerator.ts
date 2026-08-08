import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PartyOnboardingRequest } from '@/types';
import { format } from 'date-fns';

export const generateDealerFormPDF = async (request: PartyOnboardingRequest) => {
  // Load the flattened template from the public folder
  const url = '/dealer_form_final.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Embed the font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // We are guessing coordinates here (Option A) based on a typical A4 PDF.
  // The user will need to adjust these coordinates based on the actual visual layout.
  // Origin (0,0) is bottom-left of the page. Y increases upwards.
  // Page height is usually ~841 for A4.

  const drawField = (text: string, x: number, y: number, size = 11) => {
    if (!text) return;
    firstPage.drawText(text, {
      x,
      y,
      size,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  };

  // Example mappings (User will need to fine-tune these x,y coordinates)
  drawField(request.partyName, 100, 750); // Firm Name
  drawField(request.contactPerson, 100, 720); // Contact Person
  drawField(request.address, 100, 690); // Address
  drawField(request.cityOrArea, 100, 660); // City
  drawField(request.phone, 350, 660); // Phone
  drawField(request.email || '', 100, 630); // Email
  drawField(request.gstNumber || '', 350, 630); // GST

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Trigger the browser to download the PDF document
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Dealer_Form_${request.partyName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateChequeSubmissionPDF = async (request: PartyOnboardingRequest) => {
  const url = '/cheque_submission_request.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const drawField = (text: string, x: number, y: number, size = 11) => {
    if (!text) return;
    firstPage.drawText(text, {
      x,
      y,
      size,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  };

  // Guessed coordinates
  drawField(request.partyName, 100, 700);
  drawField(format(new Date(), 'dd/MM/yyyy'), 450, 700);
  drawField(request.cityOrArea, 100, 670);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Cheque_Submission_${request.partyName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
