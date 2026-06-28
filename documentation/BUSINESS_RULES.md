# ⚖️ Simply Useful — Business & Domain Rules (BUSINESS_RULES.md)

This document maps out the core business logic, domain rules, calculation formulas, and permission boundaries of the ERP platform.

---

## 📅 Indian Financial Year (FY) Preset

* **Scope:** All operational dashboards, visual charts, sales performance summaries, and tabular logs are default-scoped to the **Indian Financial Year** (April 1st to March 31st).
* **Implementation:** The active financial year is managed globally via React Context ([FinancialYearContext.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/contexts/FinancialYearContext.tsx)), which stores the active preset to both the URL parameters and `localStorage`.

---

## 🇮🇳 Indian Currency & Formatting

* **Formatting:** All currency fields must format output values with the Indian Rupee symbol (`₹`).
* **Implementation:** Values are formatted using the `en-IN` locale formatting rule:
  ```typescript
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
  ```

---

## 🧮 Calculations & Pricing Formulas

To prevent calculation mismatches between the React client and Python REST APIs, the system enforces the following mathematical pricing formulas:

### 1. GST (Goods & Services Tax)
* **Standard Rate:** Fixed at **18%** flat.
* **Formulas:**
  $$\text{Gross Sales} = \text{Quantity} \times \text{Unit Sales Price}$$
  $$\text{Net Revenue} = \frac{\text{Gross Sales}}{1.18}$$
  $$\text{Tax Amount} = \text{Gross Sales} - \text{Net Revenue}$$

### 2. Landed Cost & Profit Margins
* **Landed Cost Model:** Programmatic unit cost representing raw cost price, set at **75%** of the product rate:
  $$\text{Landed Cost} = \text{Quantity} \times (\text{Unit Sales Price} \times 0.75)$$
  $$\text{Margin} = \text{Net Revenue} - \text{Landed Cost}$$

---

## 🔑 Permissions & User Roles

The platform enforces permissions on the frontend (views and buttons) and the backend (API controllers) according to the following matrix:

| Action / Permission | SUPERADMIN | ADMIN | SALES | HR | INVENTORY |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Access Reports** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Partner Directory** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **SO Territory Mappings** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Orders** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Approve Orders** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Local Inventory** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Access Global Inventory** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Staff Directory** | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 🔒 Resource Isolation & Ownership

### 1. Multi-Tenant Database Isolation
* Operational data (orders, stock, leads, customer profiles) must never cross database schemas. The active schema is isolated based on the client's `X-Warehouse-ID` header.
* Data modifications to transactional records are blocked if the connection resolves to the global schema (`public`).

### 2. Object Ownership Guards
* **Sales Officers:** Restricted to viewing and editing leads assigned to them.
  * *Backend Enforcement:* Verified by [IsLeadOwnerOrAdmin](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/backend/api/permissions.py) matching the token's `userId`.
* **Inventory Managers:** Access is restricted to schemas matching the warehouses defined in the `UserWarehouseAccess` join table.
