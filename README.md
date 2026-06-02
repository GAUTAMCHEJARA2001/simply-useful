# Simply Useful — ERP Platform

> A full-stack, production-grade Enterprise Resource Planning (ERP) system for manufacturing and distribution businesses. Built with **React + TypeScript** (frontend) and **Django REST Framework** (backend), running on **SQLite**.

---

## ✨ Feature Overview

### 🔐 Authentication & Roles
- JWT-based login with refresh token rotation
- **5 role types**: `SUPERADMIN`, `ADMIN`, `SALES`, `HR`, `INVENTORY`
- Role-based route protection on both frontend and backend
- Per-role sidebar navigation — each user only sees what they need

---

### 📊 Dashboards

| Role | Dashboard |
|---|---|
| SALES | Orders, target progress, weekly chart, product mix, upcoming meetings, **My Territory** |
| ADMIN / SUPERADMIN | Revenue pipeline, SO performance, recent orders, pending approvals |
| HR | Staff attendance, expense claims, leave management, payroll |
| INVENTORY | Stock levels, warehouse overview, low-stock alerts |

---

### 🛒 Sales & Orders
- Create Sales Orders with multi-item line entries and GST calculation
- Order approval workflow: Pending → Approved → Dispatched → Completed / Returned / Cancelled
- My Orders list with date filtering, status badges, and search
- Financial Year scoped views (Indian FY: Apr–Mar)
- Returned & Rejected order tracking

---

### 🏬 Dealer & Distributor Management
- Full CRUD for dealers (code, name, city, distributor, credit limit, active status)
- Full CRUD for distributors (name, area, credit limit, active status)
- Each dealer/distributor is assigned to a Sales Officer (SO)

---

### 🗺️ SO Territory Mapping *(Admin)*
- **Dedicated mapping page** (`/admin/so-mapping`) for admins to assign/reassign dealers and distributors to Sales Officers
- SO summary cards showing dealer + distributor count per SO — click to filter
- **Per-row instant save**: change SO from a dropdown, saves immediately
- **Bulk reassign**: select multiple parties → pick new SO → Apply
- Filter by party type, SO, or search by name/city
- Fully mobile responsive
- **Sales Officer view**: "My Territory" panel on the Sales Dashboard showing all assigned dealers and distributors with city and status

---

### 📦 Inventory Management
- Stock-in / stock-out transactions with warehouse selection
- Purchase Order creation and approval workflow
- Goods receipt, partial receipt, and return handling
- BOM (Bill of Materials) management
- **Global Inventory** view across all warehouses (SUPERADMIN only)
- Warehouse management (add/edit warehouses, GST numbers)
- Low-stock and stockout detection with visual status badges

---

### 📈 Reports Workspace *(SUPERADMIN only)*

Five reporting domains accessible via tab navigation:

| Domain | Description |
|---|---|
| **SO Performance** | Revenue, orders, visits, expense claims per Sales Officer |
| **Inventory Stock** | Current stock levels, safety status, warehouse, valuation |
| **Dealer & Distributor** | Partner billing volumes, city/state, last order date |
| **Monthly Financials** | Month-on-month revenue and estimated profit trends |
| **Sales Analysis** | 6 sub-views (see below) |

#### Sales Analysis Sub-Views
| Sub-View | Analysis |
|---|---|
| Brand-wise | Revenue, qty, avg unit price per brand |
| Item-wise | Per-SKU breakdown with category & brand |
| Counter-wise | Dealer/distributor billing performance |
| Area-wise | State → City revenue aggregation |
| Activity Heat Map | 7-day × 24-hour order activity grid |
| Category-wise | Revenue share % per product category |

**All reports support:**
- Indian Financial Year date presets (Apr–Mar) plus custom range
- Live keyword search across all columns
- Sort by any column (ascending / descending)
- Bar, Line, Pie, or No-chart visualisation
- CSV export scoped to current filters

---

