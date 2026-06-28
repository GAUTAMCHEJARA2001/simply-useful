# 📡 Simply Useful — API Reference Guide (API.md)

This document catalogs the REST API endpoints and integration patterns used to communicate between the React client and the Django REST Framework backend.

---

## 🔑 Authentication Endpoints

* **POST** `/api/v1/auth/login`
  * *Description:* Submits email and password to receive JWT access and refresh tokens.
* **POST** `/api/v1/auth/refresh`
  * *Description:* Rotates refresh token to issue a new access token.
* **GET** `/api/v1/auth/permissions`
  * *Description:* Resolves roles and active access lists for the current authenticated user.

---

## 🗃️ Master Data Endpoints

Exposes CRUD resources managed via standard DRF ViewSets:
* `/api/v1/users` — Staff directory details.
* `/api/v1/products` — Product catalog definitions.
* `/api/v1/masters/categories` — Product categories.
* `/api/v1/masters/brands` — Product brands.
* `/api/v1/masters/warehouses` — Warehouse directory.
* `/api/v1/masters/units` — Measurement units.
* `/api/v1/masters/regions` — Geographic territories.
* `/api/v1/masters/markets` — Regional market contexts.
* `/api/v1/masters/suppliers` — Supplier registry records.
* `/api/v1/masters/labours` — Labor details.

---

## 🤝 Partner & Sales Endpoints

* `/api/v1/dealers` — Customer counters (retailers).
* `/api/v1/distributors` — Wholesale distribution partners.
* `/api/v1/sales` — Order placements and statuses.
* `/api/v1/visits` — Field customer interactions.
* `/api/v1/expenses` — Travel and claim submissions.
* `/api/v1/bom` — Bill of Materials (BOM) formulas.
* `/api/v1/crm/leads` — Pipeline cards (Kanban stages).
* `/api/v1/broadcasts` — Notification notices.

---

## 🔄 Transactional Custom Routes

To support custom states and approvals, the system routes these endpoints specifically:
* **GET/POST** `/api/v1/transactions/purchases` — Retrieve inventory purchases or stock-in.
* **GET/POST** `/api/v1/transactions/sales` — Retrieve sales logs.
* **GET/POST** `/api/v1/transactions/approvals` — Pending order queues awaiting authorization.
* **POST** `/api/v1/transactions/approvals/{id}/approve` — Moves status from Pending to Approved.
* **POST** `/api/v1/transactions/approvals/{id}/dispatch` — Generates a dispatch log and decrements inventory batches.
* **POST** `/api/v1/transactions/approvals/{id}/reject` — Rejects a pending sales order.
* **GET/POST** `/api/v1/transactions/productions` — Records material transformation runs.
* **GET/POST** `/api/v1/transactions/purchase-orders` — Purchase Orders issued to raw suppliers.

---

## 📊 Analytical Reporting Routes

Endpoints that access the compiled Star Schema dimension tables:
* **GET** `/api/v1/reports/dashboard-kpis` — Summarized cards metrics (Sales, Orders, Visits).
* **GET** `/api/v1/reports/sales-summary` — Indian FY performance breakdown.
* **GET** `/api/v1/reports/current-stock` — Safety limits and active batch levels.
* **GET** `/api/v1/reports/global-inventory` — Cross-warehouse inventory details (SuperAdmin only).
* **GET** `/api/v1/analytics/kpis` — CFO performance metrics.
* **POST** `/api/v1/analytics/trigger-etl` — Compiles Fact and Dimension schemas.

---

## 🏥 Diagnostics & System Recovery

* **GET** `/api/v1/health` — Returns status updates (`{"status": "ok"}`).
* **GET** `/api/v1/metrics` — Emits hardware and connection statistics.
* **GET** `/api/v1/system/local-backups` — Lists previous PostgreSQL sql dump files.
* **POST** `/api/v1/system/restore-postgres-dump` — Triggers a backup rollback sequence.
