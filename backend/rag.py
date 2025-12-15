
import os
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
SUBJECTS = ["physics", "math", "chemistry"]


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text = ""
    print(f"Extracting text from {os.path.basename(pdf_path)}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if (i + 1) % 10 == 0:
                    print(f"   Processed {i + 1} pages...")
        print(f"Extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""
        