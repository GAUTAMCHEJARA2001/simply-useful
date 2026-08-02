import urllib.request
import json
import re

def test_po_get():
    base = "http://localhost:4000/api/v1"
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=json.dumps({"email": "admin@simplyuseful.com", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode())["data"]["accessToken"]

    r = urllib.request.Request(
        f"{base}/transactions/purchase-orders",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(r) as resp:
            print("GET PO ->", resp.status, resp.read().decode()[:300])
    except Exception as e:
        print("GET PO FAILED ->", e)
        if hasattr(e, 'read'):
            body = e.read().decode()
            m = re.search(r'<title>(.*?)</title>', body, re.DOTALL)
            m2 = re.search(r'<pre class="exception_value">(.*?)</pre>', body, re.DOTALL)
            print("   TITLE:", m.group(1).strip() if m else "N/A")
            print("   VALUE:", m2.group(1).strip() if m2 else "N/A")
            if not m and not m2:
                print("   BODY:", body[:500])

if __name__ == '__main__':
    test_po_get()
