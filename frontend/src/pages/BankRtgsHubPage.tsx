import React, { useState, useMemo } from 'react';
import { 
  Landmark, Download, Printer, RotateCcw, Sparkles, Building2, 
  CreditCard, Globe, CheckCircle2, ShieldCheck, FileText, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ----------------------------------------------------------------------
// 10 MAJOR INDIAN BANKS SPECIFICATION
// ----------------------------------------------------------------------
export interface BankProfile {
  id: string;
  name: string;
  subname: string;
  primaryColor: string;
  secondaryColor: string;
  annexure: string;
  title: string;
  subtitle: string;
  logoSvg: React.ReactNode;
}

export const INDIAN_BANKS: BankProfile[] = [
  {
    id: 'sbi',
    name: 'STATE BANK OF INDIA',
    subname: 'भारतीय स्टेट बैंक',
    primaryColor: '#002D62',
    secondaryColor: '#00b5ef',
    annexure: 'Annexure-I (RTGS/NEFT)',
    title: 'APPLICATION FOR RTGS / NEFT REMITTANCE',
    subtitle: '(For RTGS - Amount must be ₹ 2,00,000/- or more)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <circle cx="50" cy="50" r="48" fill="#002D62" />
        <circle cx="50" cy="50" r="16" fill="#ffffff" />
        <rect x="47" y="50" width="6" height="36" fill="#002D62" />
      </svg>
    )
  },
  {
    id: 'axis',
    name: 'AXIS BANK',
    subname: 'एक्सिस बैंक',
    primaryColor: '#97144D',
    secondaryColor: '#700e39',
    annexure: 'Annexure - RTGS/NEFT/IMPS',
    title: 'APPLICATION FOR RTGS / NEFT / IMPS REMITTANCE',
    subtitle: '(Customer Copy & Bank Mandate Form)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <polygon points="50,10 90,85 10,85" fill="#97144D" />
        <polygon points="50,35 75,80 25,80" fill="#ffffff" />
      </svg>
    )
  },
  {
    id: 'hdfc',
    name: 'HDFC BANK',
    subname: 'एचडीएफसी बैंक',
    primaryColor: '#004c8f',
    secondaryColor: '#ed232a',
    annexure: 'Form RTGS/NEFT-01',
    title: 'APPLICATION FOR RTGS / NEFT FUNDS TRANSFER',
    subtitle: '(Please fill in BLOCK letters)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <rect width="100" height="100" fill="#004c8f" rx="10" />
        <rect x="35" y="15" width="30" height="70" fill="#ffffff" />
        <rect x="15" y="35" width="70" height="30" fill="#ffffff" />
        <rect x="40" y="20" width="20" height="60" fill="#ed232a" />
        <rect x="20" y="40" width="60" height="20" fill="#ed232a" />
        <rect x="40" y="40" width="20" height="20" fill="#004c8f" />
      </svg>
    )
  },
  {
    id: 'icici',
    name: 'ICICI BANK',
    subname: 'आईसीआईसीआई बैंक',
    primaryColor: '#A6192E',
    secondaryColor: '#F58220',
    annexure: 'Form FT-02 (Annexure-1)',
    title: 'FUNDS TRANSFER APPLICATION (RTGS / NEFT)',
    subtitle: '(Remittance Voucher & Customer Counterfoil)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <circle cx="50" cy="50" r="48" fill="#A6192E" />
        <circle cx="50" cy="30" r="10" fill="#F58220" />
        <path d="M42,45 L58,45 L58,82 L42,82 Z" fill="#F58220" />
        <path d="M30,50 Q50,75 70,50" stroke="#ffffff" strokeWidth="5" fill="none" />
      </svg>
    )
  },
  {
    id: 'bob',
    name: 'BANK OF BARODA',
    subname: 'बैंक ऑफ़ बड़ौदा',
    primaryColor: '#F26522',
    secondaryColor: '#0A2240',
    annexure: 'BOB/RTGS-NEFT/01',
    title: 'RTGS / NEFT REMITTANCE APPLICATION FORM',
    subtitle: 'आरटीजीएस / नेफ्ट प्रेषण आवेदन पत्र',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <rect width="100" height="100" fill="#F26522" rx="10" />
        <circle cx="50" cy="50" r="30" fill="#ffffff" />
        <circle cx="50" cy="50" r="22" fill="#F26522" />
        <text x="50" y="60" fontSize="28" fontWeight="bold" fill="#ffffff" textAnchor="middle">B</text>
      </svg>
    )
  },
  {
    id: 'pnb',
    name: 'PUNJAB NATIONAL BANK',
    subname: 'पंजाब नेशनल बैंक',
    primaryColor: '#A20000',
    secondaryColor: '#FFCC00',
    annexure: 'PNB-1142 (RTGS/NEFT)',
    title: 'FUNDS TRANSFER APPLICATION (RTGS / NEFT)',
    subtitle: 'धन प्रेषण आवेदन पत्र (शाखा प्रति एवं ग्राहक प्रति)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <circle cx="50" cy="50" r="48" fill="#A20000" />
        <circle cx="50" cy="50" r="34" fill="#FFCC00" />
        <circle cx="50" cy="50" r="24" fill="#A20000" />
        <text x="50" y="60" fontSize="26" fontWeight="bold" fill="#FFCC00" textAnchor="middle">pnb</text>
      </svg>
    )
  },
  {
    id: 'canara',
    name: 'CANARA BANK',
    subname: 'केनरा बैंक',
    primaryColor: '#0091DF',
    secondaryColor: '#F39200',
    annexure: 'NF 956 (NEFT/RTGS)',
    title: 'APPLICATION FOR REMITTANCE THROUGH RTGS / NEFT',
    subtitle: '(A Government of India Undertaking)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <polygon points="30,20 70,20 90,60 50,60" fill="#0091DF" />
        <polygon points="50,40 90,40 70,80 30,80" fill="#F39200" />
      </svg>
    )
  },
  {
    id: 'union',
    name: 'UNION BANK OF INDIA',
    subname: 'यूनियन बैंक ऑफ इंडिया',
    primaryColor: '#ED1C24',
    secondaryColor: '#0054A6',
    annexure: 'UBI/RTGS-NEFT/REV',
    title: 'APPLICATION FOR RTGS / NEFT REMITTANCE',
    subtitle: '(Good people to bank with)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <rect width="100" height="100" fill="#ffffff" rx="10" stroke="#ED1C24" strokeWidth="2" />
        <path d="M25,25 L25,60 Q25,80 50,80 Q75,80 75,60 L75,25" fill="none" stroke="#ED1C24" strokeWidth="12" />
        <path d="M40,25 L40,55 Q40,65 50,65 Q60,65 60,55 L60,25" fill="none" stroke="#0054A6" strokeWidth="8" />
      </svg>
    )
  },
  {
    id: 'kotak',
    name: 'KOTAK MAHINDRA BANK',
    subname: 'कोटक महिन्द्रा बैंक',
    primaryColor: '#ED1C24',
    secondaryColor: '#003366',
    annexure: 'KMB-RTGS-01',
    title: 'APPLICATION FORM FOR RTGS / NEFT REMITTANCE',
    subtitle: '(Customer Receipt & Debit Mandate Slip)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <rect width="100" height="100" fill="#ED1C24" rx="10" />
        <path d="M25,25 L40,25 L40,75 L25,75 Z" fill="#ffffff" />
        <path d="M40,50 L75,25 L75,42 L55,56 L75,75 L55,75 Z" fill="#ffffff" />
      </svg>
    )
  },
  {
    id: 'uco',
    name: 'UCO BANK',
    subname: 'यूको बैंक',
    primaryColor: '#003366',
    secondaryColor: '#002244',
    annexure: 'Annexure-1 (Form RTGS-1)',
    title: 'NEFT/RTGS FUNDS REMITTANCE APPLICATION FORM',
    subtitle: '(Honours Your Trust / आपके विश्वास का सम्मान)',
    logoSvg: (
      <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
        <polygon points="50,10 88,25 88,75 50,90 12,75 12,25" fill="#003366" />
        <rect x="35" y="35" width="30" height="30" fill="#ffffff" rx="4" />
        <circle cx="50" cy="50" r="7" fill="#003366" />
      </svg>
    )
  }
];

