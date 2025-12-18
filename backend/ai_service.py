import os
import random
import json
import logging
import asyncio
from typing import List, Dict, Optional, Callable
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from settings_manager import settings_manager

# Import Supabase-based RAG module (with Auto-Ingestion)
try:
    from rag_supabase import get_context
except ImportError:
    # Fallback if module missing
    def get_context(query, subject="physics", k=3, randomize=True):
        return []

from prompts import (
    generate_questions_prompt_physics, 
    generate_questions_prompt_math, 
    generate_questions_prompt_chemistry,
    evaluate_answer_prompt_physics, 
    evaluate_answer_prompt_math, 
    evaluate_answer_prompt_chemistry
)

# Initialize LLM (Client)
llm_client = None

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
from local_llm_engine import engine

class LocalQwenLLM:
    def __init__(self, temperature=0.7):
        self.temperature = temperature
        # Ensure engine is loaded (lazy load check)
        # engine.load_model() # Optional here, better to do at startup

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
        # Convert prompts to strings
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
            contents = engine.generate(texts, temperature=self.temperature) # Returns list of strings
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
    # Always re-fetch settings to ensure dynamic updates without restart
    settings = settings_manager.get_settings()
    
    # Use settings_manager as the primary source of truth
    default_model = settings.get("model", "gemini-2.5-flash-lite")
    model_name = override_model or default_model
    temperature = override_temperature if override_temperature is not None else settings.get("temperature", 0.3)
    
    # 1. Local Qwen Service (Priority if selected)
    if "Local" in model_name or "Qwen" in model_name and "fireworks" not in model_name:
        logging.info(f"💻 Using Local Qwen Service: {model_name} (Temp: {temperature})")
        return LocalQwenLLM(temperature=temperature)

    # 2. HuggingFace / Fireworks (Qwen, Llama via HF Router)
    if "fireworks" in model_name:
        if not ChatOpenAI:
             logging.error("❌ Cannot load Qwen model: langchain-openai package missing.")
             # Fallback to configured default model
             return ChatGoogleGenerativeAI(
                model=default_model, 
                temperature=temperature, 
                google_api_key=os.getenv("GEMINI_API_KEY")
             )
             
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
             logging.error("❌ HF_TOKEN is missing. Cannot use HuggingFace Router.")
        
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
        # Return a dummy response object with content
        class DummyResponse:
            content = ""
        return DummyResponse()

def get_subject_topics(subject: str) -> List[str]:
    """Get list of topics for a subject"""
    # 1. Try to load from generated topics.json
    try:
        topics_file = os.path.join(os.path.dirname(__file__), "topics.json")
        if os.path.exists(topics_file):
            with open(topics_file, 'r') as f:
                data = json.load(f)
                # Check directly or lowercase, ensuring robust match
                sub_key = subject.lower()
                if sub_key in data and isinstance(data[sub_key], list) and len(data[sub_key]) > 0:
                    logging.info(f"📂 Loaded {len(data[sub_key])} topics for '{subject}' from topics.json")
                    return data[sub_key]
    except Exception as e:
        logging.error(f"Error reading topics.json: {e}")

    # 2. Fallback to hardcoded list (Safety Net)
    logging.warning(f"⚠️ Using HARDCODED fallback topics for '{subject}'")
    subject_topics = {
        "physics": [
            "electromagnetic induction and Faraday's law", "Newton's laws of motion and forces",
            "thermodynamics and heat transfer", "wave motion and sound",
            "optics and light", "electric circuits and current",
            "magnetism and magnetic fields", "gravitation and planetary motion",
            "work energy and power", "electrostatics and electric fields",
            "quantum mechanics basics", "atomic structure and spectra",
            "radioactivity and nuclear physics", "mechanical properties of matter",
            "fluid mechanics and pressure", "kinetic theory of gases",
            "simple harmonic motion", "rotational dynamics",
            "interference and diffraction", "semiconductors and devices"
        ],
        "math": [
            "Calculus (Integration, Differentiation)", "Linear Algebra", 
            "Probability and Statistics", "Trigonometry", "Coordinate Geometry",
            "Complex Numbers", "Vectors", "Matrices and Determinants",
            "Permutations and Combinations", "Sequences and Series"
        ],
        "chemistry": [
            "Periodic Table and Intervals", "Chemical Bonding", 
            "Thermodynamics", "Equilibrium", "Solutions", 
            "Electrochemistry", "Chemical Kinetics", "Surface Chemistry",
            "Coordination Compounds", "Organic Chemistry Basics"
        ]
    }
    return subject_topics.get(subject.lower(), subject_topics["physics"])

