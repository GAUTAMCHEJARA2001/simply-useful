import re

GST_STATE_CODES = {
    "01": "Jammu and Kashmir",
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
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
}

def is_valid_gstin(gstin: str) -> bool:
    if not gstin or not isinstance(gstin, str):
        return False
    # Format: 2 digits (state), 10 chars (PAN), 1 char (entity num), 'Z' by default, 1 char (checksum)
    pattern = r"^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    return bool(re.match(pattern, gstin.upper()))

def get_state_code_from_gstin(gstin: str) -> str:
    """Extracts the 2-digit state code from a GSTIN."""
    if not gstin or len(gstin) < 2:
        return ""
    return gstin[:2]

def calculate_gst_split(origin_gstin: str, destination_gstin: str, base_amount: float, tax_percentage: float) -> dict:
    """
    Calculates the IGST, CGST, and SGST split based on origin and destination GSTINs.
    If either GSTIN is missing or invalid, defaults to IGST.
    """
    if not origin_gstin or not destination_gstin:
        # Default to IGST if GSTINs are missing to be safe (Inter-state)
        return {
            "igst": round(base_amount * (tax_percentage / 100), 2),
            "cgst": 0.0,
            "sgst": 0.0,
            "type": "IGST"
        }

    origin_code = get_state_code_from_gstin(origin_gstin)
    dest_code = get_state_code_from_gstin(destination_gstin)

    if origin_code == dest_code and origin_code in GST_STATE_CODES:
        # Intra-state transaction
        return {
            "igst": 0.0,
            "cgst": round(base_amount * ((tax_percentage / 2) / 100), 2),
            "sgst": round(base_amount * ((tax_percentage / 2) / 100), 2),
            "type": "CGST+SGST"
        }
    else:
        # Inter-state transaction
        return {
            "igst": round(base_amount * (tax_percentage / 100), 2),
            "cgst": 0.0,
            "sgst": 0.0,
            "type": "IGST"
        }
