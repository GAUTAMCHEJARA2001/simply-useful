# 🛠️ Simply Useful — Developer Guidelines (CONTRIBUTING.md)

This document establishes the coding conventions, naming structures, logging workflows, and testing requirements for the Simply Useful codebase.

---

## 💻 Coding Standards

### 1. Frontend (React & TypeScript)
* **Type Safety:** The use of `any` is strictly prohibited. Define explicit interface models inside `src/types/` for all network requests, serializers, and state objects.
* **Server State Synchronization:** Remote data must be handled using TanStack Query hooks. Configure a polling fallback on important listing queries to synchronize tables.
* **Performance Optimization:** Memoize expensive calculations (e.g. currency totals, report filters, and search queries) using `useMemo` hooks with proper dependency arrays.
* **Tab Form Traversal:** All data forms must support traversal via the **Enter** keypress, moving focus to the next logical input fields instead of submitting the form (intercepted globally in [App.tsx](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/App.tsx)).

### 2. Backend (Django REST Framework)
* **Database Optimization:** All custom endpoint queries must prevent N+1 issues by explicitly joining relation keys using `.select_related()` and `.prefetch_related()`.
* **DRF Serializers:** Extend `rest_framework.serializers.ModelSerializer` for API schemas. Write explicit field mappings to format inputs.
* **Dual Case Payloads:** Views and serializers must handle both `camelCase` and `snake_case` input parameters to support backward compatibility.

---

## 🔤 Naming Conventions

### 1. React Frontend
* **UI Components & Contexts:** **PascalCase** (e.g. `BOMManagement.tsx`, `AuthContext.tsx`).
* **Custom Hooks & Functions:** **camelCase** (e.g. `usePermissions.ts`, `apiClient()`).
* **Folder Directories & CSS Styles:** **camelCase** or **kebab-case** (e.g. `inventory/`, `index.css`).

### 2. Django Backend
* **Database Models & Views:** **PascalCase** (e.g. `Dispatchlog`, `OrderViewSet`).
* **Table Fields & Variables:** **snake_case** (e.g. `company_id`, `stock_method`).

---

## 🛡️ Error Handling Patterns

* **Frontend Interceptors:**
  * Network requests returning `401 Unauthorized` responses prompt Axios to refresh the token.
  * If a `403 Forbidden` is returned or refresh fails, it clears local storage and calls `forceLogout()`, redirecting to `/login`.
  * If a `404 Not Found` is returned, the client retries the endpoint with a corrected route format using [routeHealing.ts](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/frontend/src/api/routeHealing.ts).
* **React Rendering Safeguards:** Critical dashboard views must be wrapped inside the `ErrorBoundary` container component to prevent blank screen crashes.
* **Backend Database Safe-Guards:** Missing relation audits check if schemas are not fully migrated, returning fallback messages instead of DB stack traces.

---

## 📝 Logging Practices

* **SQL Audits:** All PostgreSQL database calls run through `TenantQueryLoggingMiddleware` to write performance metrics.
* **Routing Alerts:** The backend middleware outputs warning lines if a client-side request fails to pass the warehouse header and defaults to the first active warehouse context.

---

## 🧪 Testing Requirements

Before merging updates, confirm that all automated checks compile without errors:
1. **TypeScript Auditing:** Run the TypeScript compile check to verify there are no syntax or type errors:
   ```bash
   node node_modules/typescript/bin/tsc --noEmit
   ```
2. **Backend Checks:** Run Django tests to verify core logic:
   ```bash
   python manage.py test api core
   ```
3. **Frontend Checks:** Run Vitest components tests:
   ```bash
   npm run test
   ```
4. **Convenience Script:** Alternatively, use the CLI platform tool:
   ```bash
   simply-useful.bat
   ```
   Select option **`[5]` System Audit** or option **`[4]` Full-Stack Test Suite**.
