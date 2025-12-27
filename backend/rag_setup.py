"""
RAG Setup for Physics Questions
Creates Chroma vector database from NCERT Physics PDF
"""
import os
import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

persist_dir = os.path.join(os.path.dirname(__file__), "chroma_db")

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text = ""
    print(f"📄 Extracting text from {pdf_path}...")
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            if (i + 1) % 10 == 0:
                print(f"   Processed {i + 1} pages...")
    print(f"✅ Extracted {len(text)} characters from PDF")
    return text

def create_vectorstore():
    """Create or load Chroma vectorstore"""
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    if not os.path.exists(persist_dir):
        print("📥 First run: extracting, embedding, and persisting...")
        
        # Extract text from PDF
        pdf_path = os.path.join(os.path.dirname(__file__), "NCERT-Physics.pdf")
        physics_text = extract_text_from_pdf(pdf_path)
        
        # Split into chunks
        print("🔪 Splitting text into chunks...")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        docs = splitter.create_documents([physics_text])
        print(f"✅ Created {len(docs)} document chunks")
        
        # Create vectorstore
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

def get_retriever(k=15):
    """Get retriever for RAG queries"""
    vectorstore = create_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": k})

if __name__ == "__main__":
    print("🚀 Setting up RAG system...")
    retriever = get_retriever()
    print("✅ RAG setup complete!")
    
    # Test query
    print("\n🧪 Testing retriever...")
    results = retriever.invoke("Newton's laws of motion")
    print(f"✅ Retrieved {len(results)} relevant documents")
    if results:
        print(f"Sample: {results[0].page_content[:200]}...")
