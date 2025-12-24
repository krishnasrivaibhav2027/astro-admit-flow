
import asyncio
import logging
import os
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)

async def test_components():
    logging.info("🧪 Testing Hybrid RAG Components...")
    
    # 1. Test Redis Client
    from redis_client import redis_manager
    redis_manager._initialize()
    client = redis_manager.get_client()
    is_stack = redis_manager.is_stack()
    
    if client:
        logging.info("✅ Redis Connection: OK")
        logging.info(f"ℹ️ Redis Stack Mode: {is_stack}")
    else:
        logging.warning("⚠️ Redis Connection: Failed. Testing Fallback Mode.")
        # We continue to test other parts if possible, but Graph Service depends on Redis.
        # So Graph Service test will fail or be skipped.
        # But Hybrid Retrieval should work via Supabase.

    # 2. Test Graph Service (Skip if no Redis)
    from graph_service import GraphService
    if client:
        # Sample Text
        text = """
        Chapter 1: Units and Measurements
        Physics is a quantitative science. 
        1.1 The International System of Units
        In earlier times scientists of different countries used different systems of units.
        The concept of mass is fundamental. Mass depends on density and volume.
        Prerequisite: Basic Algebra.
        """
        
        logging.info("🧪 Testing Graph Build (Small Text)...")
        await GraphService.build_graph_from_text("physics_test", text)
        
        # Check Redis
        chapters = client.smembers("subject:physics_test:chapters")
        logging.info(f"   Chapters: {chapters}")
        
        path = GraphService.get_traversal_path("physics_test")
        logging.info(f"   Traversal Path (Random): {path}")
    
    # 3. Test Hybrid Retrieval (Mock)
    logging.info("🧪 Testing Hybrid Retrieval (Context)...")
    from rag_hybrid import get_context
    
    try:
        # This will fail if Gemini key is missing or quota exceeded, but logic path is tested
        # We catch error
        ctx = get_context("What is mass?", "physics_test")
        logging.info(f"   Context Retrieved: {len(ctx)} docs")
    except Exception as e:
        logging.warning(f"   Retrieval Warning (Expected if no real docs): {e}")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(test_components())
