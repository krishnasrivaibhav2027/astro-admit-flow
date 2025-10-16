"""
Lazy-loading RAG module for Physics Questions
"""
import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()

persist_dir = "/app/backend/chroma_db"
_retriever = None

def get_retriever(k=3):
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

def get_physics_context(query: str, k: int = 3):
    """Get relevant physics context for a query"""
    retriever = get_retriever(k)
    
    if retriever is None:
        # Fallback: return empty context if RAG not set up
        return []
    
    try:
        results = retriever.get_relevant_documents(query)
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return []