// ----------------------------------------------------------------------
// NUMBER TO WORDS ENGINE (ENGLISH, HINDI, GUJARATI)
// ----------------------------------------------------------------------
const HINDI_MAP: Record<number, string> = {
  0: "शून्य", 1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पाँच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ", 10: "दस",
  11: "ग्यारह", 12: "बारह", 13: "तेरह", 14: "चौदह", 15: "पंद्रह", 16: "सोलह", 17: "सत्रह", 18: "अठारह", 19: "उन्नीस", 20: "बीस",
  21: "इक्कीस", 22: "बाईस", 23: "तेईस", 24: "चौबीस", 25: "पच्चीस", 26: "छब्बीस", 27: "सत्ताईस", 28: "अट्ठाईस", 29: "उनतीस", 30: "तीस",
  31: "इकतीस", 32: "बत्तीस", 33: "तैंतीस", 34: "चौंतीस", 35: "पैंतीस", 36: "छत्तीस", 37: "सैंतीस", 38: "अड़तीस", 39: "उनतालीस", 40: "चालीस",
  41: "इकतालीस", 42: "बयालीस", 43: "तैंतालीस", 44: "चौवालीस", 45: "पैंतालीस", 46: "छियालीस", 47: "सैंतालीस", 48: "अड़तालीस", 49: "उनचास", 50: "पचास",
  51: "इक्यावन", 52: "बावन", 53: "तिरेपन", 54: "चौवन", 55: "पचपन", 56: "छप्पन", 57: "सत्तावन", 58: "अट्ठावन", 59: "उनसठ", 60: "साठ",
  61: "इकसठ", 62: "बासठ", 63: "तिरेसठ", 64: "चौंसठ", 65: "पैंसठ", 66: "छियासठ", 67: "सरसठ", 68: "अड़सठ", 69: "उनहत्तर", 70: "सत्तर",
  71: "इकहत्तर", 72: "बहत्तर", 73: "तिहत्तर", 74: "चौहत्तर", 75: "पचहत्तर", 76: "छिहत्तर", 77: "सतहत्तर", 78: "अठहत्तर", 79: "उनासी", 80: "अस्सी",
  81: "इक्यासी", 82: "बयासी", 83: "तिरासी", 84: "चौरासी", 85: "पंचासी", 86: "छियासी", 87: "सत्तासी", 88: "अट्ठासी", 89: "नवासी", 90: "नब्बे",
  91: "इक्यानवे", 92: "बानवे", 93: "तिरानवे", 94: "चौरानवे", 95: "पंचानवे", 96: "छियानवे", 97: "सत्तानवे", 98: "अट्ठानवे", 99: "निन्यानवे"
};

