import asyncio
import os
from redis.asyncio import Redis

async def inspect():
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    print(f"Connecting to {redis_url}...")
    redis = Redis.from_url(redis_url)
    
    keys = await redis.keys("*")
    
    with open("debug_keys.txt", "w", encoding="utf-8") as f:
        f.write(f"Total keys: {len(keys)}\n")
        for k in keys:
            f.write(f"{k.decode('utf-8')}\n")
            
    await redis.close()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect())
