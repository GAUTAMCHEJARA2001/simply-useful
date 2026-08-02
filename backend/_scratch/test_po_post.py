import urllib.request
import json

def test_po_post():
    base = "http://localhost:4000/api/v1"
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=json.dumps({"email": "admin@simplyuseful.com", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())["data"]["accessToken"]

    po_payload = {
        "supplier_id": "c1a640eb42254433897b336b",
        "warehouse_id": 1,
        "remarks": "Test PO",
        "items": [
            {
                "product_id": "c00712d644292488f8d4d477",
                "quantity": 10,
                "rate": 100,
                "tax_percent": 18
            }
        ]
    }
    r = urllib.request.Request(
        f"{base}/transactions/purchase-orders",
        data=json.dumps(po_payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(r) as resp:
            print("POST PO ->", resp.status, resp.read().decode())
    except Exception as e:
        print("POST PO FAILED ->", e)
        if hasattr(e, 'read'):
            body = e.read().decode()
            import re
            m = re.search(r'<title>(.*?)</title>', body, re.DOTALL)
            m2 = re.search(r'<pre class="exception_value">(.*?)</pre>', body, re.DOTALL)
            print("   TITLE:", m.group(1).strip() if m else "N/A")
            print("   VALUE:", m2.group(1).strip() if m2 else "N/A")

if __name__ == '__main__':
    test_po_post()
