# Simply Useful ERP — Deployment Information

This document details where the **Simply Useful ERP** application services are hosted, how the deployment workflow is configured, and key details required to manage or debug the live systems.

---

## 🗺️ Deployment Overview

The application is split into a **Frontend (Single Page Application)** and a **Backend (Django Web API + PostgreSQL)**. Pushing code to the `main` branch of the GitHub repository triggers automatic builds and deployments on both hosting platforms.

```
                  ┌──────────────────────────────┐
                  │      GitHub Repository       │
                  │   GAUTAMCHEJARA2001/simply   │
                  └──────────────┬───────────────┘
                                 │ (Push to main)
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │  Vercel Hosting  │            │  Render Hosting  │
       │    (Frontend)    │            │    (Backend)     │
       └─────────┬────────┘            └─────────┬────────┘
                 │                               │
                 ▼                               ▼
     https://simply-useful.vercel.app  https://simply-useful-backend.onrender.com
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │    PostgreSQL    │
                                       │   (simply-db)    │
                                       └──────────────────┘
```

---

## 🎨 1. Frontend (Client SPA)

* **Hosting Platform**: [Vercel](https://vercel.com/)
* **Live URL**: `https://simply-useful.vercel.app/`
* **Repository Root**: `frontend/`
* **Framework Preset**: Vite / React / TypeScript

### Build Settings
* **Build Command**: `npm run build`
* **Output Directory**: `dist/`
* **Install Command**: `npm install`

### Important Environment Variables
| Variable | Value / Description | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://simply-useful-backend.onrender.com/api/v1` | Connects the React client to the live Render backend API endpoints. |

### Build Resilience Config
The frontend includes a custom `safeLazy` wrapper in `App.tsx`. When a new deployment changes chunk hashes on Vercel, the client will automatically catch any loading errors and trigger a hard refresh (`window.location.reload()`) to seamlessly pull the latest version without showing a crash screen to users.

---

## ⚙️ 2. Backend (Web API)

* **Hosting Platform**: [Render Web Services](https://render.com/)
* **Live API URL**: `https://simply-useful-backend.onrender.com/api/v1`
* **Repository Root**: `backend/`
* **Runtime Environment**: Python (Gunicorn / WSGI)

### Deployment Specification (`deployment/render.yaml`)
Render is configured using a Blueprint spec. Key configurations include:
* **Build Command**: 
  ```bash
  cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput --skip-checks
  ```
* **Start Command**: 
  ```bash
  cd backend && python manage.py migrate --fake-initial && python seed_kamla.py && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
  ```

### Important Environment Variables
| Variable | Value / Source | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Linked directly to `simply-useful-db` | Connection string for the PostgreSQL database. |
| `DEBUG` | `False` | Disables debug logs and stack traces in production. |
| `SECRET_KEY` | *(Auto-generated)* | Used by Django for sessions and security hashing. |
| `JWT_SECRET` | `simply-useful-secret-key-123-super-secure-key-2026` | Key used to sign and verify JWT authentication tokens. |
| `ALLOWED_HOSTS` | `*` | Allows connections from Vercel. |

---

## 🗄️ 3. Database (PostgreSQL)

* **Database Type**: PostgreSQL (Managed on Render)
* **Service Name**: `simply-useful-db`
* **Plan**: Free / Starter (as configured in blueprint)

### Multi-Tenant Architecture
* **Tenant Isolation**: The system implements schemas (e.g. `wh_nashik`, `wh_jaipur`, `public`) within the database. 
* **Dynamic Scoping**: The Django tenant middleware parses incoming `X-Warehouse-ID` headers to run database commands on the correct warehouse schema on a per-request basis.
* **Auto-Seeding**: During startup, `seed_kamla.py` is run to initialize default products, warehouse categories, units, and default users inside the active databases.

---

## 🔑 4. Critical Administration Credentials

Use these credentials to log in to the newly deployed live site as an administrator:

* **Super Admin Login**:
  * **Email**: `super@kamla.com`
  * **Password**: `admin123`
* **Sales Officer Login**:
  * **Email**: `vruti@kamla.com`
  * **Password**: `sales123`
* **Inventory Manager Login**:
  * **Email**: `wh@kamla.com`
  * **Password**: `wh123`

---

## 🛠️ 5. Deployment / CI-CD Management

If you make modifications to the codebase:
1. Stage and commit your changes locally:
   ```bash
   git add .
   git commit -m "Your description of changes"
   ```
2. Push your changes to GitHub:
   ```bash
   git push origin main
   ```
3. **Vercel** and **Render** will automatically listen to this push, compile the builds, run migrations, and publish the live production build automatically within 2–5 minutes.
