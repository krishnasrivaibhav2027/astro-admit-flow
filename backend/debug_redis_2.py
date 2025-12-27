import asyncio
import os
from redis.asyncio import Redis

async def inspect():
    try:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        
        with open("debug_log.txt", "w") as f:
            f.write(f"Connecting to {redis_url}\n")
            
        redis = Redis.from_url(redis_url)
        
        keys = []
        async for key in redis.scan_iter("*"):
            keys.append(key)
            if len(keys) >= 100:
                break
        
        with open("debug_keys_2.txt", "w", encoding="utf-8") as f:
            f.write(f"Total keys found: {len(keys)}\n")
            for k in keys:
                f.write(f"{k.decode('utf-8')}\n")
                
        await redis.close()
        
    except Exception as e:
        with open("debug_error.txt", "w") as f:
            f.write(str(e))

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect())
