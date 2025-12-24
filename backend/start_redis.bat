@echo off
echo Stopping old redis...
docker rm -f redis
docker rm -f redis-stack
echo Starting Redis Stack...
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
echo Done.
docker ps
