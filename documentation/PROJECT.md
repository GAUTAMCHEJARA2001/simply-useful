# 🏬 Simply Useful — Project Overview (PROJECT.md)

Simply Useful (internally referred to in boot sequences as **KAMLA OTS**) is a full-stack, enterprise-grade Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) platform specifically optimized for the tile and building materials manufacturing and distribution industries.

---

## 🎯 Purpose

The platform serves as a unified system of record for managing physical warehouses, coordinating field sales operations, processing orders, tracking leads, and monitoring corporate financials. It bridges the gap between field Sales Officers (SOs), distributors, warehouse inventory managers, HR, and corporate administrators.

---

## ⚠️ Problems Solved

1. **Disconnected Operations:** Traditional tile distribution utilizes fragmented channels for inventory tracking, orders, lead management, and expense logs. Simply Useful unifies these workflows.
2. **Territory Mapping Delays:** Mappings between Sales Officers (SOs), dealers, and distributors change frequently. The platform offers instant inline updates and bulk reassignments to keep field sales sync'd.
3. **Inventory Discrepancies:** Tracking stock batches, landed costs, margins, and raw material formulas (BOM) across multiple warehouses is highly prone to human error.
4. **Poor Financial Visibility:** Managers lack structured analytics. The platform builds a custom database Star Schema to run projections on cash, assets, churn risks, and safety stock deficits.

---

## 👥 Target Users & Personas

* **SUPERADMIN:** Holds global corporate access. Reviews cross-warehouse inventories, edits settings, triggers ETL tasks, and inspects profit analytics.
* **ADMIN:** Handles partner records (dealers/distributors), user registrations, territory mapping, order approvals, and staff attendance calendars.
* **SALES (Sales Officers):** Field reps who use the mobile-responsive interface to check their territory, add customer orders, trace leads, log customer visits, and submit travel claims.
* **HR:** Manages the staff roster, registers check-in logs, approves leave requests, and compiles payroll summaries.
* **INVENTORY (Warehouse Managers):** Handles physical warehouse workflows. Receives purchases, compiles batch records, executes BOM productions, dispatches approved orders, and processes customer returns.

---

## 📈 Business Goals

* **Schema-Level Multi-Tenancy:** Keep warehouse transactions completely isolated using PostgreSQL schema separations.
* **Accuracy in Calculations:** Standardize calculations for GST, margins, and landed costs to avoid billing mistakes.
* **Dynamic Sales Coordination:** Facilitate territory mappings with instant updates to reduce administrative overhead.
* **Advanced Analytics:** Empower decision-makers with prediction metrics and live data quality checks.
