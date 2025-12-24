
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

# Custom Local LLM Wrapper (Internal)
try:
    from local_llm_engine import engine
except ImportError:
    # It's okay if not found, we just won't support local Qwen
    pass

class LocalQwenLLM:
    def __init__(self, temperature=0.7):
        self.temperature = temperature

    def invoke(self, prompt):
        # Convert LangChain prompt to string
        if isinstance(prompt, list):
             text = "\n".join([m.content for m in prompt])
        elif hasattr(prompt, "to_string"):
             text = prompt.to_string()
        else:
             text = str(prompt)
        
        try:
            logging.info("🧠 Invoking Local Qwen Engine (Internal)...")
            content = engine.generate(text, temperature=self.temperature)
        except Exception as e:
            logging.error(f"❌ Local LLM Internal Error: {e}")
            content = ""

        # Return compatible object
        class Result:
            pass
        r = Result()
        r.content = content
        return r

    def batch(self, prompts):
        """Batch generation for multiple prompts"""
        texts = []
        for p in prompts:
            if isinstance(p, list): # Message list
                 texts.append("\n".join([m.content for m in p]))
            elif hasattr(p, "to_string"):
                 texts.append(p.to_string())
            else:
                 texts.append(str(p))
                 
        try:
            logging.info(f"🧠 Invoking Local Qwen Engine (Batch {len(texts)})...")
            contents = engine.generate(texts, temperature=self.temperature) 
        except Exception as e:
            logging.error(f"❌ Local LLM Batch Error: {e}")
            contents = [""] * len(texts)

        results = []
        class Result:
            pass
             
        for c in contents:
            r = Result()
            r.content = c
            results.append(r)
            
        return results

def get_llm(override_model=None, override_temperature=None):
    """Get or initialize LLM client with current settings or overrides"""
    settings = settings_manager.get_settings()
    
    default_model = settings.get("model", "gemini-2.5-flash-lite")
    model_name = override_model or default_model
    temperature = override_temperature if override_temperature is not None else settings.get("temperature", 0.3)
    
    # 1. Local Qwen Service
    if "Local" in model_name or "Qwen" in model_name and "fireworks" not in model_name:
        logging.info(f"💻 Using Local Qwen Service: {model_name} (Temp: {temperature})")
        return LocalQwenLLM(temperature=temperature)

    # 2. HuggingFace / Fireworks
    if "fireworks" in model_name:
        if not ChatOpenAI:
             logging.error("❌ Cannot load Qwen model: langchain-openai package missing.")
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

    # 3. Google Gemini (Default)
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
