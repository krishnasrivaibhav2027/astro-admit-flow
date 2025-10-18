"""
RAG Setup for Physics Questions
Creates Chroma vector database from a specified PDF file.
"""
import os
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()

persist_dir = "/app/backend/chroma_db"
DEFAULT_PDF_PATH = "/app/backend/NCERT-Physics.pdf"

def validate_api_key():
    """Ensure that the GEMINI_API_KEY is set in the environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Please add it to your .env file.")
    return api_key

def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF using pdfplumber with robust error handling.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"The file {pdf_path} was not found.")
        
    text = ""
    print(f"📄 Extracting text from {pdf_path}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if (i + 1) % 10 == 0:
                    print(f"   Processed {i + 1} pages...")
        print(f"✅ Extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        raise IOError(f"Failed to extract text from {pdf_path}: {e}")

def create_vectorstore(pdf_path=DEFAULT_PDF_PATH):
    """
    Create or load Chroma vectorstore with proper validation and error handling.
    """
    api_key = validate_api_key()
    
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )
    
    # Improved directory handling and validation
    try:
        if not os.path.exists(persist_dir):
            print(f"📥 Creating new vectorstore from {pdf_path}...")
            
            physics_text = extract_text_from_pdf(pdf_path)
            
            print("🔪 Splitting text into chunks...")
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            docs = splitter.create_documents([physics_text])
            print(f"✅ Created {len(docs)} document chunks")
            
            print("🔮 Creating embeddings and storing in Chroma...")
            vectorstore = Chroma.from_documents(
                documents=docs,
                embedding=embeddings,
                collection_name="physics",
                persist_directory=persist_dir
            )
            print("✅ Ingestion complete. Embeddings stored in chroma_db/")
        else:
            print("⚡ Loading existing Chroma database...")
            vectorstore = Chroma(
                embedding_function=embeddings,
                collection_name="physics",
                persist_directory=persist_dir
            )
            print("✅ Chroma database loaded")
        return vectorstore
    except Exception as e:
        raise RuntimeError(f"Failed to create or load vectorstore: {e}")

def get_retriever(k=3, pdf_path=DEFAULT_PDF_PATH):
    """Get retriever for RAG queries."""
    vectorstore = create_vectorstore(pdf_path)
    return vectorstore.as_retriever(search_kwargs={"k": k})

if __name__ == "__main__":
    try:
        print("🚀 Setting up RAG system...")
        # The PDF path can be overridden via an environment variable or command-line argument
        pdf_to_process = os.getenv("PDF_PATH", DEFAULT_PDF_PATH)
        retriever = get_retriever(pdf_path=pdf_to_process)
        print("✅ RAG setup complete!")
        
        print("\n🧪 Testing retriever...")
        results = retriever.get_relevant_documents("Newton's laws of motion")
        print(f"✅ Retrieved {len(results)} relevant documents")
        if results:
            print(f"Sample: {results[0].page_content[:200]}...")
    except (ValueError, FileNotFoundError, IOError, RuntimeError) as e:
        print(f"\n❌ An error occurred during RAG setup: {e}")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")
