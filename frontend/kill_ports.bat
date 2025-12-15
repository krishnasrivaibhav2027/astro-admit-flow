@echo off
powershell -Command "Get-NetTCPConnection -LocalPort 3000,3001,3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Select-Object -Unique | ForEach-Object { Write-Host 'Killing PID:' $_; Stop-Process -Id $_ -Force }" > kill_log.txt 2>&1
type kill_log.txt
