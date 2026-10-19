from decimal import Decimal

# Indian State GST Code Mapping
GST_STATE_CODES = {
    '01': 'JAMMU AND KASHMIR',
    '02': 'HIMACHAL PRADESH',
    '03': 'PUNJAB',
    '04': 'CHANDIGARH',
    '05': 'UTTARAKHAND',
    '06': 'HARYANA',
    '07': 'DELHI',
    '08': 'RAJASTHAN',
    '09': 'UTTAR PRADESH',
    '10': 'BIHAR',
    '11': 'SIKKIM',
    '12': 'ARUNACHAL PRADESH',
    '13': 'NAGALAND',
    '14': 'MANIPUR',
    '15': 'MIZORAM',
    '16': 'TRIPURA',
    '17': 'MEGHALAYA',
    '18': 'ASSAM',
    '19': 'WEST BENGAL',
    '20': 'JHARKHAND',
    '21': 'ODISHA',
    '22': 'CHHATTISGARH',
    '23': 'MADHYA PRADESH',
    '24': 'GUJARAT',
    '26': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
    '27': 'MAHARASHTRA',
    '29': 'KARNATAKA',
    '30': 'GOA',
    '31': 'LAKSHADWEEP',
    '32': 'KERALA',
    '33': 'TAMIL NADU',
    '34': 'PUDUCHERRY',
    '36': 'TELANGANA',
    '37': 'ANDHRA PRADESH',
    '38': 'LADAKH',
}

def extract_state_code(gst_or_state):
    """
    Extracts the 2-digit GST state code from a GSTIN or state name/code.
    """
    if not gst_or_state:
        return '24'  # Default to Gujarat
    
    clean = str(gst_or_state).strip().upper()
    
    # If standard 15-digit GSTIN (e.g., 24AAACK1234F1Z5)
    if len(clean) >= 2 and clean[:2].isdigit():
        code = clean[:2]
        if code in GST_STATE_CODES:
            return code
            
    # If state name was passed
    for code, name in GST_STATE_CODES.items():
        if name in clean or clean in name:
            return code
            
    return '24'

def calculate_gst_breakdown(base_amount, tax_percent=18.0, seller_gst='24', buyer_gst='24'):
    """
    Calculates exact GST breakdown:
    - Intrastate: CGST + SGST (split equally)
    - Interstate: IGST (full tax)
    """
    base = Decimal(str(round(float(base_amount or 0), 2)))
    tax_p = Decimal(str(round(float(tax_percent or 0), 2)))
    
    seller_code = extract_state_code(seller_gst)
    buyer_code = extract_state_code(buyer_gst)
    
    is_interstate = (seller_code != buyer_code)
    
    total_tax = (base * tax_p / Decimal('100.0')).quantize(Decimal('0.01'))
    grand_total = (base + total_tax).quantize(Decimal('0.01'))
    
    if is_interstate:
        return {
            'isInterstate': True,
            'taxableValue': float(base),
            'taxPercent': float(tax_p),
            'cgstRate': 0.0,
            'cgstAmount': 0.0,
            'sgstRate': 0.0,
            'sgstAmount': 0.0,
            'igstRate': float(tax_p),
            'igstAmount': float(total_tax),
            'totalTax': float(total_tax),
            'grandTotal': float(grand_total),
            'sellerState': GST_STATE_CODES.get(seller_code, seller_code),
            'buyerState': GST_STATE_CODES.get(buyer_code, buyer_code),
        }
    else:
        half_rate = float(tax_p / Decimal('2.0'))
        half_tax = float((total_tax / Decimal('2.0')).quantize(Decimal('0.01')))
        return {
            'isInterstate': False,
            'taxableValue': float(base),
            'taxPercent': float(tax_p),
            'cgstRate': half_rate,
            'cgstAmount': half_tax,
            'sgstRate': half_rate,
            'sgstAmount': half_tax,
            'igstRate': 0.0,
            'igstAmount': 0.0,
            'totalTax': float(total_tax),
            'grandTotal': float(grand_total),
            'sellerState': GST_STATE_CODES.get(seller_code, seller_code),
            'buyerState': GST_STATE_CODES.get(buyer_code, buyer_code),
        }
