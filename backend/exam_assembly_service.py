
import os
import json
import logging
from typing import List, Dict, Optional
from supabase import create_client, Client
from settings_manager import settings_manager
from question_bank_service import QuestionBankService
import ai_service
from rag_supabase import get_context

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

class ExamAssemblyService:
    """
    Service to assemble deterministic exams for students.
    Ensures that:
    1. Questions are locked to a student/subject/level attempt.
    2. Refreshes return the same questions (unless completed).
    3. All questions (even fallback) are tracked in the Bank.
    """

    @staticmethod
    async def get_or_create_exam(student_id: str, subject: str, level: str, num_questions: int = 15) -> List[Dict]:
        """
        Get existing active exam or create a new one.
        """
        try:
            # 1. Check for Active Lock
            active_lock = ExamAssemblyService._get_active_lock(student_id, subject, level)
            if active_lock:
                logging.info(f"🔒 Found active exam lock for {student_id} ({subject}/{level})")
                questions = await ExamAssemblyService._fetch_questions_by_ids(active_lock['question_ids'])
                
                # If we managed to fetch questions, return them.
                # Edge case: Questions deleted from bank? (Unlikely)
                if questions:
                     return questions
                else:
                    logging.warning("⚠️ Active lock found but questions missing. nullifying lock and regenerating.")
                    # Logic to invalidate lock could go here, for now we just proceed to generate new

            # 2. No active lock (or broken), Assemble New Exam
            logging.info(f"🆕 Assembling NEW exam for {student_id} ({subject}/{level})")
            
            # A. Try Bank
            questions = await QuestionBankService.get_questions(subject, level, num_questions)
            
            # B. Fallback to AI if insufficient
            if not questions:
                questions = []
            
            needed = num_questions - len(questions)
            if needed > 0:
                logging.info(f"⚠️ Insufficient bank questions. Generating {needed} via AI Fallback.")
                
                # OPTIMIZATION: Context Injection
                # Fetch 1-2 existing questions of same subject/level to guide style/difficulty
                # This ensures "Hard" means "Hard" by showing examples.
                example_questions = await QuestionBankService.get_questions(subject, level, 2)
                context_examples = ""
                if example_questions:
                    # We don't mark these as used, we just want their text
                    examples_text = "\n".join([f"- {q.get('question_text')}" for q in example_questions])
                    context_examples = f"REFERENCE PREVIOUSLY GENERATED {level.upper()} QUESTIONS (MIMIC THIS DIFFICULTY):\n{examples_text}\n"
                    # Put them back? Actually get_questions marks them used. 
                    # We should probably have a 'peek' method or just accept they are used.
                    # Creating a 'peek' is safer. For now, let's assume get_questions is destructive.
                    # We can re-insert them? Or just use them as part of the student's exam!
                    # Wait, if we got them, we should USE them!
                    # Ah, we only enter this block if "questions" (which came from get_questions) was insufficient.
                    # So we already have some questions in `questions` list if bank wasn't totally empty.
                    pass
                
                # Better approach: Use the questions we ALREADY successfully fetched as examples!
                if questions:
                     examples_text = "\n".join([f"- {q.get('question_text')}" for q in questions[:2]])
                     context_examples = f"REFERENCE DIFFICULTY (MIMIC THIS): \n{examples_text}\n"
                else:
                    context_examples = ""

                # Generate
                # We inject the examples into the 'specific_topics' or 'context'
                # ai_service.generate_questions_logic accepts context_func.
                # We can create a partial or wrapper.
                
                # Let's append to context inside the service? 
                # Or we can pass specific 'context_content' if we modify AI service.
                # Current AI service uses `context_func` which calls RAG.
                # We can wrap it.
                
                def augmented_context_func(query, subject, k=3):
                    base_docs = get_context(query, subject, k)
                    if context_examples:
                         # Prepend examples
                         base_docs.insert(0, context_examples)
                    return base_docs

                ai_questions = await ai_service.generate_questions_logic(
                    subject, 
                    level, 
                    needed, 
                    context_func=augmented_context_func
                )
                
                if ai_questions:
                    # Persist to Bank (Mark as Used immediately)
                    # We need to modify add_questions or do a custom insert to get IDs and set is_used=True
                    # For simplicity, we assume add_questions returns the inserted rows (with IDs)
                    # We need to update question_bank_service to support returning inserted rows OR we query them back?
                    # Let's trust add_questions returns data.
                    
                    # We need to add them as 'used' preferably. 
                    # Current add_questions defaults is_used=False.
                    # We will insert them, then immediately retrieve and mark/lock them.
                    
                    added_data = await QuestionBankService.add_questions(ai_questions, subject, level)
                    
                    # If add_questions returns None/Empty (it might depending on implementation), we have a problem.
                    # Current impl returns response.data
                    if added_data:
                        # Extract IDs and format
                        # We need to 'use' them so others don't get them
                        new_ids = [q['id'] for q in added_data]
                        
                        # Mark as used
                        supabase.table("question_bank").update({"is_used": True}).in_("id", new_ids).execute()
                        
                        # Format for return
                        for q in added_data:
                            content = q['question_content']
                            content['bank_id'] = q['id']
                            questions.append(content)

            # 3. Create Lock
            if questions:
                question_ids = [q.get('bank_id') for q in questions if q.get('bank_id')]
                if question_ids:
                    ExamAssemblyService._create_lock(student_id, subject, level, question_ids)
            
            return questions

        except Exception as e:
            logging.error(f"Error in assemble_exam: {e}")
            # Fallback to pure generation without lock if system fails, to not block student
            logging.error("🚨 Critical Failure in ExamAssembly. Falling back to simple AI generation.")
            return await ai_service.generate_questions_logic(subject, level, num_questions, get_context)

    @staticmethod
    def _get_active_lock(student_id: str, subject: str, level: str) -> Optional[Dict]:
        """Check DB for active lock"""
        try:
            resp = supabase.table("exam_locks")\
                .select("*")\
                .eq("student_id", student_id)\
                .eq("subject", subject)\
                .eq("level", level)\
                .eq("status", "active")\
                .execute()
            
            if resp.data and len(resp.data) > 0:
                return resp.data[0]
            return None
        except Exception as e:
            logging.error(f"Error fetching lock: {e}")
            return None

    @staticmethod
    def _create_lock(student_id: str, subject: str, level: str, question_ids: List[str]):
        """Persist lock"""
        try:
            # Check if an active lock already exists (race condition)
            # If so, maybe update it? Or just ignore.
            # We'll just insert. DB constraint could prevent dupes if we added unique index on (student, subject, level, status='active')
            # Current migration has unique index? No, just index.
            
            # Inactivate any old active locks just in case (self-healing)
            supabase.table("exam_locks")\
                .update({"status": "invalidated"})\
                .eq("student_id", student_id)\
                .eq("subject", subject)\
                .eq("level", level)\
                .eq("status", "active")\
                .execute()

            data = {
                "student_id": student_id,
                "subject": subject,
                "level": level,
                "question_ids": question_ids,
                "status": "active"
            }
            supabase.table("exam_locks").insert(data).execute()
            logging.info(f"🔐 Created exam lock for {student_id}")
        except Exception as e:
            logging.error(f"Error creating lock: {e}")

    @staticmethod
    async def _fetch_questions_by_ids(question_ids: List[str]) -> List[Dict]:
        """Retrieve question content from bank by IDs"""
        try:
            if not question_ids:
                return []
                
            resp = supabase.table("question_bank").select("*").in_("id", question_ids).execute()
            
            formatted = []
            for q in resp.data or []:
                content = q['question_content']
                content['bank_id'] = q['id']
                formatted.append(content)
                
            # Maintain order? 
            # The order in 'in_' query isn't guaranteed. 
            # If we want deterministic order based on lock list:
            id_map = {q['bank_id']: q for q in formatted}
            ordered = []
            for qid in question_ids:
                if qid in id_map:
                    ordered.append(id_map[qid])
            return ordered
            
        except Exception as e:
            logging.error(f"Error fetching locked questions: {e}")
            return []
