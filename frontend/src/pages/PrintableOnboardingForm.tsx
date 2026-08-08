import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PartyOnboardingRequest } from '@/types';
import { onboardingService } from '@/api/services/onboarding.service';
import { format } from 'date-fns';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';

import html2pdf from 'html2pdf.js';

const PrintableOnboardingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useData();
  const [request, setRequest] = useState<PartyOnboardingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await onboardingService.getAll();
        const found = data.find((r: PartyOnboardingRequest) => r.id === id);
        if (found) setRequest(found);
      } catch (error) {
        console.error('Failed to fetch request', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  const handleDownload = () => {
    setIsDownloading(true);
    const element = document.getElementById('printable-form-container') as HTMLElement;
    const opt: any = {
      margin:       10,
      filename:     `Application_Form_${request?.partyName || 'Download'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: 'css', before: '.break-after-page' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-4">Request Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const ex = request.extendedData || {};

  const blankInline = (val: string | undefined | null, length: number) => (
    <span className="inline-block border-b border-black border-dotted leading-none text-center font-semibold" style={{ minWidth: `${length}px` }}>
      {val || <>&nbsp;</>}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white text-black font-serif">
      {/* Controls */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => { if (window.history.length > 1) navigate(-1); else window.close(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={handleDownload} disabled={isDownloading} className="bg-primary text-white">
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} 
          {isDownloading ? 'Generating PDF...' : 'Download PDF Form'}
        </Button>
      </div>

      <div id="printable-form-container">

      {/* PAGE 1: DEALERSHIP APPLICATION FORM */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:p-8 text-[13px] leading-relaxed relative border print:border-0 mb-8 print:mb-0">
        
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
            {settings.company_logo && <img src={settings.company_logo} alt="Company Logo" className="h-20 object-contain" />}
            <div>
              <h1 className="text-3xl font-bold text-primary uppercase tracking-wider">{settings.company_name || 'ETAC ENTERPRISE'}</h1>
            </div>
          </div>
          
          <div className="bg-primary/10 border-y-2 border-primary py-3 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-primary-dark tracking-widest">DEALERSHIP APPLICATION FORM</h2>
          </div>
          
          <div className="flex justify-between font-semibold text-gray-700 px-4">
            <div>Application Form No: <span className="text-black">{blankInline(request.id?.slice(0, 8), 100)}</span></div>
            <div>Code: {blankInline('', 150)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>A. Name of the Applicant: {blankInline(request.contactPerson, 450)}</div>
          <div>1. Name of the Firm/Shop: {blankInline(request.partyName, 450)}</div>
          <div>2. Address of the Firm/Shop: {blankInline(request.address + ", " + request.cityOrArea, 450)}</div>
          <div className="flex gap-4">
            <span>3. Phone No. (With STD code): {blankInline(request.phone, 150)}</span>
            <span>Mobile No: {blankInline(request.phone, 150)}</span>
          </div>
          <div className="flex gap-4">
            <span>Fax No. : {blankInline(ex.faxNo, 150)}</span>
            <span>E-mail: {blankInline(request.email, 250)}</span>
          </div>
          
          <div className="mt-6 border border-primary/20 bg-gray-50/50 p-4 rounded-lg">
            <p className="font-bold mb-3 text-primary-dark border-b border-primary/10 pb-1">Details of Bank A/c. :</p>
            <p>Name and address of Bank: {blankInline(ex.bankName, 450)}</p>
            <p className="mt-2">Type of A/c. (tick ✓): 
              [{ex.bankAccountType === 'Savings' ? '✓' : ' '}] Savings &nbsp;&nbsp; 
              [{ex.bankAccountType === 'Current' ? '✓' : ' '}] Current &nbsp;&nbsp; 
              [{!['Savings', 'Current'].includes(ex.bankAccountType || '') && ex.bankAccountType ? '✓' : ' '}] Other (Please specify): {blankInline(ex.bankAccountType === 'Other' ? '' : '', 150)}
            </p>
            <p className="mt-2">c) Account No. : {blankInline(ex.bankAccountNo, 250)}</p>
            <p className="mt-2">d) Name of authorised signatory: {blankInline(ex.bankSignatory, 250)}</p>
            <p className="text-xs mt-1 italic">(Attach last six month's Bank Statement)</p>
          </div>

          <div className="mt-4 border border-primary/20 bg-gray-50/50 p-4 rounded-lg">
            <p className="font-bold mb-3 text-primary-dark border-b border-primary/10 pb-1">Status of firm (tick ✓):</p>
            <p>
              [{ex.firmStatus === 'Proprietorship' ? '✓' : ' '}] Proprietorship &nbsp;&nbsp; 
              [{ex.firmStatus === 'Partnership' ? '✓' : ' '}] Partnership &nbsp;&nbsp; 
              [{ex.firmStatus === 'Limited Company' ? '✓' : ' '}] Limited Company &nbsp;&nbsp; 
              [{ex.firmStatus === 'Private Ltd. Co.' ? '✓' : ' '}] Private Ltd. Co.
            </p>
            <p className="text-xs mt-1 italic">(For partnership firms enclose copy of partnership Deed for Companies Memorandum Articles of Association)</p>
          </div>
          
          {ex.proprietorDetails && ex.proprietorDetails.length > 0 && (
             <div className="mt-2 text-xs">
                <table className="w-full border-collapse border border-black mt-1">
                  <thead>
                    <tr>
                      <th className="border border-black px-1 text-left">Name</th>
                      <th className="border border-black px-1 text-left">DOB</th>
                      <th className="border border-black px-1 text-left">Father's Name</th>
                      <th className="border border-black px-1 text-left">Marital Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.proprietorDetails.map((p, i) => (
                      <tr key={i}>
                        <td className="border border-black px-1 py-0.5">{p.name || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{p.dob || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{p.fathersName || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{p.maritalStatus || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {ex.existingDealerships && ex.existingDealerships.length > 0 && (
             <div className="mt-2 text-xs">
                <p className="font-bold">Existing Dealerships:</p>
                <table className="w-full border-collapse border border-black mt-1">
                  <thead>
                    <tr>
                      <th className="border border-black px-1 text-left">Company Name</th>
                      <th className="border border-black px-1 text-left">Products</th>
                      <th className="border border-black px-1 text-left">Qty</th>
                      <th className="border border-black px-1 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.existingDealerships.map((d, i) => (
                      <tr key={i}>
                        <td className="border border-black px-1 py-0.5">{d.companyName || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{d.products || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{d.quantity || '-'}</td>
                        <td className="border border-black px-1 py-0.5">{d.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          <p className="mt-2">8. Name and address of associate firm(s): {blankInline(ex.associateFirms, 350)}</p>
          <p>9. Turnover: Yr1: {blankInline(ex.turnoverLast3Years?.[0], 100)} Yr2: {blankInline(ex.turnoverLast3Years?.[1], 100)} Yr3: {blankInline(ex.turnoverLast3Years?.[2], 100)}</p>
          <p>10. Details of Security Deposit: DD/Cheque No.: {blankInline(ex.securityDeposit?.ddChequeNo, 150)} Date: {blankInline(ex.securityDeposit?.date, 100)}</p>
          <p>Amount: {blankInline(ex.securityDeposit?.amount, 100)} Bank: {blankInline(ex.securityDeposit?.bank, 150)} Payable at: {blankInline(ex.securityDeposit?.payableAt, 150)}</p>
          
          <p className="mt-2">Are you a registered dealer? [{ex.isRegisteredDealer ? '✓' : ' '}] Yes &nbsp;&nbsp; [{!ex.isRegisteredDealer ? '✓' : ' '}] No</p>
          <p>Sales Tax registration No: {blankInline('', 150)} (b) GSTIN : {blankInline(request.gstNumber, 200)}</p>
          <p>Indicate number of persons employed in your firm (including active partners): {blankInline(ex.personsEmployed, 50)}</p>
          
          <p className="mt-2">Do you have godown facility? [{ex.hasGodown ? '✓' : ' '}] Yes &nbsp;&nbsp; [{!ex.hasGodown ? '✓' : ' '}] No</p>
          <p>Address of godown: {blankInline(ex.godownAddress, 450)}</p>
          <p>Capacity: {blankInline(ex.godownCapacity, 100)} Area: {blankInline(ex.godownArea, 100)}</p>
          <p>Expected Minimum sales per month: {blankInline(ex.expectedMonthlySales, 250)}</p>
        </div>

        <div className="flex justify-between mt-8">
          <div>
            <p>Place: {blankInline(request.cityOrArea, 150)}</p>
            <p>Date: {blankInline(request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy') : '', 150)}</p>
          </div>
          <div className="text-center">
            <p className="mt-8 border-t border-black pt-1 px-4 inline-block">Signature of the applicant(s)<br/>(with rubber stamp)</p>
          </div>
        </div>
      </div>

      <div className="break-after-page print:block" style={{ pageBreakAfter: 'always' }}></div>

      {/* PAGE 2: DEALERSHIP DECLARATION / OFFICE USE */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:p-8 text-[13px] leading-relaxed mb-8 print:mb-0 relative border print:border-0">
        <h2 className="font-bold text-center underline text-lg mb-4">DECLARATION</h2>
        <p className="text-justify mb-4">
          I/We do hereby declare that the information furnished herein is correct to the best of my/our knowledge and belief. For any incorrect information/mis-information furnished herein and for non-compliance of company's policies formulated from time to time, I/We agree that:
        </p>
        <ul className="list-decimal pl-6 mb-8 space-y-2">
          <li>The Company shall have the absolute right to reject my/our application for appointment as dealer.</li>
          <li>The Company reserves the right to terminate my/our dealership without any notice and assigned any reason.</li>
          <li>The Company shall have the right to forfeit or adjust the whole or part of my/our Security Deposit with them in the manner they may deem fit.</li>
        </ul>

        <div className="flex justify-end mb-12">
          <div className="text-center">
            <p className="mt-8 border-t border-black pt-1 px-4 inline-block">Signature of the applicant(s)<br/>(With rubber stamp)</p>
          </div>
        </div>

        <div className="border border-primary/20 bg-primary/5 p-6 mt-8 rounded-lg shadow-sm">
          <h3 className="font-bold text-center text-primary-dark mb-4 text-base tracking-widest border-b border-primary/20 pb-2">FOR OFFICE USE ONLY</h3>
          <p className="mb-4 text-primary font-medium">Comments of sale promoter Agent/Area Manager</p>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <p>Application form No: {blankInline(request.id?.slice(0, 8), 150)}</p>
            <p>Code: {blankInline('', 150)}</p>
          </div>
          <p className="mt-2">Location of business/premises: {blankInline(request.address, 350)}</p>
          <div className="flex gap-4 mt-2">
            <p>Godown capacity : (a) Area (sq ft): {blankInline(ex.godownArea, 100)}</p>
            <p>(b) Capacity (bags): {blankInline(ex.godownCapacity, 100)}</p>
          </div>
          <p className="mt-2">(c) Construction: [{ex.godownConstruction === 'Permanent' ? '✓' : ' '}] Permanent &nbsp;&nbsp; [{ex.godownConstruction === 'Temporary' ? '✓' : ' '}] Temporary</p>
          
          <div className="grid grid-cols-2 gap-4 mt-4 bg-white p-3 rounded border border-primary/10">
            <div>Experience and capability : {blankInline(ex.experience, 150)}</div>
            <div>Financial standing : {blankInline(ex.financialStanding, 150)}</div>
          </div>
          
          <p className="mt-4">Market reputation and credibility : [{ex.marketReputation === 'Excellent' ? '✓' : ' '}] Excellent [{ex.marketReputation === 'Very good' ? '✓' : ' '}] Very good [{ex.marketReputation === 'Good' ? '✓' : ' '}] Good [{ex.marketReputation === 'Average' ? '✓' : ' '}] Average [{ex.marketReputation === 'Poor' ? '✓' : ' '}] Poor</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <p>Business potential (Est. sales/mo): {blankInline(ex.expectedMonthlySales, 150)}</p>
            <p>Assurance of min turnover/mo: {blankInline('', 150)}</p>
          </div>
          
          <p className="mt-4">Remarks (if any): {blankInline('', 450)}</p>
          
          <div className="flex justify-between mt-12 px-4">
            <div>Signature: {blankInline('', 150)}</div>
            <div>Name: {blankInline('', 150)}</div>
          </div>
        </div>
      </div>

      <div className="break-after-page print:block" style={{ pageBreakAfter: 'always' }}></div>

      {/* PAGE 3: NEW CHEQUE SUBMISSION LETTER */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:p-8 text-[15px] leading-relaxed relative border print:border-0 flex flex-col justify-start pt-8">
        
        <div className="flex items-center gap-4 border-b-2 border-primary pb-6 mb-8">
          {settings.company_logo && <img src={settings.company_logo} alt="Company Logo" className="h-16 object-contain" />}
          <div>
            <h1 className="text-2xl font-bold text-primary uppercase tracking-wider">{settings.company_name || 'ETAC ENTERPRISE'}</h1>
            <p className="text-xs text-gray-500 whitespace-pre-wrap">{settings.company_address || '6051/5 VANDNA SOCIETY.,\nKABILPORE,\nNAVSARI-396445.'}</p>
          </div>
        </div>

        <div className="space-y-1 mb-8">
          <p>FROM,</p>
          <p>Your/Firm Name: - <span className="font-bold underline">{request.partyName}</span></p>
          <p>Address: - <span className="underline">{request.address}, {request.cityOrArea}</span></p>
        </div>

        <div className="space-y-1 mb-8">
          <p>TO,</p>
          <p className="font-bold uppercase">{settings.company_name || 'ETAC ENTERPRISE'}</p>
          <p className="whitespace-pre-wrap">{settings.company_address || '6051/5 VANDNA SOCIETY.,\nKABILPORE,\nNAVSARI-396445.'}</p>
          {settings.company_gst && <p>GST: {settings.company_gst}</p>}
        </div>

        <p className="font-bold mb-8 uppercase text-justify">
          SUBJECT: -LETTER ADDRESSED TO {settings.company_name || 'ETAC ENTERPRISE'} THAT CHEQUES ARE GIVEN AS SECURITY AND CAN BE USED IN CASE OF DELAYED/NON-PAYMENT
        </p>

        <p className="mb-4">Dear {settings.company_name || 'ETAC ENTERPRISE'},</p>

        <p className="text-justify mb-4">
          I am writing to formalize an agreement between <span className="font-bold underline">{request.partyName}</span> and {settings.company_name || 'ETAC Enterprise'}, hereinafter referred to as "the Company," concerning the submission of a blank cheque as a security instrument.
        </p>

        <p className="mb-6">
          This agreement, entered on <span className="underline font-bold">{request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy') : blankInline('', 100)}</span>, is established as follows:
        </p>

        <ol className="list-decimal pl-5 space-y-4 text-justify mb-8">
          <li>
            <span className="font-bold">Purpose of Blank Cheque:</span> I am submitting a blank cheque, drawn on <span className="underline font-bold px-2">{ex.chequeBankName || blankInline('', 150)}</span>, 
            bearing cheque number <span className="underline font-bold px-2">{ex.chequeNumbers || blankInline('', 150)}</span>, 
            as a security instrument to guarantee the performance of my contractual obligations with ETAC Enterprise.
          </li>
          <li>
            <span className="font-bold">Conditions for Utilization:</span> The Company shall have the right to utilize the blank cheque only under the following condition:
            <ol className="list-[lower-alpha] pl-6 mt-2 space-y-2">
              <li>The blank cheque may only be invoked in the event of non-performance or breach of any of my contractual obligations with {settings.company_name || 'ETAC Enterprise'} as outlined in our existing contract.</li>
            </ol>
          </li>
          <li>
            <span className="font-bold">Return or Invalidation of Cheque:</span> The Company shall return the blank cheque to me or invalidate it only upon the expiration or termination of our contract, provided that all contractual obligations have been met to the satisfaction of both parties.
          </li>
          <li>
            <span className="font-bold">Legal Compliance:</span> Both parties agree to abide by all applicable banking and legal regulations in relation to the use of this blank cheque.
          </li>
        </ol>

        <p className="text-justify mb-24">
          This agreement is entered into with the full understanding of its implications and responsibilities by both parties. It is signed willingly and without any undue influence.
        </p>

        <div>
          <p className="border-t border-black inline-block pt-1 font-bold">[Signature of applicant]</p>
        </div>
        
      </div>

      </div>

    </div>
  );
};

export default PrintableOnboardingForm;
