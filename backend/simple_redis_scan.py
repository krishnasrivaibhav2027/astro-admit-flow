import asyncio
import os
import sys

# Windows event loop fix
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def scan():
    try:
        from redis.asyncio import Redis
        # Use default URL as fallback
        url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        print(f"Connecting to {url}...")
        
        r = Redis.from_url(url)
        keys = []
        async for k in r.scan_iter("*"):
             keys.append(k)
        
        await r.close()
        
        with open("simple_scan_results.txt", "w", encoding="utf-8") as f:
            f.write(f"Count: {len(keys)}\n")
            for k in keys:
                f.write(f"{k.decode('utf-8')}\n")
                
    except Exception as e:
        with open("simple_scan_error.txt", "w") as f:
            f.write(str(e))

if __name__ == "__main__":
    from redis.asyncio import Redis 
    asyncio.run(scan())
