# 📦 Simply Useful — Features & Workflows (FEATURES.md)

This document describes the key features, operational workflows, user interactions, module dependencies, and functional limitations of the Simply Useful ERP.

---

## 🔐 1. Authentication & Route Guarding

* **Purpose:** Restricts system resources based on verified user credentials and role hierarchies.
* **Workflow:**
  * User submits credentials on the login screen.
  * Backend processes requests, yields access and refresh tokens, and verifies active flags.
  * Tokens are cached in `localStorage`.
  * The frontend client appends the access token to the HTTP `Authorization` header.
* **User Interactions:**
  * Clean login interface with an interactive password visible toggle.
  * Dynamically matches roles to load authorized dashboard panels (e.g. Sales dashboard, Admin panel, HR console).
* **Dependencies:** `JWTAuthentication`, `AuthContext.tsx`, `usePermissions.ts`.
* **Limitations:** If an access token expires, Axios interceptors attempt to refresh it automatically. If the refresh token has expired, the user session is closed, credentials are cleared, and the browser is redirected to `/login`.

---

## 🛒 2. Sales Order Orchestration

* **Purpose:** Places orders, computes pricing margins, and automates multi-level workflows.
* **Workflow:**
  * Sales Officer creates a Sales Order, selects a Dealer, and adds items.
  * The order status defaults to **Pending**.
  * The Admin checks the order details and approves the order.
  * The Inventory Manager dispatches the products, generating a dispatch log and adjusting stock.
  * Once completed, the status is updated to **Completed**.
* **User Interactions:**
  * Multi-item data entry grid featuring live calculations of gross totals, GST (18%), and net margins.
  * Active order listings with status badges, search queries, and date-range filters.
* **Dependencies:** `OrderViewSet`, `useSales` hook, [SalesModal.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/InventoryManagement/modals/SalesModal.tsx).
* **Limitations:** Orders cannot be dispatched if quantities exceed the available stock levels of active batches in the warehouse.

---

## 🗺️ 3. SO Territory Mapping

* **Purpose:** Allows administrators to map dealers and distributors to specific Sales Officers.
* **Workflow:**
  * The Admin selects single or multiple customer rows.
  * The Admin updates the assigned Sales Officer dropdown cell.
  * Clicking "Apply" saves updates immediately to the backend database.
* **User Interactions:**
  * Custom territory mapping board (`/admin/so-mapping`) with checkbox selectors for bulk actions and instant save features.
  * Responsive cards showing the count of partners per SO.
  * Sales Officer views assigned counters under the "My Territory" dashboard panel.
* **Dependencies:** [SOMapping.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/SOMapping.tsx), `DealerViewSet`, `DistributorViewSet`.

---

## 👥 4. CRM Lead Pipeline

* **Purpose:** Manages customer relationships and monitors prospect status.
* **Workflow:**
  * User creates a lead card.
  * Cards are moved across stage columns:
    $$\text{New} \longrightarrow \text{Contacted} \longrightarrow \text{Qualified} \longrightarrow \text{Proposal} \longrightarrow \text{Won / Lost}$$
  * User logs follow-up notes and records interaction dates.
* **User Interactions:**
  * Responsive Kanban board panel featuring drag-and-drop actions.
  * Search filters to query contacts by city, stage, or Sales Officer.
* **Dependencies:** `LeadViewSet`, [LeadsPage.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/CRM/LeadsPage.tsx).
* **Limitations:** Sales Officers are restricted to viewing and editing leads assigned directly to their profile. Admins and Managers have global CRM view permissions.

---

## 📦 5. Inventory & BOM Production

* **Purpose:** Tracks stock levels and handles assembly requirements.
* **Workflow:**
  * Warehouse receives Purchase Orders and registers items into active batches.
  * Production runs consume raw ingredients to manufacture finished items according to a Bill of Materials (BOM).
* **User Interactions:**
  * Batch lists showing expiry limits and warehouse locations.
  * PO creation sheets containing item search fields.
  * Assembly buttons to run production recipes.
* **Dependencies:** `ProductViewSet`, `BOMViewSet`, [InventoryDashboard.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/InventoryDashboard.tsx).
* **Limitations:** Cross-schema global inventory checks are restricted to `SUPERADMIN` profiles.

---

## 👤 6. Staff Attendance & Expense Claims

* **Purpose:** Registers employee shifts and travel claims.
* **Workflow:**
  * Staff punches in to log check-in times.
  * Staff registers expense files (receipt images/PDFs) and selects travel categories.
  * HR reviews records and approves or rejects payouts.
* **User Interactions:**
  * User check-in toggles.
  * Document upload widgets.
  * Admin review lists with approve/reject action buttons.
* **Dependencies:** [HRDashboard.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/HRDashboard.tsx), `ExpenseViewSet`.

---

## 📊 7. Decision Intelligence & Reports

* **Purpose:** Generates reporting graphs and business forecasts.
* **Workflow:**
  * Users trigger the analytical ETL sequence.
  * Star-schema tables are compiled.
  * Analytics pages read dimensions to show financial estimates and performance stats.
* **User Interactions:**
  * Reporting dashboard with Recharts graphs.
  * CSV exports containing current tabular scopes.
  * Warnings alert feed showing anomalies.
* **Dependencies:** `analytics_etl.py`, `alert_engine.py`, [Reports.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/pages/Reports.tsx).

---

## 💾 8. Database Backups & Recovery

* **Purpose:** Creates backups to prevent data loss and enables database recovery.
* **Workflow:**
  * Admins click options to generate a database export.
  * The backend triggers shell tasks to write full SQL database dumps.
  * Admins select previous backups to restore the database to an earlier state.
* **User Interactions:**
  * File list of previous backups showing timestamps, files sizes, and download actions.
  * Recovery buttons that prompt for confirmation before restoring a backup.
* **Dependencies:** `/api/v1/system/local-backups` routes, Django system handlers.
