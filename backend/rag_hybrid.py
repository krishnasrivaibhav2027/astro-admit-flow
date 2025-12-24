
import os
import logging
import asyncio
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client, Client
from redis_client import get_redis, redis_manager
from rag_supabase import extract_text_from_pdf
from langchain.text_splitter import RecursiveCharacterTextSplitter
from graph_service import GraphService
import numpy as np

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def get_embeddings_model():
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )

def _create_redis_index(client, dim=768):
    """Create Redis Vector Index if not exists"""
    from redis.commands.search.field import TextField, VectorField
    from redis.commands.search.index_definition import IndexDefinition, IndexType
    
    try:
        # Check if index exists
        client.ft("rag_idx").info()
        logging.info("Redis Index 'rag_idx' already exists.")
    except Exception:
        logging.info("Creating Redis Index 'rag_idx'...")
        # Schema
        schema = (
            TextField("content"),
            TextField("subject"),
            TextField("source"),
            VectorField("embedding",
                "FLAT", {
                    "TYPE": "FLOAT32",
                    "DIM": dim,
                    "DISTANCE_METRIC": "COSINE"
                }
            )
        )
        definition = IndexDefinition(prefix=["doc:"], index_type=IndexType.HASH)
        client.ft("rag_idx").create_index(schema, definition=definition)

