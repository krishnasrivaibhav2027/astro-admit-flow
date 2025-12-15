@echo off
echo CHECKING NPM... > npm_path.txt
where npm >> npm_path.txt 2>&1
echo CHECKING NODE... >> npm_path.txt
node -v >> npm_path.txt 2>&1
