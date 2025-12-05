"""
Lazy-loading RAG module for Physics Questions
"""
import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

persist_dir = os.path.join(os.path.dirname(__file__), "chroma_db")
_retriever = None

def get_retriever(k=15):
    """Get or create retriever (lazy loading)"""
    global _retriever
    
    if _retriever is not None:
        return _retriever
    
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    # Check if vectorstore exists
    if os.path.exists(persist_dir):
        vectorstore = Chroma(
            embedding_function=embeddings,
            collection_name="physics",
            persist_directory=persist_dir
        )
        _retriever = vectorstore.as_retriever(search_kwargs={"k": k})
        return _retriever
    else:
        # Return None if not initialized - will use fallback
        return None

def get_physics_context(query: str, k: int = 3, randomize: bool = True):
    """Get relevant physics context for a query with optional randomization
    
    Args:
        query: Search query for context retrieval
        k: Number of documents to retrieve
        randomize: If True, adds diversity by retrieving more docs and randomly sampling
    """
    retriever = get_retriever(k * 2 if randomize else k)  # Get more docs for diversity
    
    if retriever is None:
        # Fallback: return empty context if RAG not set up
        return []
    
    try:
        results = retriever.invoke(query)
        
        if randomize and len(results) > k:
            # Randomly sample k documents from retrieved results for diversity
            import random
            import time
            random.seed(time.time())
            results = random.sample(results, k)
        
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return []