### 👥 CRM — Lead Management
- Kanban pipeline board: New → Contacted → Qualified → Proposal → Won / Lost
- Lead assignment to Sales Officers
- Lead detail page: contact info, city/state/pincode, follow-up notes
- CRM dashboard with conversion funnel metrics
- Role-based restrictions (SOs cannot reassign leads to others)

---

### 👤 HR Module
- Staff attendance tracking
- Expense claim approval (Travel, Accommodation, etc.)
- Leave management
- Payroll summary

---

### ⚙️ Settings & System
- Company-level settings (name, GST, logo)
- User management (add/edit users, assign roles, set monthly sales targets)
- Financial Year selector persisted across the app (URL + localStorage)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Vanilla CSS + shadcn/ui components |
| State | React Context + TanStack Query (react-query) |
| Charts | Recharts |
| Routing | React Router v6 |
| Backend | Django 4, Django REST Framework |
| Auth | JWT (SimpleJWT) |
| Database | SQLite (via Django ORM) |
| Analytics | Custom ETL pipeline (Kimball Star Schema, SCD Type 2) |

---

## 🚀 Setup & Installation

### Requirements
- Python 3.10+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:8080`

### 3. Environment Variables

**Backend** — create `backend/.env`:
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

**Frontend** — create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 4. Quick Start (Windows)
A convenience script is available at the project root:
```bash
simply-useful.bat
```

---

## 📁 Project Structure

```
simply-useful/
├── backend/
│   ├── api/
│   │   ├── models.py          # All Django ORM models
│   │   ├── views.py           # REST API views
│   │   ├── serializers.py     # DRF serializers
│   │   ├── urls.py            # API route definitions
│   │   └── services/          # ETL, analytics, business logic
│   └── config/                # Django settings
│
└── frontend/
    └── src/
        ├── components/        # Shared UI components (AppLayout, etc.)
        ├── contexts/          # React Context providers (Auth, Data, FY)
        ├── hooks/             # Custom hooks (permissions, inventory, etc.)
        ├── pages/
        │   ├── reports/       # Modular reports (hooks, components, utils)
        │   ├── CRM/           # CRM lead pipeline
        │   ├── InventoryManagement/
        │   └── ...            # All other pages
        ├── api/               # API client + service layer
        └── types/             # Shared TypeScript type definitions
```

---

## 🔑 Default Roles & Permissions

| Permission | SUPERADMIN | ADMIN | SALES | HR | INVENTORY |
|---|:---:|:---:|:---:|:---:|:---:|
| View Reports | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Dealers | ✅ | ✅ | ❌ | ❌ | ❌ |
| SO Territory Mapping | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Inventory | ✅ | ✅ | ❌ | ❌ | ✅ |
| Global Inventory | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Staff | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login/` | Obtain JWT access + refresh tokens |
| GET | `/api/v1/orders/` | List orders (role-scoped) |
| GET | `/api/v1/reports/current-stock` | Live stock level report |
| GET | `/api/v1/reports/sales-summary` | Sales summary report |
| GET | `/api/v1/dealers/` | List dealers |
| PATCH | `/api/v1/dealers/{id}/` | Update dealer (incl. SO reassignment) |
| GET | `/api/v1/distributors/` | List distributors |
| GET | `/api/v1/users/` | List users (admin only) |

Full interactive API documentation available at:
`http://localhost:8000/api/v1/?format=api` *(requires authentication)*

---

## 🛡️ Code Conventions

1. **No hardcoded values** — all config via `.env` files
2. **Role-checked routes** — every sensitive route uses `usePermissions()` on frontend and `IsAuthenticated` + role checks on backend
3. **useMemo everywhere** — expensive report calculations use `useMemo` with proper dependency arrays
4. **Dual-format field support** — API responses support both camelCase and snake_case field names for backwards compatibility
5. **Indian locale** — all currency formatted as `₹` with `en-IN` locale, FY follows Apr–Mar convention

---

*Built with ❤️ for the tile & building materials distribution industry.*
