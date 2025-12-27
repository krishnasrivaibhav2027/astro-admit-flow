import asyncio
import os

# Windows fix
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def dump_redis_keys():
    try:
        from redis.asyncio import Redis
        url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        r = Redis.from_url(url, decode_responses=True)
        
        with open("redis_structure.txt", "w", encoding="utf-8") as f:
            f.write(f"Connecting to: {url}\n")
            
            keys = []
            async for k in r.scan_iter("*", count=1000):
                keys.append(k)
                if len(keys) >= 50:
                    break
            
            f.write(f"Total Keys Found (First 50): {len(keys)}\n")
            for k in keys:
                f.write(f"{k}\n")
                
        await r.close()
        print("Done. Check redis_structure.txt")
        
    except Exception as e:
        with open("redis_structure.txt", "w", encoding="utf-8") as f:
             f.write(f"ERROR: {e}")
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(dump_redis_keys())
