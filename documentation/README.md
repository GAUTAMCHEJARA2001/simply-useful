# 📖 Project Documentation Index & Purpose

This directory contains the core technical and functional documentation for Simply Useful. It serves as the project's long-term memory, ensuring that all architectural choices, business logic, workflows, features, limitations, and operational boundaries are fully documented.

---

## 🎯 Documentation Purpose

This documentation is not only written for human developers, project managers, and stakeholders. **Its primary purpose is to provide complete project context to AI coding assistants and development tools.**

The documentation is structured to help AI assistants and developers:
* **Understand the Entire Project:** Grasp the domain, target users, and system architecture without having to read every file in the codebase.
* **Generate Consistent Code:** Write new components, database models, and API endpoints that match existing architectural patterns and styles.
* **Debug Safely:** Identify root causes of anomalies and fix them without causing regressions or breaking isolated multi-tenant workspaces.
* **Make Informed Decisions:** Understand constraints, design choices, and business constraints to make sound technical contributions.
* **Reduce Hallucinations:** Provide clean, structured context to eliminate incorrect assumptions regarding libraries, API payloads, or schema limits.

---

## 👥 Target Audience

We assume the reader of these documents belongs to one of the following groups:
1. **New Developers:** Joining the team and seeking to understand conventions, setups, and database designs.
2. **Project Managers:** Reviewing features, tracking timelines, and planning scope additions.
3. **Clients & Stakeholders:** Inspecting the business value, roles, targets, and functional features.
4. **AI Coding Assistants:** Parsing files to generate code, refactor views, debug errors, or add new features.

---

## 📂 Documentation Directory Map

Select the file that matches the context you need:

| Document | Purpose | Key Contents |
| :--- | :--- | :--- |
| 🏬 **[PROJECT.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/PROJECT.md)** | Overview | Business value, target personas, problem definitions, and corporate goals. |
| 🏗️ **[ARCHITECTURE.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/ARCHITECTURE.md)** | Technical | Multi-tenant schema separation, request header routing, ETL pipelines, and Star Schema tables. |
| 📦 **[FEATURES.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/FEATURES.md)** | Functional | Core user features, functional steps (Auth, CRM, Inventory, BOM, Expenses, Database Backups). |
| ⚖️ **[BUSINESS_RULES.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/BUSINESS_RULES.md)** | Domain | Financial Year rules (Apr-Mar), currency formatting (`₹`), GST (18%), Landed Cost calculations, and roles permission matrix. |
| 🛠️ **[CONTRIBUTING.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/CONTRIBUTING.md)** | Developer | Coding style constraints, type-safety standards, name conventions, logging middleware, and tests. |
| 🤖 **[AI_CONTEXT.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/AI_CONTEXT.md)** | AI Instructions | AI coding guidelines, multi-tenant DB search path limits, design constraints, and schema checking. |
| 📡 **[API.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/API.md)** | Integration | REST endpoint listings (Auth, Master Data, Sales transactions, Reporting paths, Health). |
| 🗺️ **[ROADMAP.md](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/documentation/ROADMAP.md)** | Future | Upcoming integrations (offline apps, LSTM forecasting, supplier portal, automated GST e-way bills). |

---

## 🏆 Success Metric

The success of this documentation is measured by **whether an AI assistant can accurately build, modify, and maintain this software using these files as its primary source of knowledge.** Completeness and clarity are prioritized over brevity. Keep this documentation updated whenever structural changes are merged into the codebase.
