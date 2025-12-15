@echo off
echo CHECKING BUN... > tools_check.txt
where bun >> tools_check.txt 2>&1
echo CHECKING NODE via npm... >> tools_check.txt
call npm -v >> tools_check.txt 2>&1