const GUJARATI_MAP: Record<number, string> = {
  0: "શૂન્ય", 1: "એક", 2: "બે", 3: "ત્રણ", 4: "ચાર", 5: "પાંચ", 6: "છ", 7: "સાત", 8: "આઠ", 9: "નવ", 10: "દસ",
  11: "અગિયાર", 12: "બાર", 13: "તેર", 14: "ચૌદ", 15: "પંદર", 16: "સોળ", 17: "સત્તર", 18: "અઢાર", 19: "ઓગણીસ", 20: "વીસ",
  21: "એકવીસ", 22: "બાવીસ", 23: "તેવીસ", 24: "ચોવીસ", 25: "પચ્ચીસ", 26: "છવ્વીસ", 27: "સત્તાવીસ", 28: "અઠ્ઠાવીસ", 29: "ઓગણત્રીસ", 30: "ત્રીસ",
  31: "એકત્રીસ", 32: "બત્રીસ", 33: "તેત્રીસ", 34: "ચોત્રીસ", 35: "પાંત્રીસ", 36: "છત્રીસ", 37: "સડત્રીસ", 38: "ઓડત્રીસ", 39: "ઓગણચાલીસ", 40: "ચાલીસ",
  41: "એકતાલીસ", 42: "બેતાલીસ", 43: "તેતાલીસ", 44: "ચુંમાલીસ", 45: "પિસ્તાલીસ", 46: "છેતાલીસ", 47: "સુડતાલીસ", 48: "અડતાલીસ", 49: "ઓગણપચાસ", 50: "પચાસ",
  51: "એકાવન", 52: "બાવન", 53: "તેપન", 54: "ચોપન", 55: "પંચાવન", 56: "છપ્પન", 57: "સત્તાવન", 58: "અઠ્ઠાવન", 59: "ઓગણસાઠ", 60: "સાઠ",
  61: "એકસઠ", 62: "બાસઠ", 63: "તેસઠ", 64: "ચોસઠ", 65: "પાંસઠ", 66: "છાસઠ", 67: "સડસઠ", 68: "અડસઠ", 69: "અગણોસિત્તેર", 70: "સિત્તેર",
  71: "એકોતેર", 72: "બોતેર", 73: "તોતેર", 74: "ચોંતેર", 75: "પંચોતેર", 76: "છોતેર", 77: "સંતોતેર", 78: "ઇઠોતેર", 79: "ઓગણએંસી", 80: "એંસી",
  81: "એક્યાસી", 82: "બ્યાસી", 83: "ત્યાસી", 84: "ચોર્યાસી", 85: "પંચાસી", 86: "છ્યાસી", 87: "સત્યાસી", 88: "અઠ્યાસી", 89: "નેવ્યાસી", 90: "નેવું",
  91: "એકાણવું", 92: "બાણવું", 93: "ત્રાણવું", 94: "ચોરાણવું", 95: "પંચાણવું", 96: "છન્નું", 97: "સત્તાણવું", 98: "અઠ્ઠાણવું", 99: "નવ્વાણવું"
};

function numToWordsIndian(numVal: string | number, lang: 'en' | 'hi' | 'gu' = 'en'): string {
  if (!numVal) return lang === 'hi' ? "रुपये शून्य मात्र" : (lang === 'gu' ? "રૂપિયા શૂન્ય પૂરા" : "Rupees Zero Only");
  const clean = ("" + numVal).replace(/[^0-9.]/g, "");
  if (!clean) return lang === 'hi' ? "रुपये शून्य मात्र" : (lang === 'gu' ? "રૂપિયા શૂન્ય પૂરા" : "Rupees Zero Only");
  const parts = clean.split(".");
  let intPart = parseInt(parts[0], 10);
  let decPart = 0;
  if (parts.length > 1 && parts[1].length > 0) {
    decPart = parseInt((parts[1] + "00").substring(0, 2), 10);
  }
  if (isNaN(intPart) && decPart === 0) return lang === 'hi' ? "रुपये शून्य मात्र" : (lang === 'gu' ? "રૂપિયા શૂન્ય પૂરા" : "Rupees Zero Only");

  if (lang === 'hi') {
    const chunkHi = (n: number) => {
      if (n === 0) return "";
      let s = "";
      const h = Math.floor(n / 100);
      const r = n % 100;
      if (h > 0) s += HINDI_MAP[h] + " सौ ";
      if (r > 0) s += HINDI_MAP[r];
      return s.trim();
    };

    let words = "";
    if (intPart > 0) {
      const crore = Math.floor(intPart / 10000000);
      intPart %= 10000000;
      const lakh = Math.floor(intPart / 100000);
      intPart %= 100000;
      const thousand = Math.floor(intPart / 1000);
      intPart %= 1000;
      const hundreds = intPart;

      const res: string[] = [];
      if (crore > 0) res.push((HINDI_MAP[crore] || crore) + " करोड़");
      if (lakh > 0) res.push((HINDI_MAP[lakh] || lakh) + " लाख");
      if (thousand > 0) res.push((HINDI_MAP[thousand] || thousand) + " हज़ार");
      if (hundreds > 0) res.push(chunkHi(hundreds));
      words = res.join(" ");
    }

    let finalStr = "रुपये " + (words ? words : "शून्य");
    if (decPart > 0) finalStr += " और " + (HINDI_MAP[decPart] || decPart) + " पैसे";
    finalStr += " मात्र";
    return finalStr;
  }

  if (lang === 'gu') {
    const chunkGu = (n: number) => {
      if (n === 0) return "";
      let s = "";
      const h = Math.floor(n / 100);
      const r = n % 100;
      if (h > 0) s += GUJARATI_MAP[h] + " સો ";
      if (r > 0) s += GUJARATI_MAP[r];
      return s.trim();
    };

    let words = "";
    if (intPart > 0) {
      const crore = Math.floor(intPart / 10000000);
      intPart %= 10000000;
      const lakh = Math.floor(intPart / 100000);
      intPart %= 100000;
      const thousand = Math.floor(intPart / 1000);
      intPart %= 1000;
      const hundreds = intPart;

      const res: string[] = [];
      if (crore > 0) res.push((GUJARATI_MAP[crore] || crore) + " કરોડ");
      if (lakh > 0) res.push((GUJARATI_MAP[lakh] || lakh) + " લાખ");
      if (thousand > 0) res.push((GUJARATI_MAP[thousand] || thousand) + " હજાર");
      if (hundreds > 0) res.push(chunkGu(hundreds));
      words = res.join(" ");
    }

    let finalStr = "રૂપિયા " + (words ? words : "શૂન્ય");
    if (decPart > 0) finalStr += " અને " + (GUJARATI_MAP[decPart] || decPart) + " પૈસા";
    finalStr += " પૂરા";
    return finalStr;
  }

  // English
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const c2 = (n: number) => {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const units = a[n % 10];
    return units ? tens + " " + units : tens;
  };

  const c3 = (n: number) => {
    let str = "";
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    if (hundreds > 0) str += a[hundreds] + " Hundred ";
    if (rem > 0) str += c2(rem);
    return str.trim();
  };

  let words = "";
  if (intPart > 0) {
    const crore = Math.floor(intPart / 10000000);
    intPart %= 10000000;
    const lakh = Math.floor(intPart / 100000);
    intPart %= 100000;
    const thousand = Math.floor(intPart / 1000);
    intPart %= 1000;
    const hundreds = intPart;

    const res: string[] = [];
    if (crore > 0) res.push(c3(crore) + " Crore");
    if (lakh > 0) res.push(c2(lakh) + " Lakh");
    if (thousand > 0) res.push(c2(thousand) + " Thousand");
    if (hundreds > 0) res.push(c3(hundreds));
    words = res.join(" ");
  }

  let finalStr = "Rupees " + (words ? words : "Zero");
  if (decPart > 0) finalStr += " and " + c2(decPart) + " Paise";
  finalStr += " Only";
  return finalStr;
}