async def _generate_questions_internal(subject, level, num_questions, context_func=None, specific_topics: List[str] = None):
    """
    Core logic to generate questions using RAG and LLM.
    Now uses topic-specific generation.
    """
    try:
        # 1. Get Subject Topics
        if specific_topics and len(specific_topics) > 0:
            logging.info(f"🎯 Using provided specific topics: {specific_topics}")
            topics = specific_topics
        else:
            topics = get_subject_topics(subject)
        
        # 2. Select Random Topics for this Batch if not specific
        # We select up to 3 topics to ensure diversity
        num_topics_to_select = min(len(topics), 3)
        if specific_topics:
             # If specific topics were passed, use them all (up to a reasonable limit for prompt context)
             # If too many, maybe sample? But usually caller handles batching.
             selected_topics_list = topics[:5] 
        else:
             selected_topics_list = random.sample(topics, num_topics_to_select)
             
        selected_topics = ", ".join(selected_topics_list)
        
        logging.info(f"🎯 Selected Topics for {subject}: {selected_topics}")

        # 3. Get Context using the Selected Topics
        # We use the combined topics string as the query
        if context_func:
            settings = settings_manager.get_settings()
            rag_k = settings.get("rag_k", 3)
            # Pass topics as query
            context_docs = context_func(selected_topics, subject=subject, k=rag_k)
            context = "\n\n".join(context_docs) if context_docs else f"General {subject} concepts related to {selected_topics}"
        else:
            # Fallback
            from rag_supabase import get_context as rag_get_context
            settings = settings_manager.get_settings()
            rag_k = settings.get("rag_k", 3)
            context_docs = rag_get_context(selected_topics, subject=subject, k=rag_k)
            context = "\n\n".join(context_docs) if context_docs else f"General {subject} concepts related to {selected_topics}"

        # 4. Select Prompt
        if subject.lower() == 'physics':
            prompt_template = generate_questions_prompt_physics
        elif subject.lower() == 'math':
            prompt_template = generate_questions_prompt_math
        elif subject.lower() == 'chemistry':
            prompt_template = generate_questions_prompt_chemistry
        else:
            prompt_template = generate_questions_prompt_physics

        # 5. Format Prompt with Topics
        try:
             prompt = prompt_template.format_messages(
                num_questions=num_questions, 
                level=level, 
                context=context,
                topic=selected_topics # Pass multiple topics string
            )
        except KeyError:
             # Fallback if prompts.py hasn't been updated yet
             logging.warning("⚠️ Prompt template does not accept 'topic' yet. Appending to context.")
             context = f"TOPICS: {selected_topics}\n\n{context}"
             prompt = prompt_template.format_messages(
                num_questions=num_questions, 
                level=level, 
                context=context
            )
        
        # 6. Call LLM (Batched if > 5 questions)
        current_llm = get_llm()
        BATCH_SIZE = 5
        
        all_questions = []
        
        if num_questions > BATCH_SIZE:
            import math
            num_batches = math.ceil(num_questions / BATCH_SIZE)
            prompts = []
            
            logging.info(f"🔄 Splitting {num_questions} questions into {num_batches} batches...")
            
            for i in range(num_batches):
                count = BATCH_SIZE
                if i == num_batches - 1:
                    remaining = num_questions - (i * BATCH_SIZE)
                    if remaining > 0: count = remaining
                
                # Format prompt for this batch
                try:
                    p = prompt_template.format_messages(
                        num_questions=count, 
                        level=level, 
                        context=context,
                        topic=selected_topics
                    )
                except KeyError:
                    p = prompt_template.format_messages(
                        num_questions=count, 
                        level=level, 
                        context=context
                    )
                prompts.append(p)
            
            # Invoke Batch with Chunking for Scalability
            MAX_CONCURRENT_BATCHES = 5 # Process max 25 questions at once (5 batches * 5 questions)
            
            responses = []
            if hasattr(current_llm, 'batch'):
                # Chunk the prompts list
                for i in range(0, len(prompts), MAX_CONCURRENT_BATCHES):
                    chunk = prompts[i : i + MAX_CONCURRENT_BATCHES]
                    logging.info(f"🚀 Processing batch chunk {i//MAX_CONCURRENT_BATCHES + 1} ({len(chunk)} batches)...")
                    try:
                        chunk_responses = current_llm.batch(chunk)
                        responses.extend(chunk_responses)
                    except Exception as e:
                        logging.error(f"❌ Error processing batch chunk {i}: {e}")
                        # We should probably add empty/dummy responses so the counts match, or just skip? 
                        # If we skip, the user gets fewer questions (which is the current bug).
                        # Better to add error placeholders?
                        # For now, let's just log it. The aggregation loop might handle it if we just extend. 
                        # But wait, if we don't extend, we have fewer responses.
                        continue
            else:
                logging.info("⚠️ LLM does not support batching, running sequentially")
                responses = [safe_invoke(current_llm, p) for p in prompts]
                    
            # Process results
            for idx, response in enumerate(responses):
                raw_content = response.content
                if isinstance(raw_content, list):
                    content = "".join([str(part) for part in raw_content])
                else:
                    content = str(raw_content)
                
                content = content.replace('```json', '').replace('```', '').strip()
                
                # Regex fix
                import re
                content = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', content)
                
                try:
                    q_batch = json.loads(content)
                    if isinstance(q_batch, dict) and "questions" in q_batch:
                        q_batch = q_batch["questions"]
                    if isinstance(q_batch, list):
                        all_questions.extend(q_batch)
                    else:
                        logging.warning(f"⚠️ Batch {idx+1} returned invalid format (not list): {type(q_batch)}")
                except json.JSONDecodeError:
                    logging.error(f"❌ JSON Decode Error in batch {idx+1}: {content[:200]}...")
                    
            return all_questions
            
        else:
            # Standard Single Call
            response = safe_invoke(current_llm, prompt, purpose="generate_questions")
            
            # 7. Parse Response
            raw_content = response.content
            if isinstance(raw_content, list):
                # If content is multipart (list), join parts
                content = "".join([str(part) for part in raw_content])
            else:
                content = str(raw_content)
                
            content = content.replace('```json', '').replace('```', '').strip()
            
            # FIX: LaTeX often breaks JSON because backslashes must be double-escaped in JSON strings.
            # e.g. "\lambda" (invalid) vs "\\lambda" (valid).
            # We use strict regex to fix invalid escapes only.
            # We look for a backslash that is NOT followed by valid JSON escape chars (" \ / b f n r t u)
            import re
            content = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', content)
            
            try:
                questions = json.loads(content)
                # Ensure it's a list
                if isinstance(questions, dict) and "questions" in questions:
                    questions = questions["questions"]
                return questions
            except json.JSONDecodeError:
                logging.error(f"JSON Decode Error: {content}")
                return []

    except Exception as e:
        logging.error(f"Error in generate_questions_logic: {e}")
        import traceback
        logging.error(traceback.format_exc())
        return []

