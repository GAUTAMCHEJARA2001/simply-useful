# Simply Useful — ERP Deployment Configurations

This folder houses the automated deployment specifications for the platform.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/GAUTAMCHEJARA2001/simply-useful/tree/30.05.2026)

## 📂 Folder Contents
- `render.yaml`: Blueprint configuration for deploying the Django API Service to Render.

---

## 🚀 Deployment Instructions

### 1. Deploying the Backend on Render
1. Push your repository to GitHub.
2. Sign up on [Render](https://render.com/).
3. In the Render dashboard, click **New** -> **Blueprint**.
4. Link your GitHub account and select your repository.
5. Render will detect the blueprint config, but since it is inside a folder, you will select:
   - **Blueprint Config Path**: `deployment/render.yaml`
6. Click **Apply**.
7. Once successfully deployed, note down your web service URL (e.g. `https://simply-useful-backend.onrender.com`).

### 2. Deploying the Frontend on Vercel
1. Sign up on [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project** -> Connect your GitHub repository.
3. Configure the settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. In **Environment Variables**, add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://simply-useful-backend.onrender.com/api/v1` (replace with your Render URL).
5. Click **Deploy**.

---

## 🔑 Fresh Admin Credentials
Once deployed, open your live Vercel URL and log in using the newly initialized fresh admin account:
- **Email**: `super@kamla.com`
- **Password**: `admin123`

