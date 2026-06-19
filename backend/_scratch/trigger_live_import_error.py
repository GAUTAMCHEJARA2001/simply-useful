import os, sys, django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import urllib.request
import urllib.error
from api.auth import generate_tokens
from core.models import User

def trigger():
    print("Generating authentication token for live request...")
    user = User.objects.using('default').filter(role='SUPERADMIN').first()
    if not user:
        print("No superadmin user found")
        return
        
    token, _ = generate_tokens(str(user.id), user.email, user.role, user.companyid_id)
    
    # Let's construct a multipart/form-data request manually
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    
    csv_data = (
        "# INSTRUCTION: Fill in dealer details.\n"
        "dealerCode,dealerName,city,assignedSoEmail,distributorName,creditLimit,outstanding,active,territory\n"
        "D-LIVE-TEST-01,Live Test Dealer,Surat,super@kamla.com,,50000,0,true,T-WEST\n"
    )
    
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="dealers.csv"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
        f"{csv_data}\r\n"
        f"--{boundary}--\r\n"
    ).encode('utf-8')
    
    url = "https://simply-useful-backend.onrender.com/api/v1/bulk/dealers/import"
    
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    # Set warehouse header
    req.add_header('X-Warehouse-ID', 'wh_surat')
    
    print(f"Sending POST request to {url}...")
    try:
        with urllib.request.urlopen(req) as resp:
            print("Response status:", resp.status)
            print("Response body:", resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("HTTP Error status:", e.code)
        try:
            err_body = e.read().decode('utf-8')
            print("Response body:")
            # If it's a django debug page, let's extract the traceback
            if "Traceback" in err_body:
                print("Traceback detected in response!")
                # Print the lines containing traceback or the first 2000 chars of HTML
                import re
                tb_matches = re.findall(r'<pre class="exception_value">([^<]+)</pre>', err_body)
                if tb_matches:
                    print("Exception value:", tb_matches)
                tb_lines = re.findall(r'<code>([^<]+)</code>', err_body)
                if tb_lines:
                    print("Traceback snippet:")
                    for line in tb_lines[:20]:
                        print("  ", line.strip())
            else:
                print(err_body[:2000])
        except Exception as ex:
            print("Could not read error body:", ex)
    except Exception as e:
        print("Exception:", e)

if __name__ == '__main__':
    trigger()
