import os
import sys

def check():
    with open("sync_redis_result.txt", "w") as f:
        try:
            from redis import Redis
            url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            f.write(f"Connecting to {url}...\n")
            r = Redis.from_url(url)
            if r.ping():
                 f.write("Redis PING success!\n")
                 keys = r.keys("*")
                 f.write(f"Keys found: {len(keys)}\n")
                 for k in keys[:10]:
                     f.write(f" - {k.decode('utf-8')}\n")
            else:
                 f.write("Redis PING failed.\n")
        except Exception as e:
            f.write(f"Redis Error: {e}\n")

if __name__ == "__main__":
    check()
