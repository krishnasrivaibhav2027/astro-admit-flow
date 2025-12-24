import os
import random
import json
import logging
import asyncio
from typing import List, Dict, Optional, Callable
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from settings_manager import settings_manager
from utils_llm import get_llm, safe_invoke
from prompts import (
    generate_questions_prompt_physics, generate_questions_prompt_math, generate_questions_prompt_chemistry,
    evaluate_answer_prompt_physics, evaluate_answer_prompt_math, evaluate_answer_prompt_chemistry
)

# ... (imports)

# Import Hybrid RAG module (Redis + Supabase)
try:
    from rag_hybrid import get_context, check_and_ingest
except ImportError:
# ...    # Fallback if module missing
    def get_context(query, subject="physics", k=3, randomize=True):
        return []
    async def check_and_ingest(subject):
        pass

from graph_service import GraphService

# ... (rest of imports) ...

# --- Helper Functions ---
def get_subject_topics(subject: str) -> List[str]:
    """Return default topics for a subject if graph traversal fails."""
    subject = subject.lower()
    if subject == 'physics':
        return [
            "Kinematics", "Newton's Laws", "Energy and Work", "Momentum", 
            "Rotational Motion", "Gravitation", "Thermodynamics", "Waves", 
            "Electrostatics", "Current Electricity", "Magnetism", "Optics", "Modern Physics"
        ]
    elif subject == 'math':
        return [
            "Algebra", "Trigonometry", "Calculus", "Coordinate Geometry", 
            "Vectors", "Probability", "Statistics", "Complex Numbers", 
            "Matrices and Determinants", "Quadratic Equations"
        ]
    elif subject == 'chemistry':
        return [
            "Atomic Structure", "Chemical Bonding", "Thermodynamics", "Equilibrium", 
            "Redox Reactions", "Electrochemistry", "Chemical Kinetics", 
            "Surface Chemistry", "Periodic Table", "Coordination Compounds", 
            "Organic Chemistry Basics", "Hydrocarbons", "Alcohols and Ethers"
        ]
    return ["General Concepts"]



async def _generate_questions_internal(subject, level, num_questions, context_func=None, specific_topics: List[str] = None):
    """
    Core logic to generate questions using RAG and LLM.
    Now uses topic-specific generation via Graph Service.
    """
    try:
        # 0. Lazy Ingestion Check
        # Ensure documents exist for this subject before proceeding
        try:
            await check_and_ingest(subject)
        except Exception as e:
            logging.error(f"⚠️ Ingestion check failed: {e}. Proceeding with existing data (if any).")

        # 1. Get Topics (Graph-Aware)
        if specific_topics and len(specific_topics) > 0:
            logging.info(f"🎯 Using provided specific topics: {specific_topics}")
            # If specific topics provided, we might still want to traverse a bit? 
            # No, respect explicit request.
            selected_topics_list = specific_topics
        else:
            # Use Graph Traversal
            logging.info(f"🕸️ Traversing Knowledge Graph for {subject}...")
            selected_topics_list = GraphService.get_traversal_path(subject)
            
            # Fallback to hardcoded/json if graph is empty
            if not selected_topics_list:
                logging.warning("⚠️ Graph empty, falling back to static topics.")
                topics = get_subject_topics(subject)
                num_topics_to_select = min(len(topics), 3)
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
            from rag_hybrid import get_context as rag_get_context
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
                    q_batch = json.loads(content, strict=False)
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
                questions = json.loads(content, strict=False)
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
            return json.loads(content, strict=False)
        except:
            return {
                "correct": False, 
                "score": 0, 
                "feedback": "Error parsing evaluation. Please ask for manual review."
            }
            
    except Exception as e:
        logging.error(f"Error in evaluate_answer_logic: {e}")
        return {"correct": False, "score": 0, "feedback": "System Error"}
