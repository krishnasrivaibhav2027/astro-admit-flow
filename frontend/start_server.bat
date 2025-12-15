@echo off
echo Starting server... > server_output.txt
npm run dev >> server_output.txt 2>&1
