@echo off
echo Moving folders... >> move_full.log
move src frontend\ >> move_full.log 2>&1
move public frontend\ >> move_full.log 2>&1
echo Moving config files... >> move_full.log
move package.json frontend\ >> move_full.log 2>&1
move package-lock.json frontend\ >> move_full.log 2>&1
move bun.lockb frontend\ >> move_full.log 2>&1
move tsconfig.json frontend\ >> move_full.log 2>&1
move tsconfig.app.json frontend\ >> move_full.log 2>&1
move tsconfig.node.json frontend\ >> move_full.log 2>&1
move vite.config.ts frontend\ >> move_full.log 2>&1
move vitest.config.ts frontend\ >> move_full.log 2>&1
move tailwind.config.ts frontend\ >> move_full.log 2>&1
move postcss.config.js frontend\ >> move_full.log 2>&1
move eslint.config.js frontend\ >> move_full.log 2>&1
move components.json frontend\ >> move_full.log 2>&1
echo Done. >> move_full.log
dir frontend >> move_full.log