async def generate_questions_logic(subject, level, num_questions, context_func=None, specific_topics: List[str] = None):
    """
    Wrapper ensures exact quantity of questions by retrying if gaps exist.
    """
    total_questions = []
    attempts = 0
    MAX_ATTEMPTS = 3
    remaining_needed = num_questions
    
    while remaining_needed > 0 and attempts < MAX_ATTEMPTS:
        if attempts > 0:
            logging.warning(f"🔄 Gap Filling: Attempt {attempts+1} for {remaining_needed} more questions...")
            
        # Call the internal logic
        batch = await _generate_questions_internal(subject, level, remaining_needed, context_func, specific_topics)
        
        if batch:
            total_questions.extend(batch)
        else:
            logging.warning("⚠️ Batch generation returned 0 questions.")
            
        remaining_needed = num_questions - len(total_questions)
        attempts += 1
        
    # If we over-generated (unlikely but possible if batch size logic varies), trim
    return total_questions[:num_questions]

async def evaluate_answer_logic(student_answer, correct_answer, question_text, subject="physics"):
    """Core logic to evaluate answer"""
    try:
        current_llm = get_llm()
        
        if subject.lower() == 'physics':
            prompt_template = evaluate_answer_prompt_physics
        elif subject.lower() == 'math':
            prompt_template = evaluate_answer_prompt_math
        elif subject.lower() == 'chemistry':
            prompt_template = evaluate_answer_prompt_chemistry
        else:
            prompt_template = evaluate_answer_prompt_physics
            
        prompt = prompt_template.format_messages(
            question=question_text, 
            correct_answer=correct_answer, 
            student_answer=student_answer
        )
        
        response = safe_invoke(current_llm, prompt, purpose="evaluate_answer")
        content = response.content.replace('```json', '').replace('```', '').strip()
        
        try:
            return json.loads(content)
        except:
            return {
                "correct": False, 
                "score": 0, 
                "feedback": "Error parsing evaluation. Please ask for manual review."
            }
            
    except Exception as e:
        logging.error(f"Error in evaluate_answer_logic: {e}")
        return {"correct": False, "score": 0, "feedback": "System Error"}
