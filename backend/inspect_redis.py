import asyncio
import os
from redis.asyncio import Redis

async def inspect():
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    print(f"Connecting to {redis_url}...")
    redis = Redis.from_url(redis_url)
    
    print("\nScanning for keys...")
    # Scan for everything to see the structure
    keys = await redis.keys("*")
    
    print(f"Found {len(keys)} keys.")
    for k in keys[:20]: # Show first 20
        print(f" - {k.decode('utf-8')}")
        
    await redis.close()

if __name__ == "__main__":
    asyncio.run(inspect())