// ----------------------------------------------------------------------
// COMB BOX INPUT COMPONENT
// ----------------------------------------------------------------------
interface CombInputProps {
  value: string;
  count: number;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const CombInput: React.FC<CombInputProps> = ({ value, count, onChange, placeholder, className = '' }) => {
  const cleanVal = (value || '').toUpperCase();
  return (
    <div className={`relative flex items-center border border-neutral-400 bg-white rounded-none cursor-text ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.substring(0, count))}
        placeholder={placeholder}
        maxLength={count}
        className="absolute inset-0 opacity-0 z-10 w-full h-full cursor-text uppercase font-mono px-2"
      />
      <div className="flex w-full h-7">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center font-mono font-bold text-xs text-neutral-900 border-r border-neutral-300 last:border-r-0"
          >
            {cleanVal[i] || ''}
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

const REAL_FORMS_MAP: Record<string, string> = {
  sbi: "01_SBI_Real_RTGS_Fillable.pdf",
  axis: "02_AXIS_Real_RTGS_Fillable.pdf",
  hdfc: "03_HDFC_Real_RTGS_Fillable.pdf",
  icici: "04_ICICI_Real_RTGS_Fillable.pdf",
  bob: "05_BOB_Real_RTGS_Fillable.pdf",
  pnb: "06_PNB_Real_RTGS_Fillable.pdf",
  canara: "07_CANARA_Real_RTGS_Fillable.pdf",
  union: "08_UNION_Real_RTGS_Fillable.pdf",
  kotak: "09_KOTAK_Real_RTGS_Fillable.pdf",
  uco: "10_UCO_Real_RTGS_Fillable.pdf"
};

export default function BankRtgsHubPage() {
  const [selectedBankId, setSelectedBankId] = useState<string>('sbi');
  const [lang, setLang] = useState<'en' | 'hi' | 'gu'>('en');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Form State
  const [form, setForm] = useState({
    mode: 'NEFT' as 'NEFT' | 'RTGS',
    branch: '',
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    beneName: '',
    beneAcc: '',
    beneAccConfirm: '',
    beneBank: '',
    beneBranch: '',
    beneIfsc: '',
    beneAccType: 'CURRENT',
    beneAddress: '',
    amount: '',
    charges: '',
    totalAmount: '',
    remitterName: '',
    remitterAcc: '',
    solId: '',
    remitterAddress: '',
    remitterMobile: '',
    remitterPan: '',
    remitterEmail: '',
    remitterPurpose: '',
    chequeNo: '',
  });

  // Cash Denomination state
  const [cash, setCash] = useState<Record<number, number>>({
    2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0
  });
  const [coins, setCoins] = useState<number>(0);

  const activeBank = useMemo(() => {
    return INDIAN_BANKS.find(b => b.id === selectedBankId) || INDIAN_BANKS[0];
  }, [selectedBankId]);

  // Sync calculations
  const calculatedTotal = useMemo(() => {
    const a = parseFloat(form.amount) || 0;
    const c = parseFloat(form.charges) || 0;
    const t = a + c;
    return t > 0 ? (t % 1 === 0 ? t.toString() : t.toFixed(2)) : form.totalAmount || '';
  }, [form.amount, form.charges, form.totalAmount]);

  const amountInWords = useMemo(() => {
    const effective = calculatedTotal || form.amount;
    return numToWordsIndian(effective, lang);
  }, [calculatedTotal, form.amount, lang]);

  const cashGrandTotal = useMemo(() => {
    let sum = 0;
    Object.entries(cash).forEach(([denom, count]) => {
      sum += (parseInt(denom, 10) * (count || 0));
    });
    sum += (coins || 0);
    return sum;
  }, [cash, coins]);

  const updateForm = (key: keyof typeof form, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'beneAcc' && !prev.beneAccConfirm) {
        next.beneAccConfirm = value;
      }
      return next;
    });
  };

  const fillSampleDemo = () => {
    setForm({
      mode: 'NEFT',
      branch: 'NAVSARI',
      date: new Date().toLocaleDateString('en-GB'),
      time: '11:30',
      beneName: 'GAUTAM CHHJARA',
      beneAcc: '12345678912345678912345',
      beneAccConfirm: '12345678912345678912345',
      beneBank: 'STATE BANK OF INDIA',
      beneBranch: 'NAVSARI MAIN',
      beneIfsc: 'SBIN0001234',
      beneAccType: 'CURRENT',
      beneAddress: '101, TRADE CENTER, NAVSARI, GUJARAT',
      amount: '100000',
      charges: '23.50',
      totalAmount: '100023.50',
      remitterName: 'SHREE SHYAM DEVELOPERS',
      remitterAcc: '123456789123456',
      solId: '123456',
      remitterAddress: 'STATION ROAD, NAVSARI - 396445',
      remitterMobile: '9876543210',
      remitterPan: 'ABCDE1234F',
      remitterEmail: 'contact@shreeshyam.com',
      remitterPurpose: 'VENDOR PAYMENT',
      chequeNo: '458921',
    });
    setCash(prev => ({ ...prev, 500: 200 }));
    toast.success('✨ Sample demo details filled and synced across both counterfoil and main form!');
  };

  const clearForm = () => {
    setForm({
      mode: 'NEFT',
      branch: '',
      date: new Date().toLocaleDateString('en-GB'),
      time: '',
      beneName: '',
      beneAcc: '',
      beneAccConfirm: '',
      beneBank: '',
      beneBranch: '',
      beneIfsc: '',
      beneAccType: 'CURRENT',
      beneAddress: '',
      amount: '',
      charges: '',
      totalAmount: '',
      remitterName: '',
      remitterAcc: '',
      solId: '',
      remitterAddress: '',
      remitterMobile: '',
      remitterPan: '',
      remitterEmail: '',
      remitterPurpose: '',
      chequeNo: '',
    });
    setCash({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
    setCoins(0);
    toast.info('Form cleared.');
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      // A4 Landscape: 841.89 x 595.28 pt
      const page = pdfDoc.addPage([841.89, 595.28]);
      const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const hexToRgb = (hex: string) => {
        const c = hex.replace('#', '');
        const n = parseInt(c, 16);
        return {
          r: ((n >> 16) & 255) / 255,
          g: ((n >> 8) & 255) / 255,
          b: (n & 255) / 255,
        };
      };
      const primaryRgb = hexToRgb(activeBank.primaryColor);

      // Header Bar
      page.drawRectangle({
        x: 20,
        y: 545,
        width: 801.89,
        height: 35,
        color: rgb(primaryRgb.r, primaryRgb.g, primaryRgb.b),
      });

      page.drawText(activeBank.name, {
        x: 35,
        y: 558,
        size: 14,
        font: helvBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(activeBank.annexure, {
        x: 680,
        y: 558,
        size: 9,
        font: helvBold,
        color: rgb(1, 1, 1),
      });

      // Divider Line between Counterfoil & Main Slip
      page.drawLine({
        start: { x: 260, y: 30 },
        end: { x: 260, y: 535 },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2),
        dashArray: [4, 3],
      });

      const drawTxt = (text: string, x: number, y: number, size = 8.5, isBold = false) => {
        if (!text) return;
        page.drawText(String(text), {
          x, y, size,
          font: isBold ? helvBold : helv,
          color: rgb(0.1, 0.1, 0.1),
        });
      };

      // Counterfoil Text
      drawTxt("COUNTERFOIL / CUSTOMER COPY", 50, 520, 9.5, true);
      drawTxt(`Branch: ${form.branch}`, 30, 498);
      drawTxt(`Date: ${form.date}    Time: ${form.time}`, 30, 482);
      drawTxt(`Remittance Favouring:`, 30, 464, 8, true);
      drawTxt(form.beneName, 30, 450, 9, true);

      drawTxt(`Beneficiary A/c: ${form.beneAcc}`, 30, 430);
      drawTxt(`Bank: ${form.beneBank}`, 30, 412);
      drawTxt(`Branch: ${form.beneBranch}`, 30, 394);
      drawTxt(`IFS Code: ${form.beneIfsc}`, 30, 376, 8.5, true);
      drawTxt(`Account Type: ${form.beneAccType}`, 30, 358);
      drawTxt(`Amount: Rs. ${form.amount}`, 30, 340);
      drawTxt(`Charges: Rs. ${form.charges}`, 30, 322);
      drawTxt(`Total Amount: Rs. ${calculatedTotal || form.totalAmount}`, 30, 304, 9, true);
      drawTxt(amountInWords, 30, 282, 7.5, true);

      drawTxt(`Remitter Name: ${form.remitterName}`, 30, 255);
      drawTxt(`Remitter A/c: ${form.remitterAcc}`, 30, 237);
      drawTxt(`Mobile: ${form.remitterMobile}`, 30, 219);
      drawTxt(`PAN: ${form.remitterPan}`, 30, 201);
      drawTxt("Seal / Signature of Authorised Official", 50, 70, 7.5);

      // Main Form Text
      drawTxt(activeBank.title, 380, 520, 10.5, true);
      drawTxt(`Branch: ${form.branch}`, 280, 498);
      drawTxt(`Date: ${form.date}    Time: ${form.time}`, 550, 498);

      // Beneficiary Box
      page.drawRectangle({
        x: 280, y: 345, width: 540, height: 135,
        borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.8,
      });
      drawTxt("BENEFICIARY DETAILS", 480, 465, 8.5, true);
      drawTxt(`Name: ${form.beneName}`, 290, 445, 9, true);
      drawTxt(`Account Number: ${form.beneAcc}`, 290, 427, 9, true);
      drawTxt(`Bank Name & Branch: ${form.beneBank} - ${form.beneBranch}`, 290, 409);
      drawTxt(`IFS Code: ${form.beneIfsc}    Type: ${form.beneAccType}`, 290, 391, 8.5, true);
      drawTxt(`Remittance Amount: Rs. ${form.amount}    Charges: Rs. ${form.charges}`, 290, 373);
      drawTxt(`Total Amount: Rs. ${calculatedTotal || form.totalAmount}`, 290, 355, 9, true);

      // Applicant Box
      page.drawRectangle({
        x: 280, y: 220, width: 540, height: 115,
        borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.8,
      });
      drawTxt("APPLICANT DETAILS (REMITTER)", 460, 320, 8.5, true);
      drawTxt(`Remitter Name: ${form.remitterName}`, 290, 302, 9, true);
      drawTxt(`Debit Account No: ${form.remitterAcc}    Sol Id: ${form.solId}`, 290, 284, 8.5, true);
      drawTxt(`Address: ${form.remitterAddress}`, 290, 266);
      drawTxt(`Mobile: ${form.remitterMobile}    PAN: ${form.remitterPan}`, 290, 248, 8.5, true);
      drawTxt(`Email: ${form.remitterEmail}    Purpose: ${form.remitterPurpose}`, 290, 230);

      // Debit Mandate line
      drawTxt(`Please debit Rs. ${calculatedTotal || form.totalAmount} from Account No. ${form.remitterAcc}`, 280, 195, 8.5, true);
      drawTxt(`Enclosed Cheque No: ${form.chequeNo} Dated: ${form.date}`, 280, 178);
      drawTxt(`Amount in Words: ${amountInWords}`, 280, 160, 8, true);

      // Signatures
      drawTxt("Signature of Customer / Remitter", 300, 70, 7.5);
      drawTxt("Verifying Official", 510, 70, 7.5);
      drawTxt("Maker Official", 650, 70, 7.5);
      drawTxt("Checker Official", 760, 70, 7.5);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeBank.name.replace(/\s+/g, '_')}_RTGS_NEFT_Filled.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`✅ Downloaded official filled PDF for ${activeBank.name}!`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to generate PDF: ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 print:p-0 print:bg-white print:text-black">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS (HIDDEN ON PRINT) */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto mb-4 print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                All Indian Banks RTGS / NEFT Remittance Hub
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  10 Major Banks
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Single data entry, switch any bank, character comb boxes, live multilingual number-to-words, and instant official PDF export.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Globe className="w-4 h-4 text-sky-400" />
              <label className="text-xs font-medium text-slate-300">Language:</label>
              <select
                value={lang}
                onChange={(e) => {
                  const newLang = e.target.value as any;
                  setLang(newLang);
                  const names = { en: "English", hi: "हिन्दी (Hindi)", gu: "ગુજરાતી (Gujarati)" };
                  toast.success(`🌐 Language switched to ${names[newLang]}!`);
                }}
                className="bg-transparent text-sky-400 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900 text-white">English</option>
                <option value="hi" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
                <option value="gu" className="bg-slate-900 text-white">ગુજરાતી (Gujarati)</option>
              </select>
            </div>

            <button
              onClick={fillSampleDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Fill Demo
            </button>

            <button
              onClick={clearForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Clear
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print (A4)
            </button>

            <button
              onClick={generatePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isGeneratingPdf ? 'Generating...' : 'Download Official PDF'}
            </button>

            <button
              onClick={() => {
                const fname = REAL_FORMS_MAP[selectedBankId];
                toast.success(`📂 Official Real ${activeBank.name} Form is ready: Downloads/Real_Indian_Bank_RTGS_Forms/All_10_Banks_Fillable/${fname}`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Real Bank Form ({activeBank.name.split(' ')[0]})
            </button>
          </div>
        </div>

        {/* 10 Banks Selector Bar */}
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 overflow-x-auto shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 whitespace-nowrap">
            Select Bank:
          </span>
          {INDIAN_BANKS.map(bank => {
            const isActive = bank.id === selectedBankId;
            return (
              <button
                key={bank.id}
                onClick={() => {
                  setSelectedBankId(bank.id);
                  toast.info(`🏛️ Switched to ${bank.name}! All your entered values are retained.`);
                }}
                style={{
                  backgroundColor: isActive ? bank.primaryColor : undefined,
                  borderColor: isActive ? bank.secondaryColor : undefined,
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'text-white shadow-md scale-[1.02]'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5">
                  {bank.logoSvg}
                </div>
                <span>{bank.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FORM CANVAS (A4 LANDSCAPE SIMULATION & PRINT TEMPLATE) */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto bg-white text-neutral-900 rounded-lg shadow-2xl p-6 border border-slate-300 print:p-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Slip Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b-2" style={{ borderColor: activeBank.primaryColor }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0">
              {activeBank.logoSvg}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black tracking-tight" style={{ color: activeBank.primaryColor }}>
                  {activeBank.name}
                </span>
                <span className="text-xs font-semibold text-neutral-600">
                  {activeBank.subname}
                </span>
              </div>
              <div className="text-[11px] font-bold text-neutral-700">
                {activeBank.title}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-extrabold text-neutral-800 uppercase tracking-wider">
              {activeBank.annexure}
            </div>
            <div className="text-[10px] text-neutral-500 font-medium">
              {activeBank.subtitle}
            </div>
          </div>
        </div>

        {/* Dual Layout: Counterfoil (Left) & Main Form (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4">
          
          {/* ------------------------------------------------------------- */}
          {/* COUNTERFOIL / CUSTOMER COPY (Cols 1-4) */}
          {/* ------------------------------------------------------------- */}
          <div className="md:col-span-4 print:col-span-4 pr-0 md:pr-4 border-r-0 md:border-r border-dashed border-neutral-400 space-y-2.5">
            <div className="text-center font-bold text-[11px] bg-neutral-100 py-1 border border-neutral-300 uppercase tracking-wider">
              {lang === 'hi' ? 'ग्राहक प्रति / COUNTERFOIL' : (lang === 'gu' ? 'ગ્રાહક નકલ / COUNTERFOIL' : 'COUNTERFOIL / CUSTOMER COPY')}
            </div>

            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 font-bold text-[11px] cursor-pointer">
                  <input
                    type="radio"
                    name="cf_mode"
                    checked={form.mode === 'NEFT'}
                    onChange={() => updateForm('mode', 'NEFT')}
                    className="accent-sky-700"
                  />
                  NEFT
                </label>
                <label className="flex items-center gap-1 font-bold text-[11px] cursor-pointer">
                  <input
                    type="radio"
                    name="cf_mode"
                    checked={form.mode === 'RTGS'}
                    onChange={() => updateForm('mode', 'RTGS')}
                    className="accent-sky-700"
                  />
                  RTGS
                </label>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-bold">Branch:</span>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => updateForm('branch', e.target.value)}
                  className="border-b border-neutral-400 font-bold text-[11px] outline-none px-1 w-24"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-1">
                <span className="font-bold">Date:</span>
                <input
                  type="text"
                  value={form.date}
                  onChange={(e) => updateForm('date', e.target.value)}
                  className="border-b border-neutral-400 font-bold text-[11px] outline-none px-1 w-20"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">Time:</span>
                <input
                  type="text"
                  value={form.time}
                  onChange={(e) => updateForm('time', e.target.value)}
                  className="border-b border-neutral-400 font-bold text-[11px] outline-none px-1 w-16"
                />
              </div>
            </div>

            {/* Counterfoil Beneficiary Table */}
            <div className="border border-neutral-400 text-[10.5px]">
              <div className="p-1 bg-neutral-100 font-bold border-b border-neutral-400 text-[10px] text-neutral-700">
                Remittance Favouring:
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Beneficiary:</div>
                <div className="p-1 col-span-2 font-bold text-neutral-900">{form.beneName || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">A/c Number:</div>
                <div className="p-1 col-span-2 font-mono font-bold">{form.beneAcc || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Bank & Branch:</div>
                <div className="p-1 col-span-2">{form.beneBank} {form.beneBranch ? `(${form.beneBranch})` : ''}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">IFS Code:</div>
                <div className="p-1 col-span-2 font-mono font-bold text-sky-800">{form.beneIfsc || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Amount ₹:</div>
                <div className="p-1 col-span-2 font-mono font-bold">₹ {form.amount || '0'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Charges ₹:</div>
                <div className="p-1 col-span-2 font-mono">₹ {form.charges || '0'}</div>
              </div>
              <div className="grid grid-cols-3 bg-neutral-100 font-bold">
                <div className="p-1 border-r border-neutral-300 text-neutral-900">Total ₹:</div>
                <div className="p-1 col-span-2 font-mono text-neutral-950 font-black">
                  ₹ {calculatedTotal || '0'}
                </div>
              </div>
            </div>

            {/* Words representation */}
            <div className="border border-neutral-400 p-1.5 bg-neutral-50 text-[10px]">
              <div className="font-bold text-neutral-700 mb-0.5">
                {lang === 'hi' ? 'कुल राशि शब्दों में:' : (lang === 'gu' ? 'કુલ રકમ શબ્દોમાં:' : 'Amount in words:')}
              </div>
              <div className="font-bold text-neutral-950 italic">
                {amountInWords}
              </div>
            </div>

            {/* Remitter Summary */}
            <div className="border border-neutral-400 text-[10.5px]">
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Remitter:</div>
                <div className="p-1 col-span-2 font-bold">{form.remitterName || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Debit A/c:</div>
                <div className="p-1 col-span-2 font-mono">{form.remitterAcc || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-300">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">Mobile:</div>
                <div className="p-1 col-span-2 font-mono">{form.remitterMobile || '—'}</div>
              </div>
              <div className="grid grid-cols-3">
                <div className="p-1 bg-neutral-50 font-bold border-r border-neutral-300">PAN:</div>
                <div className="p-1 col-span-2 font-mono font-bold">{form.remitterPan || '—'}</div>
              </div>
            </div>

            {/* Signature Box */}
            <div className="pt-8 text-center text-[9.5px] font-bold text-neutral-600 border-t border-neutral-300">
              Seal / Signature of Authorised Bank Official
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* MAIN APPLICATION FORM (Cols 5-12) */}
          {/* ------------------------------------------------------------- */}
          <div className="md:col-span-8 print:col-span-8 space-y-3">
            
            {/* Top Branch & Date Meta */}
            <div className="flex flex-wrap items-center justify-between text-xs border-b border-neutral-300 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">Branch:</span>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => updateForm('branch', e.target.value)}
                  placeholder="BRANCH NAME"
                  className="border-b border-neutral-400 font-bold outline-none px-1 w-32 uppercase"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="mf_mode"
                    checked={form.mode === 'NEFT'}
                    onChange={() => updateForm('mode', 'NEFT')}
                    className="accent-sky-700"
                  />
                  NEFT
                </label>
                <label className="flex items-center gap-1 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="mf_mode"
                    checked={form.mode === 'RTGS'}
                    onChange={() => updateForm('mode', 'RTGS')}
                    className="accent-sky-700"
                  />
                  RTGS
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold">Date:</span>
                <input
                  type="text"
                  value={form.date}
                  onChange={(e) => updateForm('date', e.target.value)}
                  className="border-b border-neutral-400 font-bold outline-none px-1 w-24"
                />
                <span className="font-bold ml-2">Time:</span>
                <input
                  type="text"
                  value={form.time}
                  onChange={(e) => updateForm('time', e.target.value)}
                  className="border-b border-neutral-400 font-bold outline-none px-1 w-16"
                />
              </div>
            </div>

            {/* Section 1: Beneficiary Details */}
            <div className="border border-neutral-400 rounded-none overflow-hidden text-xs">
              <div className="bg-neutral-100 font-bold px-2 py-1 border-b border-neutral-400 flex items-center justify-between">
                <span>1. BENEFICIARY DETAILS (લાભાર્થીની વિગતો / लाभार्थी का विवरण)</span>
                <span className="text-[10px] text-neutral-500 font-normal">Fill in BLOCK letters</span>
              </div>

              <div className="p-2.5 space-y-2">
                {/* Beneficiary Name Comb */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                    <span>Beneficiary Name:</span>
                    <span className="text-[10px] text-neutral-400 font-normal">23 Characters</span>
                  </div>
                  <CombInput
                    count={23}
                    value={form.beneName}
                    onChange={(val) => updateForm('beneName', val)}
                    placeholder="ENTER BENEFICIARY NAME"
                  />
                </div>

                {/* Account Number Comb */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                    <span>Beneficiary Account Number:</span>
                    <span className="text-[10px] text-neutral-400 font-normal">23 Characters</span>
                  </div>
                  <CombInput
                    count={23}
                    value={form.beneAcc}
                    onChange={(val) => updateForm('beneAcc', val)}
                    placeholder="ENTER BENEFICIARY ACCOUNT NUMBER"
                  />
                </div>

                {/* Confirm Account Number Comb */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                    <span>Confirm Beneficiary Account Number:</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Re-enter Account No.</span>
                  </div>
                  <CombInput
                    count={23}
                    value={form.beneAccConfirm}
                    onChange={(val) => updateForm('beneAccConfirm', val)}
                    placeholder="CONFIRM BENEFICIARY ACCOUNT NUMBER"
                  />
                </div>

                {/* Bank, Branch, IFSC, Type Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Beneficiary Bank:</label>
                    <input
                      type="text"
                      value={form.beneBank}
                      onChange={(e) => updateForm('beneBank', e.target.value.toUpperCase())}
                      placeholder="STATE BANK OF INDIA"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-bold uppercase outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Branch Name:</label>
                    <input
                      type="text"
                      value={form.beneBranch}
                      onChange={(e) => updateForm('beneBranch', e.target.value.toUpperCase())}
                      placeholder="BRANCH"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs uppercase outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">IFS Code (11 Chars):</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={form.beneIfsc}
                      onChange={(e) => updateForm('beneIfsc', e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-mono font-bold uppercase text-sky-800 outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Account Type:</label>
                    <select
                      value={form.beneAccType}
                      onChange={(e) => updateForm('beneAccType', e.target.value)}
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-bold outline-none focus:border-sky-600"
                    >
                      <option value="CURRENT">CURRENT A/C (11)</option>
                      <option value="SAVINGS">SAVINGS A/C (10)</option>
                      <option value="CC/OD">CASH CREDIT / OVERDRAFT</option>
                      <option value="LOAN">LOAN ACCOUNT</option>
                    </select>
                  </div>
                </div>

                {/* Amount & Charges Calculation Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-neutral-200">
                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Amount to Remit ₹:</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => updateForm('amount', e.target.value)}
                      placeholder="100000"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-mono font-bold outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Bank Charges ₹:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.charges}
                      onChange={(e) => updateForm('charges', e.target.value)}
                      placeholder="23.50"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-mono outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-900 block">Total Amount ₹:</label>
                    <input
                      type="text"
                      readOnly
                      value={calculatedTotal}
                      className="w-full border border-neutral-400 bg-neutral-100 px-2 py-1 text-xs font-mono font-black text-neutral-950 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Applicant / Remitter Details */}
            <div className="border border-neutral-400 rounded-none overflow-hidden text-xs">
              <div className="bg-neutral-100 font-bold px-2 py-1 border-b border-neutral-400 flex items-center justify-between">
                <span>2. APPLICANT DETAILS / REMITTER (અરજદારની વિગતો / आवेदक का विवरण)</span>
              </div>

              <div className="p-2.5 space-y-2">
                {/* Remitter Name Comb */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                    <span>Remitter (Applicant) Name:</span>
                    <span className="text-[10px] text-neutral-400 font-normal">23 Characters</span>
                  </div>
                  <CombInput
                    count={23}
                    value={form.remitterName}
                    onChange={(val) => updateForm('remitterName', val)}
                    placeholder="ENTER REMITTER COMPANY OR PERSON NAME"
                  />
                </div>

                {/* Remitter Account Number (15 Cells) & Sol ID (6 Cells) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                      <span>Debit Account Number (15 Chars):</span>
                    </div>
                    <CombInput
                      count={15}
                      value={form.remitterAcc}
                      onChange={(val) => updateForm('remitterAcc', val)}
                      placeholder="ACCOUNT NO."
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                      <span>Sol ID (6 Chars):</span>
                    </div>
                    <CombInput
                      count={6}
                      value={form.solId}
                      onChange={(val) => updateForm('solId', val)}
                      placeholder="SOL ID"
                    />
                  </div>
                </div>

                {/* Mobile (10 Cells) & PAN (10 Cells) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                      <span>Mobile Number (10 Digits):</span>
                    </div>
                    <CombInput
                      count={10}
                      value={form.remitterMobile}
                      onChange={(val) => updateForm('remitterMobile', val)}
                      placeholder="MOBILE NO."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-0.5">
                      <span>PAN Number (10 Chars):</span>
                    </div>
                    <CombInput
                      count={10}
                      value={form.remitterPan}
                      onChange={(val) => updateForm('remitterPan', val)}
                      placeholder="PAN NUMBER"
                    />
                  </div>
                </div>

                {/* Address & Cheque Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Remitter Full Address:</label>
                    <input
                      type="text"
                      value={form.remitterAddress}
                      onChange={(e) => updateForm('remitterAddress', e.target.value.toUpperCase())}
                      placeholder="OFFICE / RESIDENCE ADDRESS"
                      className="w-full border border-neutral-400 px-2 py-1 text-xs uppercase outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-neutral-700 block">Enclosed Cheque No:</label>
                    <input
                      type="text"
                      value={form.chequeNo}
                      onChange={(e) => updateForm('chequeNo', e.target.value)}
                      placeholder="CHEQUE NO."
                      className="w-full border border-neutral-400 px-2 py-1 text-xs font-mono font-bold outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Debit Mandate & Amount in Words */}
            <div className="p-2 border border-neutral-400 bg-neutral-50 text-[11px] space-y-1">
              <div className="font-bold text-neutral-900">
                DEBIT MANDATE: Please debit ₹ <span className="font-mono text-sky-800">{calculatedTotal || '0'}</span> from our Account No. <span className="font-mono">{form.remitterAcc || '__________'}</span> along with applicable charges.
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-neutral-700 whitespace-nowrap">Amount in Words:</span>
                <span className="font-bold text-neutral-950 italic">{amountInWords}</span>
              </div>
            </div>

            {/* Cash Denomination Table */}
            <div className="border border-neutral-400 text-xs">
              <div className="bg-neutral-100 font-bold px-2 py-1 border-b border-neutral-400 flex items-center justify-between text-[11px]">
                <span>DETAILS OF CASH REMITTED (In case of cash remittance)</span>
                <span className="font-mono font-black text-sky-900">Cash Total ₹: {cashGrandTotal}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1 p-2 text-center text-[10.5px] bg-white">
                {[2000, 500, 200, 100, 50, 20, 10].map(denom => (
                  <div key={denom} className="border border-neutral-300 p-1 rounded-sm">
                    <div className="font-bold text-neutral-600">₹{denom} ×</div>
                    <input
                      type="number"
                      min={0}
                      value={cash[denom] || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setCash(prev => ({ ...prev, [denom]: val }));
                      }}
                      placeholder="0"
                      className="w-full text-center border-b border-neutral-400 font-mono font-bold text-xs py-0.5 outline-none"
                    />
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      = {(cash[denom] || 0) * denom}
                    </div>
                  </div>
                ))}
                <div className="border border-neutral-300 p-1 rounded-sm bg-neutral-50">
                  <div className="font-bold text-neutral-600">Coins ₹</div>
                  <input
                    type="number"
                    min={0}
                    value={coins || ''}
                    onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-center border-b border-neutral-400 font-mono font-bold text-xs py-0.5 outline-none"
                  />
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    = {coins || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="grid grid-cols-4 gap-4 pt-6 text-center text-[10px] font-bold text-neutral-700">
              <div className="border-t border-neutral-400 pt-1">
                Signature of Applicant / Remitter
              </div>
              <div className="border-t border-neutral-400 pt-1">
                Verifying Official
              </div>
              <div className="border-t border-neutral-400 pt-1">
                Maker Official
              </div>
              <div className="border-t border-neutral-400 pt-1">
                Checker Official
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
