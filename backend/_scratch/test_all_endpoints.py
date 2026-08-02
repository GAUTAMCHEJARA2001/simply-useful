import urllib.request
import json

def test_endpoints():
    base = "http://localhost:4000/api/v1"
    # 1. login
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=json.dumps({"email": "admin@simplyuseful.com", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("LOGIN DATA:", data)
            token = data.get("data", {}).get("accessToken")
            print("Login success, token:", token[:15], "...")
    except Exception as e:
        print("Login failed:", e)
        return

    endpoints = [
        "/products",
        "/dealers",
        "/distributors",
        "/sales",
        "/crm/leads",
        "/users",
        "/companies",
        "/masters/categories",
        "/masters/brands",
        "/masters/warehouses",
        "/masters/units",
        "/masters/settings",
        "/visits",
        "/expenses",
        "/bom",
        "/reports/dashboard-kpis",
        "/reports/sales-summary",
        "/reports/low-stock",
        "/reports/daily",
        "/transactions/purchases",
        "/transactions/sales",
        "/transactions/approvals",
        "/transactions/productions",
        "/system/database-export",
        "/bulk/products/template",
        "/bulk/dealers/template",
        "/bulk/distributors/template",
        "/bulk/recipes/template",
        "/bulk/leads/template"
    ]
    for ep in endpoints:
        r = urllib.request.Request(
            f"{base}{ep}",
            headers={"Authorization": f"Bearer {token}"}
        )
        try:
            with urllib.request.urlopen(r) as resp:
                if resp.status != 200:
                    print(f"GET {ep} -> {resp.status}")
                else:
                    print(f"GET {ep} -> OK (200)")
        except Exception as e:
            print(f"GET {ep} FAILED ->", e)
            if hasattr(e, 'read'):
                print("   Body:", e.read().decode()[:300])

if __name__ == '__main__':
    test_endpoints()
