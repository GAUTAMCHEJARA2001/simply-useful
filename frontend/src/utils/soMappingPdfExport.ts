import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveFileWithDialog } from '@/utils/fileDownload';

export interface SoMappingPdfRow {
  id: string;
  code: string;
  name: string;
  type: 'dealer' | 'distributor';
  city: string;
  territory: string;
  brand: string;
  phone: string;
  contactPerson: string;
  address: string;
  gst: string;
  currentSoEmails: string[];
}

export interface SoMappingPdfExportOptions {
  rows: SoMappingPdfRow[];
  filterType: string;
  filterSo: string;
  filterBrand: string;
  search: string;
  userName?: string;
  userRole?: string;
  soName: (email: string) => string;
}

/**
 * Generates an executive, high-resolution Landscape A4 PDF Territory Dossier
 * using native vector typography and jspdf-autotable.
 * Includes complete party details, registered address, and assigned Sales Officers.
 */
export async function generateSoMappingPdf(options: SoMappingPdfExportOptions): Promise<{ doc: jsPDF; filename: string; blob: Blob }> {
  const {
    rows,
    filterType,
    filterSo,
    filterBrand,
    search,
    userName = 'Admin',
    userRole = 'SUPERADMIN',
    soName
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // 1. Executive Top Header Banner (Deep Navy)
  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(10, 8, pageWidth - 20, 16, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SIMPLY USEFUL ENTERPRISE — SO TERRITORY ALLOCATION DOSSIER', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text('Official Channel Partner Mapping, Regional Coverage & Sales Officer Allocation Directory', 14, 20);

  // Issuer & Audit Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFIDENTIAL / SYSTEM AUDIT', pageWidth - 14, 15, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Exported: ${dateStr} ${timeStr} · Issuer: ${userName} (${userRole})`, pageWidth - 14, 20, { align: 'right' });

  // 2. Executive KPI Summary Strip
  const totalParties = rows.length;
  const dealerCount = rows.filter(r => r.type === 'dealer').length;
  const distCount = rows.filter(r => r.type === 'distributor').length;
  const assignedCount = rows.filter(r => r.currentSoEmails.length > 0).length;
  const unassignedCount = rows.filter(r => r.currentSoEmails.length === 0).length;

  const kpiY = 26;
  const kpis = [
    { label: 'TOTAL PARTIES', val: totalParties, color: [241, 245, 249], border: [203, 213, 225], text: [15, 23, 42] },
    { label: 'DEALERS', val: dealerCount, color: [224, 242, 254], border: [186, 230, 253], text: [3, 105, 161] },
    { label: 'DISTRIBUTORS', val: distCount, color: [224, 231, 255], border: [199, 210, 254], text: [67, 56, 202] },
    { label: 'SO ASSIGNED', val: assignedCount, color: [220, 252, 231], border: [187, 247, 208], text: [21, 128, 61] },
    { label: 'UNASSIGNED', val: unassignedCount, color: [255, 228, 230], border: [254, 205, 211], text: [190, 18, 60] }
  ];

  const kpiGap = 3;
  const kpiW = (pageWidth - 20 - (4 * kpiGap)) / 5;
  kpis.forEach((k, idx) => {
    const x = 10 + idx * (kpiW + kpiGap);
    doc.setFillColor(k.color[0], k.color[1], k.color[2]);
    doc.setDrawColor(k.border[0], k.border[1], k.border[2]);
    doc.roundedRect(x, kpiY, kpiW, 11, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(k.text[0], k.text[1], k.text[2]);
    doc.text(k.label, x + 3.5, kpiY + 4);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(String(k.val), x + 3.5, kpiY + 9.5);
  });

  // 3. Active Filter Scope Strip
  const filterY = 39;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, filterY, pageWidth - 20, 6, 'FD');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  const typeText = filterType === 'all' ? 'All (Dealers & Distributors)' : filterType.toUpperCase() + 'S';
  const soText = filterSo === 'all' ? 'All Sales Officers' : soName(filterSo);
  const brandText = filterBrand === 'all' ? 'All Brands' : filterBrand;
  const searchPart = search ? `  |  Search: "${search}"` : '';
  doc.text(`ACTIVE SCOPE:  Type: ${typeText}  |  SO: ${soText}  |  Brand: ${brandText}${searchPart}  |  Records: ${totalParties}`, 13, filterY + 4.2);

  // 4. Data Rows Preparation
  const bodyData = rows.map((r, idx) => {
    const sNo = idx + 1;
    const partyInfo = `${r.name}\n${r.code}${r.contactPerson && r.contactPerson !== '—' ? ` · ${r.contactPerson}` : ''}`;
    const typeBadge = r.type.toUpperCase();
    const address = r.address && r.address !== '—' ? r.address : 'No registered address';
    const geo = `${r.city}${r.territory && r.territory !== '—' ? `\n${r.territory}` : ''}`;
    const phone = r.phone;
    const brand = r.brand;
    const gst = r.gst;
    
    const assignedOfficers = r.currentSoEmails.map(soName);
    const soDisplay = assignedOfficers.length > 0 
      ? assignedOfficers.map(name => `• ${name}`).join('\n')
      : '× Unassigned';

    return [sNo, partyInfo, typeBadge, address, geo, phone, brand, gst, soDisplay];
  });

  // 5. Render AutoTable with Landscape A4 layout
  autoTable(doc, {
    startY: 47,
    margin: { left: 10, right: 10, top: 16, bottom: 12 },
    head: [[
      '#',
      'Party Name & Code',
      'Type',
      'Registered Address',
      'City & Territory',
      'Phone / Mobile',
      'Brand',
      'GSTIN',
      'Assigned Sales Officer(s)'
    ]],
    body: bodyData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 1.8,
      valign: 'top',
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 44, fontStyle: 'bold' },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 68 }, // REGISTERED ADDRESS - clean wrap
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 28, font: 'courier' },
      8: { cellWidth: 46 }
    },
    didParseCell: (dataHook) => {
      // Style unassigned SO cell in rose/red
      if (dataHook.section === 'body' && dataHook.column.index === 8) {
        if (dataHook.cell.raw === '× Unassigned') {
          dataHook.cell.styles.textColor = [225, 29, 72]; // Rose 600
          dataHook.cell.styles.fontStyle = 'bold';
        } else {
          dataHook.cell.styles.textColor = [6, 95, 70]; // Emerald 800
        }
      }
      // Style Type column
      if (dataHook.section === 'body' && dataHook.column.index === 2) {
        if (dataHook.cell.raw === 'DEALER') {
          dataHook.cell.styles.textColor = [3, 105, 161]; // Sky 700
        } else {
          dataHook.cell.styles.textColor = [67, 56, 202]; // Indigo 700
        }
      }
    },
    didDrawPage: (dataHook) => {
      // Footer rule & text
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setDrawColor(203, 213, 225);
      doc.line(10, pageHeight - 8, pageWidth - 10, pageHeight - 8);

      doc.text('Simply Useful Enterprise · SO Territory Allocation Dossier · Confidential & Proprietary', 10, pageHeight - 4.5);
    }
  });

  // 6. Running total page count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 32, pageHeight - 7.5, 22, 5, 'F');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 10, pageHeight - 4.5, { align: 'right' });
  }

  const activeFilterDesc = [
    filterType !== 'all' ? filterType : '',
    filterBrand !== 'all' ? filterBrand : '',
    filterSo !== 'all' ? soName(filterSo).replace(/\s+/g, '_') : ''
  ].filter(Boolean).join('_');

  const filename = `SO_Territory_Dossier_${activeFilterDesc ? activeFilterDesc + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });

  return { doc, filename, blob };
}

/**
 * Convenience helper to generate and trigger the native file download
 */
export async function downloadSoMappingPdf(options: SoMappingPdfExportOptions): Promise<string> {
  const { filename, blob } = await generateSoMappingPdf(options);
  await saveFileWithDialog(
    blob,
    filename,
    'application/pdf',
    'pdf',
    'PDF Document (*.pdf)'
  );
  return filename;
}
