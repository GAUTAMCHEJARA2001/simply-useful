const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function inspectPDF(path) {
  try {
    const pdfBytes = fs.readFileSync(path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`--- Inspecting ${path} ---`);
    if (fields.length === 0) {
      console.log('No form fields found.');
    } else {
      console.log('Fields found:');
      fields.forEach(field => {
        const type = field.constructor.name;
        const name = field.getName();
        console.log(`- ${name} (${type})`);
      });
    }
  } catch (error) {
    console.error('Error inspecting PDF:', error.message);
  }
}

async function run() {
  await inspectPDF('./public/dealer_form_final.pdf');
  await inspectPDF('./public/cheque_submission_request.pdf');
}

run();
