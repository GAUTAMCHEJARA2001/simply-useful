@echo off
cd backend
echo [1/3] Installing dependencies... > ..\backend_build.log
npm install --no-progress >> ..\backend_build.log 2>&1
echo [2/3] Generating Prisma Client... >> ..\backend_build.log
npx prisma generate >> ..\backend_build.log 2>&1
echo [3/3] Compiling TypeScript... >> ..\backend_build.log
npx tsc >> ..\backend_build.log 2>&1
echo [DONE] Backend build completed. >> ..\backend_build.log
