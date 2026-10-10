# 🏛️ Simply Useful — Current System & Source of Truth (CURRENT_SYSTEM.md)

This document provides the definitive architectural map of active production services, sources of truth, operational workflows, and archived/legacy paths in the repository.

---

## 🎯 1. Active Production Structure

The repository is organized around a dual-service setup (Django API + React/Vite SPA):

```txt
simply-useful/
├── backend/               # [ACTIVE] Django 6 REST API (Python 3.12+)
│   ├── api/               # Business endpoints, models, viewsets, services
│   ├── core/              # Multi-tenant PostgreSQL routing, shared auth models
│   ├── config/            # WSGI, ASGI, and Django settings
│   └── manage.py          # Django CLI
├── frontend/              # [ACTIVE] React 18 + Vite + TypeScript Client
│   ├── src/               # Application pages, components, hooks, contexts
│   ├── public/            # Static assets and PWA manifest
│   └── vite.config.ts     # Vite bundler configuration
└── documentation/         # Living technical and business documentation
```

### ⚠️ Legacy & Archived Folders
* `inventory-system/`: Legacy standalone version (Express/TypeScript and early React layout). Deprecated in favor of the unified `backend/` and `frontend/`.
* `backend/src/`: Deprecated legacy Node.js/Prisma backend artifacts.

---

## 🗄️ 2. Database & Multi-Tenant Model

* **Engine:** PostgreSQL 15+ (Hosted on Railway / Neon).
* **Multi-Tenancy:** Warehouse-aware request routing via `HeaderTenantMiddleware`; the app uses warehouse headers and PostgreSQL schemas without the `django-tenants` package.
* **Routing Header:** Outbound frontend requests inject `X-Warehouse-ID: <warehouse_id>`.
* **Schemas:**
  * `public`: Global users, companies, warehouse registries, and global HR employee profiles (`Labour`).
  * `wh_<id>`: Isolated per-warehouse schemas containing transactional inventory, orders, leads, and operational ledgers.

---

## 🚀 3. Key Operational Commands

### Backend (`/backend`)
```bash
# Verify system configuration & migrations
python manage.py check

# Run database migrations across public & tenant schemas
python manage.py migrate

# Start local development server
python manage.py runserver 4000
```

### Frontend (`/frontend`)
```bash
# Start local Vite dev server
npm run dev

# Compile TypeScript and build production bundle
npm run build

# Run linting
npm run lint
```

---

## 📦 4. Major Core Modules

1. **HR & Payroll (`/api/v1/hr/*`)**:
   - Staff directory (`Labour`), daily attendance, sales targets & KPIs.
   - Indian compliance payroll slips (`SalarySlip`) with Basic, HRA, EPF, ESIC, and Advance adjustments.
   - Statutory employee letter generation (Offer, Appointment, Relieving, etc.).
2. **Sales & Distribution (`/api/v1/sales/*`, `/api/v1/dealers/*`)**:
   - Order entry, pricing matrix (GST 18%, 75% landed costs), multi-tier approval workflow (Pending $\rightarrow$ Approved $\rightarrow$ Dispatched).
   - Sales Officer (SO) territory counter mapping.
3. **Inventory & BOM (`/api/v1/products/*`, `/api/v1/bom/*`)**:
   - Multi-batch tracking, stock inward/outward registers, bill of materials assembly, and production logs.
4. **CRM & Field Tracking (`/api/v1/crm/*`, `/api/v1/visits/*`)**:
   - Drag-and-drop lead stage pipeline, client visits with location tracking, and expense reimbursements.
5. **Decision Intelligence & Backups (`/api/v1/reports/*`, `/api/v1/system/*`)**:
   - Star Schema OLAP engine (`FactSales`, `DimDate`, `DimCustomer`), anomaly detection alerts, and automated database backups.