async def check_and_ingest(subject: str):
    """
    Dual Ingestion: Supabase (Cold) + Redis (Hot) + Graph (Concepts)
    """
    subject = subject.lower()
    
    # 1. Check if documents exist in Supabase (Truth)
    response = supabase.table("documents").select("id", count="exact").contains("metadata", {"subject": subject}).execute()
    count = response.count if response.count is not None else 0
    
    redis_client = get_redis()
    is_stack = redis_manager.is_stack()
    
    if count > 0:
        print(f"✅ RAG: {count} documents already in Supabase for {subject}", flush=True)
        # Optional: Sync to Redis if Redis is empty but Supabase has data?
        # For now, we assume if Supabase has it, we are good or will lazy load later.
        # But to be robust, we could check Redis count.
        return

    print(f"⚠️ RAG: No documents found for {subject}. Initiating Hybrid Ingestion...", flush=True)
    
    # 2. Extract PDF
    pdf_map = {
        "physics": "NCERT-Physics.pdf",
        "math": "NCERT-Math.pdf",
        "chemistry": "NCERT-Chemistry.pdf"
    }
    filename = pdf_map.get(subject)
    if not filename: return
    
    pdf_path = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(pdf_path): return
    
    text = extract_text_from_pdf(pdf_path)
    if not text: return
    
    # 3. Graph Build (Iterative)
    # The user wants ALL chapters covered. We must process the entire text.
    # We'll chunk the text into large blocks (e.g., 50k chars) and process each.
    print("🕸️ Building Knowledge Graph (Full Textbook)...", flush=True)
    
    GRAPH_CHUNK_SIZE = 50000
    total_len = len(text)
    num_graph_chunks = (total_len // GRAPH_CHUNK_SIZE) + 1
    
    for i in range(0, total_len, GRAPH_CHUNK_SIZE):
        chunk_num = (i // GRAPH_CHUNK_SIZE) + 1
        chunk_text = text[i : i + GRAPH_CHUNK_SIZE]
        print(f"   🕸️ Graph Builder: Processing text segment {chunk_num}/{num_graph_chunks} ({len(chunk_text)} chars)...", flush=True)
        try:
            await GraphService.build_graph_from_text(subject, chunk_text)
        except Exception as e:
            print(f"❌ Error in Graph Builder chunk {chunk_num}: {e}", flush=True)

    # 4. Chunking
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = splitter.create_documents([text])
    
    # 5. Embedding & Indexing
    embeddings_model = get_embeddings_model()
    
    # Create Redis Index if needed
    if is_stack:
        _create_redis_index(redis_client)
    
    batch_size = 50
    print(f"🔮 Generating embeddings and Dual-Ingesting {len(docs)} chunks...", flush=True)
    
    for i in range(0, len(docs), batch_size):
        batch = docs[i : i + batch_size]
        batch_texts = [d.page_content for d in batch]
        
        print(f"   ⚙️ Processing Batch {i // batch_size + 1}: Embedding {len(batch)} chunks...", flush=True)
        batch_embeddings = embeddings_model.embed_documents(batch_texts)
        
        # Prepare Supabase Rows
        rows = []
        pipeline = redis_client.pipeline() if is_stack else None
        
        for j, d in enumerate(batch):
            vector = batch_embeddings[j]
            
            # Supabase
            rows.append({
                "content": d.page_content,
                "metadata": {"subject": subject, "source": filename},
                "embedding": vector
            })
            
            # Redis
            if is_stack:
                key = f"doc:{subject}:{i+j}"
                pipeline.hset(key, mapping={
                    "content": d.page_content,
                    "subject": subject,
                    "source": filename,
                    "embedding": np.array(vector, dtype=np.float32).tobytes()
                })
        
        # Execute Supabase Insert
        print(f"   💾 Upserting Batch {i // batch_size + 1} to Supabase...", flush=True)
        supabase.table("documents").insert(rows).execute()
        
        # Execute Redis Insert
        if is_stack:
            print(f"   ⚡ Upserting Batch {i // batch_size + 1} to Redis...", flush=True)
            pipeline.execute()
            
        print(f"   ✅ Processed batch {i // batch_size + 1}", flush=True)
        
    print(f"✅ Hybrid Ingestion complete for {subject}", flush=True)

def _sync_ingest(subject):
    """Synchronous wrapper for check_and_ingest"""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
             # We can't use run_until_complete if loop is running.
             # Schedule it? But we need to block.
             # This is tricky. simpler to just run the sync version of extraction/embedding without async keywords.
             return
        else:
            loop.run_until_complete(check_and_ingest(subject))
    except Exception:
        asyncio.run(check_and_ingest(subject))

def get_context(query: str, subject: str = "physics", k: int = 3, randomize: bool = True) -> List[str]:
    """
    Hybrid Retrieval: Redis (Fast) -> Supabase (Fallback)
    """
    redis_client = get_redis()
    is_stack = redis_manager.is_stack()
    
    # 0. Check Ingestion (Simplified Check)
    # We trust ingestion has happened or will happen in background on startup logic.
    # Otherwise we might block every request.
    
    embeddings_model = get_embeddings_model()
    query_vector = embeddings_model.embed_query(query)
    
    results = []
    
    # 1. Try Redis Vector Search
    if is_stack:
        try:
            from redis.commands.search.query import Query
            q = Query(f"(@subject:{subject})=>[KNN {k} @embedding $vec_param AS score]")\
                .sort_by("score")\
                .return_fields("content", "score")\
                .dialect(2)
            
            params = {"vec_param": np.array(query_vector, dtype=np.float32).tobytes()}
            
            res = redis_client.ft("rag_idx").search(q, query_params=params)
            
            if res.docs:
                logging.info(f"⚡ Redis RAG Hit: Found {len(res.docs)} docs")
                results = [doc.content for doc in res.docs]
                
        except Exception as e:
            logging.error(f"Redis Vector Search failed: {e}. Falling back to Supabase.")
            results = []
            
    # 2. Fallback to Supabase if Redis returned nothing or failed
    if not results:
        try:
            logging.info("🐢 Falling back to Supabase Vector Search...")
            params = {
                "query_embedding": query_vector,
                "match_threshold": 0.5,
                "match_count": k * 2 if randomize else k,
                "filter": {"subject": subject.lower()}
            }
            response = supabase.rpc("match_documents", params).execute()
            
            if response.data:
                # Randomize if requested
                import random
                data = response.data
                if randomize and len(data) > k:
                    data = random.sample(data, k)
                else:
                    data = data[:k]
                    
                results = [d['content'] for d in data]
                
        except Exception as e:
            logging.error(f"Supabase Search Error: {e}")
            
    return results
