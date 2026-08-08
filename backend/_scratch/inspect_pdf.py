import sys
from pypdf import PdfReader

def extract_form_fields(pdf_path):
    print(f"--- Extracting form fields from {pdf_path} ---")
    try:
        reader = PdfReader(pdf_path)
        fields = reader.get_fields()
        if fields:
            print("Form fields found:")
            for field_name, field_data in fields.items():
                print(f"  - {field_name} : {field_data.get('/T')}")
        else:
            print("No form fields found in this PDF. It might be a flat PDF.")
    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == '__main__':
    extract_form_fields(r'E:\ETAC enterpriise\FORM\DEALER FORM FINAL.pdf')
    extract_form_fields(r'E:\ETAC enterpriise\FORM\cheque submission requist.pdf')
