@echo off
echo FINDING NODE... > server_direct.txt
where node >> server_direct.txt 2>&1

echo DIRECT LAUNCH... >> server_direct.txt
node node_modules/vite/bin/vite.js >> server_direct.txt 2>&1
