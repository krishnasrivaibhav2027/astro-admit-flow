
import asyncio
import os
import logging
from dotenv import load_dotenv
from supabase import create_client

# Setup
logging.basicConfig(level=logging.INFO)
load_dotenv()

async def reset_rag():
    logging.info("🧹 Starting RAG Data Reset...")
    
    # 1. Clear Supabase
    try:
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        supabase = create_client(url, key)
        
        logging.info("   Deleting all rows from 'documents' table in Supabase...")
        # Delete all where id is not null (effectively all)
        # Note: 'documents' table might differ if you used a different schema.
        # Standard schema usually has 'id'.
        # We assume standard langchain schema.
        res = supabase.table("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        count = len(res.data) if res.data else 0
        logging.info(f"   ✅ Supabase: Deleted {count} documents.")
    except Exception as e:
        logging.error(f"   ❌ Supabase Error: {e}")

    # 2. Clear Redis
    try:
        from redis_client import redis_manager
        redis_manager._initialize()
        client = redis_manager.get_client()
        
        if client:
            logging.info("   Flushing related Redis keys (graph & vectors)...")
            
            # Delete Graph Keys (sets, hashes)
            # Pattern: subject:*:chapters, chapter:*:topics, topic:*:concepts, concept:*
            keys = []
            for pattern in ["subject:*", "chapter:*", "topic:*", "concept:*", "doc:*"]:
                keys.extend(client.keys(pattern))
            
            if keys:
                client.delete(*keys)
                logging.info(f"   ✅ Redis: Deleted {len(keys)} graph/doc keys.")
            else:
                logging.info("   ℹ️ Redis: No graph keys found to delete.")
                
            # Drop Index
            try:
                client.ft("rag_idx").dropindex(delete_documents=False) # Docs are already deleted via keys usually, but let's be safe
                logging.info("   ✅ Redis: Dropped Vector Index 'rag_idx'.")
            except Exception as e:
                # Index might not exist
                pass
        else:
            logging.warning("   ⚠️ Redis not connected. Skipping Redis clear.")
            
    except Exception as e:
        logging.error(f"   ❌ Redis Error: {e}")

    logging.info("✨ Clean Slate! You can now restart the backend to trigger fresh ingestion.")

if __name__ == "__main__":
    asyncio.run(reset_rag())
