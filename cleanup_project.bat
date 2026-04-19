@echo off
echo Cleaning root junk...
if exist node_modules rmdir /s /q node_modules
if exist .cache rmdir /s /q .cache
if exist .vite rmdir /s /q .vite
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out
if exist coverage rmdir /s /q coverage
if exist .prisma rmdir /s /q .prisma
del /f /q *.log
del /f /q test_file.txt
del /f /q test_success.txt

echo Cleaning backend junk...
pushd backend
if exist node_modules rmdir /s /q node_modules
if exist .cache rmdir /s /q .cache
if exist dist rmdir /s /q dist
popd

echo Cleaning frontend junk...
pushd frontend
if exist node_modules rmdir /s /q node_modules
if exist .cache rmdir /s /q .cache
if exist dist rmdir /s /q dist
popd

echo Cleanup Complete!
