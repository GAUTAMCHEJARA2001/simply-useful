/** Safely formats dates into standard printable ERP outputs */
export const formatPDFDate = (dateStr?: string | Date): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  
  // Return in DD/MM/YYYY format
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Get the current system telemetry timestamp */
export const getPDFTimestamp = (): string => {
  const now = new Date();
  const dateFormatted = formatPDFDate(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${dateFormatted} ${hours}:${minutes} IST`;
};
