@echo off
echo Starting move... > move_debug.log
move /Y index.html frontend\index.html >> move_debug.log 2>&1
echo Move done. >> move_debug.log
dir frontend >> move_debug.log
