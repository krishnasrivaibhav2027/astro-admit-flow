import asyncio
import logging
import os
import sys

# Setup logging
logging.basicConfig(level=logging.INFO)

async def init_redis_indices():
    print("🚀 Initializing Redis Indices for LangGraph...")
    
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    print(f"Target Redis: {redis_url}")
    
    # Import INSIDE the loop to ensure AsyncRedisSaver finds the running loop
    # and to avoid UnboundLocalError
    try:
        from chatbot_graph import shared_checkpointer
    except Exception as ie:
        print(f"Detailed Import Error: {ie}")
        # Retrying import might not help if module level failed, but let's see logic flow
        return

    if not shared_checkpointer:
        print("❌ Error: shared_checkpointer is None. It seems AsyncRedisSaver failed to init.")
        return

    try:
        # Try running setup (no args required for this version)
        print("💾 Found checkpointer. Running asetup()...")
        await shared_checkpointer.asetup()
        print("✅ Successfully ran asetup(). Indices should be ready.")
    except TypeError as te:
        print(f"❌ TypeError during asetup: {te}")
    except Exception as e:
        print(f"❌ Failed to run asetup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(init_redis_indices())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Script Error: {e}")
