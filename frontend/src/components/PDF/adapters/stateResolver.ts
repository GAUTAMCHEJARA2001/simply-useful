export const STATE_CODE_MAP: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

const CITY_STATE_MAP: Record<string, { state: string; stateCode: string }> = {
  "chittor": { state: "Rajasthan", stateCode: "08" },
  "chittorgarh": { state: "Rajasthan", stateCode: "08" },
  "navsari": { state: "Gujarat", stateCode: "24" },
  "munsad": { state: "Gujarat", stateCode: "24" },
  "rajpardi": { state: "Gujarat", stateCode: "24" },
  "nashik": { state: "Maharashtra", stateCode: "27" },
  "gujarat": { state: "Gujarat", stateCode: "24" },
  "rajasthan": { state: "Rajasthan", stateCode: "08" },
  "maharashtra": { state: "Maharashtra", stateCode: "27" }
};

export const cleanGstNumber = (gstin?: string): string => {
  if (!gstin) return '';
  const trimmed = gstin.trim();
  if (trimmed === '' || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'undefined') {
    return '';
  }
  return trimmed;
};

export const getDetailsFromAddressOrGst = (gstin?: string, address?: string): { state: string; stateCode: string } => {
  const gst = cleanGstNumber(gstin).replace(/[^a-zA-Z0-9]/g, '');
  if (gst && gst.length >= 2) {
    const code = gst.substring(0, 2);
    if (/^\d{2}$/.test(code)) {
      const stateName = STATE_CODE_MAP[code];
      if (stateName) {
        return { state: stateName, stateCode: code };
      }
    }
  }

  if (address) {
    const cleanAddress = address.toLowerCase();
    for (const [key, details] of Object.entries(CITY_STATE_MAP)) {
      if (cleanAddress.includes(key)) {
        return details;
      }
    }

    for (const [code, name] of Object.entries(STATE_CODE_MAP)) {
      const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
      if (regex.test(cleanAddress)) {
        return { state: name, stateCode: code };
      }
    }
  }

  return { state: 'Unknown', stateCode: '—' };
};
