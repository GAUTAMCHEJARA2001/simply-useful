# Simply Useful - Inventory & Sales Management

A robust, feature-based full-stack application for inventory tracking, sales management, and HR reporting.

## 🚀 Setup & Installation

### 1. Requirements
- Node.js (v18+)
- PostgreSQL Database

### 2. Environment Configuration
Create `.env` files in both the `backend` and `frontend` directories using the provided templates:

- **Backend**: Copy `backend/.env.example` to `backend/.env` and add your database URL and JWT secret.
- **Frontend**: Copy `frontend/.env.example` to `frontend/.env`.

### 3. Install Dependencies
Run the following command from the root directory:
```bash
npm run install:all
```

### 4. Database Setup
Run the following commands inside the `backend` folder:
```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Start Development
Run the following command from the root directory to start both backend and frontend:
```bash
npm run dev
```

## 🧱 Project Structure

The project follows a **Feature-Based Structure** for maximum scalability:

- `backend/src/features/`: Contains business logic grouped by domain (auth, inventory, sales).
- `frontend/src/features/`: UI components and logic grouped by feature.
- `shared/`: Common utilities and middleware used across features.

## 🛡️ Clean Code Rules
1. **Never Hardcode**: Use the centralized `config` layer for all env variables.
2. **Error Handling**: Use the `apiClient` in the frontend and `asyncHandler` in the backend for consistent error management.
3. **Validation**: Always validate API inputs using Zod schemas.
