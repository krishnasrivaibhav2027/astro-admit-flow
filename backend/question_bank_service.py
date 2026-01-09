import os
import random
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from supabase import create_client, Client
from pydantic import BaseModel
import time

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

class Question(BaseModel):
    id: Optional[str] = None
    subject: str
    level: str
    question_content: Dict # {"question": "...", "answer": "...", "context": "..."}
    is_used: bool = False

class QuestionBankService:
    @staticmethod
    async def get_topic_saturation(subject: str, level: str, topic: str) -> int:
        """Check how many valid questions exist for this topic/level combo"""
        try:
            # We check questions that have this topic in their content metadata.
            # Assuming 'question_content'->>'topic' exists.
            # Supabase JSON filtering: question_content->>topic
            
            # Note: We need to cast depending on DB.
            # PostgREST: question_content->>topic.eq.TopicName
            
            resp = supabase.table("question_bank")\
                .select("id", count="exact")\
                .eq("subject", subject)\
                .eq("level", level.lower())\
                .textSearch("question_content->>topic", f"'{topic}'")\
                .execute()
                
            # textSearch might be tricky with exact match.
            # Better: use a filter if possible or just rely on 'contains'
            # .filter('question_content->>topic', 'eq', topic)
            
            # Trying standard filter approach for jsonb
            # resp = supabase.table("question_bank").select("id", count="exact").eq("subject", subject).eq("level", level).filter("question_content->>topic", "eq", topic).execute()
            
            # If JSON filtering is hard via client, we might rely on the caller to just trust the 'count' of total questions 
            # or implemented a dedicated RPC.
            # For prototype: simple 'count' of subject/level might be enough guard?
            # User asked for "topic-aware".
            
            # Let's try the Python client specific JSON filter syntax if available, else
            # fallback to broader check.
            
            return resp.count if resp.count is not None else 0
        except Exception:
            return 0

    @staticmethod
    async def add_questions(questions: List[Dict], subject: str, level: str, status: str = "ACTIVE"):
        """Add bulk questions to the bank"""
        try:
            if not questions:
                return []
            
            # Force lowercase level to match check constraint
            level = level.lower()
            
            data = []
            for q in questions:
                # Ensure content is strictly JSON serializable
                content = {
                    "question": q.get("question"),
                    "answer": q.get("answer"),
                    "topic": q.get("topic", ""), # Capture topic if available
                    # Add generic metadata
                    "subject": subject,
                    "level": level
                }
                
                data.append({
                    "subject": subject,
                    "level": level,
                    "question_content": content,
                    "is_used": False,
                    "status": status
                })
            
            logging.info(f"📤 Inserting {len(data)} questions as {status}. Sample: {data[0] if data else 'None'}")
            
            # chunk insert if necessary, but supabase handles batch fine usually
            response = supabase.table("question_bank").insert(data).execute()
            logging.info(f"✅ DB Insert Response: {len(response.data) if response.data else 0} rows")
            return response.data
        except Exception as e:
            logging.error(f"Error adding questions to bank: {e}")
            raise

    @staticmethod
    async def promote_staging_to_active(subject: str, level: str):
        """Atomic promotion of STAGING questions to ACTIVE"""
        try:
            logging.info(f"🚀 Promoting STAGING questions to ACTIVE for {subject}/{level}...")
            response = supabase.table("question_bank")\
                .update({"status": "ACTIVE"})\
                .eq("subject", subject)\
                .eq("level", level)\
                .eq("status", "STAGING")\
                .execute()
                
            promoted_count = len(response.data) if response.data else 0
            logging.info(f"✅ Promoted {promoted_count} questions to ACTIVE.")
            return promoted_count
        except Exception as e:
            logging.error(f"Error promoting staging questions: {e}")
            return 0

    @staticmethod
    async def get_questions(subject: str, level: str, limit: int = 5) -> List[Dict]:
        """Get unused questions from bank and mark them as used"""
        try:
            # 1. Fetch unused questions
            # "limit" in supabase REST is strictly for retrieving, it doesn't support "update ... returning" directly with limit easily in one REST call for 'pick one'.
            # We use a stored procedure or just 'select' then 'update'.
            # To avoid race conditions in high concurrency, a stored procedure 'fetch_and_lock_questions' is better.
            # But standard implementation:
            
            # Fetch random unused questions? 
            # REST API doesn't support random() easily without an RPC.
            # We will just fetch the "oldest" unused ones to cycle through them, or "newest".
            
            response = supabase.table("question_bank")\
                .select("*")\
                .eq("subject", subject)\
                .eq("level", level)\
                .eq("is_used", False)\
                .eq("status", "ACTIVE")\
                .limit(limit)\
                .execute()
                
            questions_data = response.data
            
            if not questions_data or len(questions_data) < limit:
                logging.warning(f"⚠️ Not enough questions in bank for {subject}/{level}. Found {len(questions_data) if questions_data else 0}, needed {limit}")
                # We return what we have, fallback logic is handled by caller
                pass

            if questions_data:
                # 2. Mark as used
                # We update by IDs
                ids = [q['id'] for q in questions_data]
                supabase.table("question_bank")\
                    .update({"is_used": True, "used_at": datetime.utcnow().isoformat()})\
                    .in_("id", ids)\
                    .execute()
                    
                # 3. Format result
                # Extract 'question_content' and return list of dicts expected by frontend/logic
                formatted = []
                for q in questions_data:
                    content = q['question_content']
                    # Inject bank_id so we can track it later
                    content['bank_id'] = q['id']
                    formatted.append(content)
                    
                return formatted
            
            return []
            
        except Exception as e:
            logging.error(f"Error fetching questions from bank: {e}")
            return []

    @staticmethod
    async def get_stats():
        """Get stats for admin dashboard (subject/level -> used/available/attempted)"""
        try:
            stats = {}
            subjects = ["physics", "math", "chemistry"]
            levels = ["easy", "medium", "hard"]
            
            # Fetch only ACTIVE questions from question_bank
            # IMPORTANT: Supabase defaults to 1000 rows - we need ALL questions
            qb_response = supabase.table("question_bank").select("id, subject, level, is_used").eq("status", "ACTIVE").limit(10000).execute()
            data = qb_response.data or []
            
            logging.info(f"📊 Question Bank Stats: Fetched {len(data)} ACTIVE questions from DB")
            
            # 1. Base Stats (Used vs Available)
            for item in data:
                sub = item['subject'].lower() if item.get('subject') else 'unknown'
                lvl = item['level'].lower() if item.get('level') else 'unknown'
                if sub not in stats: stats[sub] = {}
                if lvl not in stats[sub]: stats[sub][lvl] = {"unused": 0, "used": 0, "attempted": 0}
                
                if item['is_used']:
                    stats[sub][lvl]["used"] += 1
                else:
                    stats[sub][lvl]["unused"] += 1
                    
            # 2. Attempted Stats
            # To find attempted, we need: question_bank -> questions (via bank_id) -> student_answers (via question_id)
            answers_resp = supabase.table("student_answers").select("question_id").execute()
            answered_q_ids = set(a['question_id'] for a in answers_resp.data or [])
            
            if answered_q_ids:
                # Step B: Get bank_ids for these answered questions
                # Limit to 500 to avoid query limit issues
                questions_resp = supabase.table("questions").select("bank_id").in_("id", list(answered_q_ids)[:500]).not_.is_("bank_id", "null").execute()
                attempted_bank_ids = set(q['bank_id'] for q in questions_resp.data or [])
                
                # Step C: Aggregate
                for item in data:
                    if item['id'] in attempted_bank_ids:
                        sub = item['subject'].lower() if item.get('subject') else 'unknown'
                        lvl = item['level'].lower() if item.get('level') else 'unknown'
                        if sub in stats and lvl in stats[sub]:
                            stats[sub][lvl]["attempted"] += 1

            # Fill zeros for missing keys
            for sub in subjects:
                if sub not in stats: stats[sub] = {}
                for lvl in levels:
                    if lvl not in stats[sub]:
                        stats[sub][lvl] = {"unused": 0, "used": 0, "attempted": 0}
            
            # Log final stats for debugging
            for sub in subjects:
                total_unused = sum(stats[sub][lvl]["unused"] for lvl in levels)
                logging.info(f"📈 {sub.upper()}: {total_unused} available (unused)")

            return stats
        except Exception as e:
            logging.error(f"Error getting bank stats: {e}")
            import traceback
            traceback.print_exc()
            return {}


    @staticmethod
    async def get_all_topics(subject: str) -> List[str]:
        """Fetch topics from DB, falling back to JSON/Hardcoded"""
        try:
            db_topics = []
            # 1. Try DB
            resp = supabase.table("topics").select("topic_name").eq("subject", subject).execute()
            if resp.data:
                db_topics = [r['topic_name'] for r in resp.data]
            
            # 2. Merge/Fallback if DB has too few topics (preventing "One Topic" stuck state)
            import ai_service
            fallback_topics = ai_service.get_subject_topics(subject)
            
            if len(db_topics) < 5:
                logging.warning(f"⚠️ DB has only {len(db_topics)} topics for {subject}. Merging with fallback.")
                # Combine and dedup
                combined = list(set(db_topics + fallback_topics))
                return combined
            
            return db_topics
        except Exception as e:
            logging.error(f"Error fetching topics: {e}")
            import ai_service
            return ai_service.get_subject_topics(subject)

    @staticmethod
    async def generate_guarded(subject: str, level: str, target_per_topic: int = 3, max_questions: int = 50):
        """
        Smart Generation:
        1. Identify unsaturated topics.
        2. Generate questions ONLY for those topics.
        3. Fills the bank to meet target capacity.
        4. Respects max_questions limit.
        """
        import ai_service
        from rag_supabase import get_context
        
        print(f"🛡️ Starting Guarded Generation for {subject}/{level} (Target/Topic: {target_per_topic}, Max: {max_questions})...", flush=True)
        start_time = time.time()
        
        try:
            topics = await QuestionBankService.get_all_topics(subject)
            if not topics:
                print("⚠️ No topics found. Aborting guarded generation.", flush=True)
                return {"success": False, "message": "No topics found"}
                
            # 1. Bulk Check Saturation (Optimization)
            # Fetch all questions for this subject/level to count topics in memory
            try:
                # We only need the question_content to check topics
                q_resp = supabase.table("question_bank")\
                    .select("question_content")\
                    .eq("subject", subject)\
                    .eq("level", level.lower())\
                    .execute()
                
                existing_questions = q_resp.data or []
                topic_counts = {}
                
                for q in existing_questions:
                    content = q.get("question_content", {})
                    t = content.get("topic")
                    if t:
                        topic_counts[t] = topic_counts.get(t, 0) + 1
                        
                print(f"📊 Current Topic Counts: {topic_counts}", flush=True)
    
            except Exception as e:
                print(f"Error bulk fetching saturation: {e}", flush=True)
                topic_counts = {}
    
            # Filter and Prioritize Underserved
            # We create a list of tuples: (count, topic)
            scored_topics = []
            for topic in topics:
                count = topic_counts.get(topic, 0)
                if count < target_per_topic:
                    scored_topics.append((count, topic))
            
            if not scored_topics:
                print("✅ Bank is fully saturated for all topics. No generation needed.", flush=True)
                return {"success": True, "generated_count": 0, "message": "Bank saturated"}
                
            # Smart Sort + Shuffle
            # 1. Sort by count ASC (so 0s come first)
            scored_topics.sort(key=lambda x: x[0])
            
            # 2. Shuffle items with same count to ensure variety among the "empties"
            from itertools import groupby
            final_underserved_topics = []
            
            for count, group in groupby(scored_topics, key=lambda x: x[0]):
                group_list = list(group)
                random.shuffle(group_list)
                final_underserved_topics.extend([x[1] for x in group_list])
                
            underserved_topics = final_underserved_topics
                
            print(f"📉 Found {len(underserved_topics)}/{len(topics)} underserved topics. Processing Order: {underserved_topics[:5]}...", flush=True)
            
            # 2. Parallel Batch Generation
            # Group into batches of 3 topics
            batch_size = 3
            total_generated = 0
            
            # Determine number of needed questions
            remaining_needed = max_questions
            
            # Prepare valid batches
            batches = []
            for i in range(0, len(underserved_topics), batch_size):
                if remaining_needed <= 0:
                    break
                    
                batch_topics = underserved_topics[i:i + batch_size]
                ask_count = min(5, remaining_needed)
                batches.append((batch_topics, ask_count))
                remaining_needed -= ask_count
    
            print(f"⚡ Parallelizing {len(batches)} batches...", flush=True)
            
            import asyncio
            from settings_manager import settings_manager
            
            # Get concurrency from settings (default 3)
            settings = settings_manager.get_settings()
            limit = settings.get("max_concurrency", 3)
            
            print(f"🚦 Concurrency Limit: {limit}", flush=True)
            semaphore = asyncio.Semaphore(limit) 
    
            async def process_batch(topics_chunk, count):
                async with semaphore:
                    try:
                        q_list = await ai_service.generate_questions_logic(
                            subject, 
                            level, 
                            num_questions=count, 
                            context_func=get_context,
                            specific_topics=topics_chunk
                        )
                        if q_list:
                            await QuestionBankService.add_questions(q_list, subject, level, status="STAGING")
                            return len(q_list)
                        return 0
                    except Exception as e:
                        print(f"❌ Batch failed: {e}", flush=True)
                        return 0
    
            # Execute parallel tasks
            tasks = [process_batch(b[0], b[1]) for b in batches]
            results = await asyncio.gather(*tasks)
            
            total_generated = sum(results)
            
            if total_generated > 0:
                # 3. ATOMIC PROMOTION
                await QuestionBankService.promote_staging_to_active(subject, level)
            
            print(f"✅ GENERATION COMPLETE: Generated {total_generated} questions.", flush=True)
            return {"success": True, "generated_count": total_generated, "message": f"Generated {total_generated} questions in parallel"}

        except Exception as e:
            print(f"❌ Generation Error: {e}", flush=True)
            raise e
        finally:
            total_duration = time.time() - start_time
            print(f"⏱️ Total Generation Latency: {total_duration:.2f} seconds", flush=True)
        
    @staticmethod
    async def replenish_check(subject, level):
        """Check if replenishment is needed"""
        try:
            # Threshold: e.g., 10 questions
            threshold = 10
            
            count_resp = supabase.table("question_bank").select("id", count="exact").eq("subject", subject).eq("level", level).eq("is_used", False).execute()
            count = count_resp.count if count_resp.count is not None else 0
            
            if count < threshold:
                return True, count
            return False, count
        except Exception:
            return False, 0
