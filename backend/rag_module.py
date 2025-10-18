"""
Lazy-loading RAG module for Physics Questions
"""
import os
from threading import Lock
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()

persist_dir = "/app/backend/chroma_db"

# Thread-safe cache for retrievers with different k values
_retriever_cache = {}
_retriever_lock = Lock()

def get_retriever(k=3):
    """
    Get or create retriever (lazy loading and thread-safe).
    The retriever is cached based on the value of k.
    """
    with _retriever_lock:
        if k in _retriever_cache:
            return _retriever_cache[k]
        
        # Validate that the vectorstore directory exists
        if not os.path.exists(persist_dir):
            return None

        # Initialize embeddings, ensuring API key is available
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
            
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )
        
        try:
            vectorstore = Chroma(
                embedding_function=embeddings,
                collection_name="physics",
                persist_directory=persist_dir
            )
            retriever = vectorstore.as_retriever(search_kwargs={"k": k})
            _retriever_cache[k] = retriever
            return retriever
        except Exception as e:
            print(f"Error creating vectorstore retriever: {e}")
            return None

def get_physics_context(query: str, k: int = 3):
    """
    Get relevant physics context for a query.
    Handles errors gracefully and uses a fallback if RAG is not set up.
    """
    try:
        retriever = get_retriever(k)
        
        if retriever is None:
            # Fallback: return empty context if RAG not set up
            return []
        
        results = retriever.get_relevant_documents(query)
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return []
