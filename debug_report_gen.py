import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta

# Load env vars
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'backend', '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found.")
    exit(1)

supabase: Client = create_client(url, key)

async def debug_report_data():
    print("--- Debugging Report Data Fetching ---")

    # 1. Performance Trends
    print("\n1. Performance Trends:")
    try:
        results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at", desc=True).execute()
        results = results_resp.data or []
        print(f"   Found {len(results)} results with scores.")
        
        daily_scores = {}
        for r in results:
            if not r.get('created_at'): continue
            date_str = r['created_at'].split('T')[0]
            if date_str not in daily_scores: daily_scores[date_str] = {"total": 0, "count": 0}
            daily_scores[date_str]["total"] += float(r['score'])
            daily_scores[date_str]["count"] += 1
        
        performance_trends = [{"date": d, "average_score": round(v["total"] / v["count"], 1)} for d, v in daily_scores.items()]
        performance_trends.sort(key=lambda x: x['date'])
        print(f"   Trends: {performance_trends[-5:]}")
    except Exception as e:
        print(f"   Error: {e}")

    # 2. Engagement
    print("\n2. Engagement:")
    try:
        students_resp = supabase.table("students").select("last_active_at").execute()
        students = students_resp.data or []
        print(f"   Found {len(students)} students.")
        
        total = len(students)
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        active = sum(1 for s in students if s.get('last_active_at') and s['last_active_at'] > seven_days_ago)
        engagement_stats = {"total_students": total, "active_last_7_days": active, "inactive": total - active}
        print(f"   Stats: {engagement_stats}")
    except Exception as e:
        print(f"   Error: {e}")

    # 3. Difficult Questions
    print("\n3. Difficult Questions:")
    try:
        answers_resp = supabase.table("student_answers").select("question_id, student_answer").execute()
        questions_resp = supabase.table("questions").select("id, question_text, correct_answer").execute()
        answers_data = answers_resp.data or []
        questions_data = questions_resp.data or []
        print(f"   Found {len(answers_data)} answers and {len(questions_data)} questions.")
        
        q_map = {q['id']: q for q in questions_data}
        q_stats = {}
        for ans in answers_data:
            q_id = ans.get('question_id')
            if not q_id or q_id not in q_map: continue
            if q_id not in q_stats: q_stats[q_id] = {"attempts": 0, "correct": 0, "text": q_map[q_id]['question_text']}
            q_stats[q_id]["attempts"] += 1
            
            # Check correctness
            is_correct = str(ans.get('student_answer', '')).strip().lower() == str(q_map[q_id]['correct_answer']).strip().lower()
            if is_correct:
                q_stats[q_id]["correct"] += 1
        
        difficult_questions = []
        for stats in q_stats.values():
            if stats['attempts'] > 0: # Changed from > 2 for debug
                rate = (stats['correct'] / stats['attempts']) * 100
                difficult_questions.append({"text": stats['text'], "rate": round(rate, 1), "attempts": stats['attempts']})
        
        difficult_questions.sort(key=lambda x: x['rate'])
        print(f"   Difficult Questions (Top 3): {difficult_questions[:3]}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_report_data())
