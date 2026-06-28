# 🤖 Simply Useful — AI Context & Coding Rules (AI_CONTEXT.md)

This document provides instructions, constraints, and coding rules for AI assistants (like Antigravity or Gemini/Claude) when generating code or refactoring systems for this project.

---

## 🔒 Crucial Architectural Rules

### 1. Maintain Schema Separation (django-tenants)
* Do not write backend database queries that combine public schema fields and tenant schema fields in direct SQL.
* Public database models (`User`, `Company`, `Warehouse`) must be queried using standard Django ORM methods.
* Transactional records (`Order`, `Product`, `Stockbatch`) reside in tenant schemas. When querying, ensure the request has passed through `HeaderTenantMiddleware` or set the search path connection programmatically.
* For multi-tenant queries executed outside web requests (e.g. cron tasks, CLI scripts), utilize `setup_dynamic_tenant_databases()` or cross-db routing utilities in [db_router.py](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/backend/api/db_router.py).

### 2. Propagate the Tenant Header
* All new API services defined in frontend `src/api/services/` must utilize the custom Axios client (`api`).
* Do not bypass the `X-Warehouse-ID` header injection unless hitting public authentication endpoints.

### 3. Star Schema Analytics Integrity
* Do not query raw transactional tables (`api_order`, `api_expense`) directly for aggregated analytics or report calculations. Instead, fetch from analytical dimensions and facts (`DimSO`, `FactSales`, `FactExpenses`).
* If transactional tables are updated or new records are written, remember that the analytical views will not reflect updates until `analytics_etl.py` is executed to recompile the facts.

---

## 🎨 Frontend Design Constraints

* **Aesthetics Matter:** Maintain the premium styling framework. Use dynamic micro-animations, glassmorphism card panels, Outfit/Inter fonts, and HSL custom colors.
* **Do Not Create Tailwind Drift:** Stick to custom CSS parameters defined in [index.css](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/index.css) instead of adding ad-hoc Tailwind color classes.
* **Support Enter-Key Focus Routing:** Ensure that newly added form fields support keypress traversal by using standard inputs, selects, or combobox buttons that are caught by the keydown interceptor in `App.tsx`.

---

## 🤖 AI Execution Rules

When generating code:
1. **Follow the Existing Architecture:** Reuse the service-layer aggregations and DRF viewsets patterns.
2. **Reuse Existing Components:** Check `src/components/` and `src/components/ui/` for existing buttons, cards, date pickers, or inputs before generating raw HTML blocks.
3. **Do Not Duplicate Logic:** Search the analytics services under `backend/api/services/` before implementing new mathematical forecasts or calculations.
4. **Preserve Compatibility:** Support both camelCase and snake_case request parameters.
5. **Verify Changes:** Write test configurations and run the typescript checks.
6. **Keep Docs Sync'd:** Update the relevant documentation files in `documentation/` if your modifications add database models, endpoints, or rules.
