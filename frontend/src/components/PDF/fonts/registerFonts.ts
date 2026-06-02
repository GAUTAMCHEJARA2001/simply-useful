import { Font } from '@react-pdf/renderer';

let registered = false;

/** Registers standard corporate Inter weights for multilingual support */
export const registerPDFFonts = (): void => {
  if (registered) return;

  try {
    Font.register({
      family: 'Helvetica',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/helvetica-regular.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/helvetica-bold.ttf', fontWeight: 'bold' }
      ]
    });
    
    // Fallback registration
    registered = true;
  } catch (error) {
    console.warn('Custom font registration failed, falling back to standard pdfkit Helvetica:', error);
  }
};
