import os
import random
import time
import logging
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text = ""
    logging.info(f"📄 Extracting text from {pdf_path}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        logging.info(f"✅ Extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        logging.error(f"❌ Error extracting PDF: {e}")
        return ""

async def check_and_ingest(subject: str):
    """
    Check if documents exist for the subject in Supabase.
    If not, ingest the corresponding NCERT PDF.
    """
    subject = subject.lower()
    
    # 1. Check existing count
    try:
        # We check the 'documents' table via metadata filter or similar mechanism
        # But wait, standard LangChain SupabaseVectorStore uses a specific schema.
        # Here we are using direct RPC 'match_documents' which uses 'documents' table.
        # Let's check the 'documents' table directly assuming a metadata column 'metadata'->>'subject'
        
        # Note: If you have a different table structure, adjust this.
        # Typically: id, content, metadata, embedding
        
        response = supabase.table("documents").select("id", count="exact").contains("metadata", {"subject": subject}).execute()
        count = response.count if response.count is not None else 0
        
        if count > 0:
            logging.info(f"✅ RAG: {count} documents found for {subject}")
            return
            
        logging.info(f"⚠️ RAG: No documents found for {subject}. Initiating auto-ingestion...")
        
        # 2. Find PDF
        # Maps subject to filename
        pdf_map = {
            "physics": "NCERT-Physics.pdf",
            "math": "NCERT-Math.pdf",
            "chemistry": "NCERT-Chemistry.pdf"
        }
        
        filename = pdf_map.get(subject)
        if not filename:
             logging.warning(f"No PDF mapped for subject: {subject}")
             return
             
        pdf_path = os.path.join(os.path.dirname(__file__), filename)
        if not os.path.exists(pdf_path):
             logging.error(f"PDF not found at {pdf_path}")
             return
             
        # 3. Extract & Chunk
        text = extract_text_from_pdf(pdf_path)
        if not text:
            return

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        docs = splitter.create_documents([text])
        logging.info(f"🔪 Created {len(docs)} chunks for {subject}")
        
        # 4. Generate Embeddings & Insert
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # Prepare data for insertion
        # We'll insert in batches to avoid timeouts
        batch_size = 50
        total_chunks = len(docs)
        
        logging.info(f"🔮 Generating embeddings and uploading to Supabase...")
        
        for i in range(0, total_chunks, batch_size):
            batch = docs[i : i + batch_size]
            
            # Embed batch
            batch_texts = [d.page_content for d in batch]
            batch_embeddings = embeddings.embed_documents(batch_texts)
            
            rows_to_insert = []
            for j, doc in enumerate(batch):
                rows_to_insert.append({
                    "content": doc.page_content,
                    "metadata": {"subject": subject, "source": filename},
                    "embedding": batch_embeddings[j]
                })
            
            # Insert to Supabase
            supabase.table("documents").insert(rows_to_insert).execute()
            logging.info(f"   Uploaded batch {i // batch_size + 1}/{(total_chunks // batch_size) + 1}")
            
        logging.info(f"✅ Auto-ingestion complete for {subject}")
        
    except Exception as e:
        logging.error(f"❌ Auto-ingestion error: {e}")
        import traceback
        logging.info(traceback.format_exc())


# Replace complex LangChain Retriever with direct Supabase RPC call
# This avoids the 'SyncRPCFilterRequestBuilder' error and gives us more control
def get_context(query: str, subject: str = "physics", k: int = 3, randomize: bool = True):
    """Get context using Supabase RAG via direct RPC"""
    
    # 0. Check and Ingest (Sync wrapper around Async function? No, better to just log or try best effort)
    # Since get_context is synchronous in the signature used by ai_service (or is it?),
    # actually ai_service calls it inside an async function but passes it as a callable.
    # To keep it simple and blocking for the first run, we'll run the check synchronously or via run_until_complete
    # IF we are inside an async loop, we shouldn't use run_until_complete.
    
    # Force lower case
    subject = subject.lower()
    
    # HACK: For now, we'll skip the async ingest check here to avoid event loop issues if called strictly synchronously.
    # Ideally, `ai_service` should await an `init_rag(subject)` function.
    # But let's try to run it.
    
    # Actually, let's keep get_context clean. 
    # The ingestion should happen implicitly or be triggered.
    # Given the constraint, let's try to rely on the background check or run it here if possible.
    # Warning: calling Supabase sync methods inside async loop is fine. 
    # But our check_and_ingest was defined async. Let's make a sync version for simplicity/robustness here.
    
    try:
        # Check existing count synchronously
        response = supabase.table("documents").select("id", count="exact").contains("metadata", {"subject": subject}).execute()
        count = response.count if response.count is not None else 0
        
        if count == 0:
             logging.info(f"Empty RAG for {subject}. Triggering ingestion setup...")
             # We can't really block a sync function easily for a long ingestion if this is called from an async path without await.
             # However, ai_service calls `context_func(..., await=False?)` 
             # Actually `ai_service.generate_questions_logic` calls `context_docs = context_func(...)`.
             # It expects a list of strings.
             
             # If we return empty list, it generates generic questions (fallback). 
             # To fix this properly, we should trigger ingestion asynchronously or have a dedicated setup step.
             # But the user asked for "first it should ingest... then remaining things".
             
             # Option: Perform ingestion synchronously here (blocking).
             # It might timeout the HTTP request, but it fulfills the requirement "first ingest... then generate".
             try:
                 import asyncio
                 # Check if loop is running
                 try:
                     loop = asyncio.get_running_loop()
                     # We are in async context. We should await. But this function signature is sync?
                     # No, ai_service calls it as `context_func(...)`. If we return a coroutine, ai_service must await it.
                     # But ai_service code is: `context_docs = context_func(...)`. It doesn't await `context_func`.
                     # So `get_context` MUST be synchronous.
                     
                     # We will execute the ingestion synchronously.
                     _sync_ingest(subject)
                 except RuntimeError:
                     # No loop, run async
                     asyncio.run(check_and_ingest(subject))
             except Exception as e:
                 logging.error(f"Ingestion trigger error: {e}")

    except Exception as e:
        logging.error(f"Pre-check error: {e}")

    # Standard Retrieval Logic
    try:
        # 1. Generate Embedding
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        query_vector = embeddings.embed_query(query)
        
        # 2. Call RPC 'match_documents'
        # ensure k is int
        params = {
            "query_embedding": query_vector,
            "match_threshold": 0.5, # adjust threshold as needed
            "match_count": k * 2 if randomize else k,
            "filter": {"subject": subject}
        }
        
        response = supabase.rpc("match_documents", params).execute()
        
        results = response.data
        
        if not results:
             logging.info(f"RAG: No results found for {subject}")
             return []
             
        # 3. Randomize if needed
        if randomize and len(results) > k:
            import random
            results = random.sample(results, k)
        else:
            results = results[:k]
            
        return [doc.get('content', '') for doc in results]
    except Exception as e:
        logging.error(f"RAG Error: {e}")
        return []

def _sync_ingest(subject):
    """Synchronous version of ingestion for blocking calls"""
    logging.info(f"🔄 SYNC Ingestion started for {subject}...")
    
    # 1. Find PDF
    pdf_map = {
        "physics": "NCERT-Physics.pdf",
        "math": "NCERT-Math.pdf",
        "chemistry": "NCERT-Chemistry.pdf"
    }
    filename = pdf_map.get(subject.lower())
    if not filename: return
    
    pdf_path = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(pdf_path): return
    
    # 2. Extract
    text = extract_text_from_pdf(pdf_path)
    if not text: return
    
    # 3. Chunk
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = splitter.create_documents([text])
    
    # 4. Embed & Insert
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
    
    batch_size = 50
    for i in range(0, len(docs), batch_size):
        batch = docs[i : i + batch_size]
        batch_texts = [d.page_content for d in batch]
        batch_embeddings = embeddings.embed_documents(batch_texts)
        
        rows = []
        for j, d in enumerate(batch):
            rows.append({
                "content": d.page_content,
                "metadata": {"subject": subject, "source": filename},
                "embedding": batch_embeddings[j]
            })
        supabase.table("documents").insert(rows).execute()
        logging.info(f"   Uploaded batch {i}")
    
    logging.info("✅ Sync Ingestion Done.")

