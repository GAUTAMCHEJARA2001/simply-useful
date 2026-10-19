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
| **Generate & Issue HR Letters** | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 📜 Indian Labor & Statutory HR Letter Compliance Rules

All HR letters generated in the system must comply with mandatory Indian employment legislation:

1. **Offer & Appointment Letters:**
   * Basic Salary must represent at least **40% to 50%** of monthly Gross CTC.
   * Statutory Deductions (EPF at 12% on Basic up to wage ceiling ₹15,000, ESIC at 0.75% employee / 3.25% employer if Gross $\le$ ₹21,000/month, and Professional Tax per state schedule).
   * Payment of Gratuity Act provision calculated at $4.81\%$ of Basic Salary.
   * Probation period standard duration must be explicitly stated (typically 3 or 6 months) along with notice period terms.

2. **Disciplinary & Show Cause Notices:**
   * Must uphold the **Principles of Natural Justice** (audi alteram partem): employees must be granted a fair window (minimum 48 to 72 hours) to submit a formal written explanation before adverse disciplinary actions or termination.
   * Warning memos must cite specific date, clause, and incident details.

3. **Separation & Exit Compliance:**
   * Resignation acceptance must specify the official **Last Working Day (LWD)** and notice period buyout/waiver terms.
   * Relieving Letter and Experience Certificate can only be issued upon completion of Full & Final (F&F) settlement and departmental clearance.

---

## 🔒 Resource Isolation & Ownership

### 1. Multi-Tenant Database Isolation
* Operational data (orders, stock, leads, customer profiles) must never cross database schemas. The active schema is isolated based on the client's `X-Warehouse-ID` header.
* Data modifications to transactional records are blocked if the connection resolves to the global schema (`public`).

### 2. Object Ownership Guards
* **Sales Officers:** Restricted to viewing and editing leads assigned to them.
  * *Backend Enforcement:* Verified by [IsLeadOwnerOrAdmin](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/backend/api/permissions.py) matching the token's `userId`.
* **Inventory Managers:** Access is restricted to schemas matching the warehouses defined in the `UserWarehouseAccess` join table.
