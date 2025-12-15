"""
Lazy-loading RAG module for Multiple Subjects (Physics, Math, Chemistry)
"""
import os
import random
import time
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

# Cache for retrievers: { "physics": retriever, "math": retriever, ... }
_retrievers = {}

def get_retriever(subject="physics", k=15):
    """Get or create retriever for a specific subject (lazy loading)"""
    global _retrievers
    
    if subject in _retrievers and _retrievers[subject] is not None:
        return _retrievers[subject]
    
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    # Check if vectorstore exists
    if os.path.exists(PERSIST_DIR):
        print(f"🔌 Loading RAG collection for {subject}...")
        try:
            vectorstore = Chroma(
                embedding_function=embeddings,
                collection_name=subject,
                persist_directory=PERSIST_DIR
            )
            # Basic validation
            if vectorstore._collection.count() == 0:
                 print(f"⚠️  Collection {subject} is empty.")
                 return None
                 
            retriever = vectorstore.as_retriever(search_kwargs={"k": k})
            _retrievers[subject] = retriever
            return retriever
        except Exception as e:
            print(f"❌ Error loading {subject} collection: {e}")
            return None
    else:
        # Return None if not initialized
        return None

def get_context(query: str, subject: str = "physics", k: int = 3, randomize: bool = True):
    """Get relevant context for a query and subject with optional randomization
    
    Args:
        query: Search query
        subject: Subject to retrieve for (physics, math, chemistry)
        k: Number of documents to retrieve
        randomize: If True, adds diversity by retrieving more docs and randomly sampling
    """
    retriever = get_retriever(subject, k * 2 if randomize else k)
    
    if retriever is None:
        return []
    
    try:
        results = retriever.invoke(query)
        
        if randomize and len(results) > k:
            # Randomly sample k documents from retrieved results for diversity
            random.seed(time.time())
            results = random.sample(results, k)
        
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"RAG retrieval error for {subject}: {e}")
        return []

# Backward compatibility alias
def get_physics_context(query: str, k: int = 3, randomize: bool = True):
    """Deprecated: Use get_context(query, subject='physics', ...) instead"""
    return get_context(query, subject="physics", k=k, randomize=randomize)
