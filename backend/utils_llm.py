import os
import logging
from typing import List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from settings_manager import settings_manager

# Import OpenAI client for HuggingFace/Fireworks support
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    try:
        from langchain_community.chat_models import ChatOpenAI
    except ImportError:
        ChatOpenAI = None
        logging.warning("⚠️ ChatOpenAI not available. HuggingFace models will fail.")


def get_llm(override_model=None, override_temperature=None):
    """Get or initialize LLM client with current settings or overrides"""
    settings = settings_manager.get_settings()
    
    default_model = settings.get("model", "gemini-2.5-flash-lite")
    model_name = override_model or default_model
    temperature = override_temperature if override_temperature is not None else settings.get("temperature", 0.3)
    
    # HuggingFace / Fireworks
    if "fireworks" in model_name:
        if not ChatOpenAI:
             logging.error("❌ Cannot load model: langchain-openai package missing.")
             return ChatGoogleGenerativeAI(
                model=default_model, 
                temperature=temperature, 
                google_api_key=os.getenv("GEMINI_API_KEY")
             )
             
        hf_token = os.getenv("HF_TOKEN")
        logging.info(f"🤖 Initializing HuggingFace Model: {model_name}")
        return ChatOpenAI(
            model=model_name,
            openai_api_key=hf_token or "dummy_key_if_missing",
            openai_api_base="https://router.huggingface.co/v1",
            temperature=temperature
        )

    # Google Gemini (Default)
    return ChatGoogleGenerativeAI(
        model=model_name,
        temperature=temperature,
        google_api_key=os.getenv("GEMINI_API_KEY"),
        max_output_tokens=15000
    )

def safe_invoke(llm, prompt, purpose=""):
    """Invoke LLM with error handling"""
    try:
        return llm.invoke(prompt)
    except Exception as e:
        logging.error(f"LLM Invoke Error ({purpose}): {e}")
        class DummyResponse:
            content = ""
        return DummyResponse()
