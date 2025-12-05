import os
import sys
print("Importing modules...", flush=True)
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta

print("Loading env...", flush=True)
# Load env vars
load_dotenv()

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

print(f"URL: {supabase_url}, Key: {'Found' if supabase_key else 'Missing'}", flush=True)

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found.", flush=True)
    exit(1)

print("Creating client...", flush=True)
supabase: Client = create_client(supabase_url, supabase_key)
print("Client created.", flush=True)

def get_comprehensive_reports():
    print("Starting report generation...", flush=True)
    try:
        # 1. Performance Trends (Daily Average Scores)
        print("Fetching results...", flush=True)
        results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at").execute()
        results = results_resp.data
        print(f"Fetched {len(results)} results.")
        
        daily_scores = {}
        for r in results:
            if not r.get('created_at'): continue
            date_str = r['created_at'].split('T')[0]
            if date_str not in daily_scores:
                daily_scores[date_str] = {"total": 0, "count": 0}
            
            try:
                daily_scores[date_str]["total"] += float(r['score'])
                daily_scores[date_str]["count"] += 1
            except:
                continue
                
        performance_trends = [
            {"date": date, "average_score": round(data["total"] / data["count"], 1)}
            for date, data in daily_scores.items()
        ]
        performance_trends.sort(key=lambda x: x['date']) 
        print("Performance trends calculated.")

        # 2. Student Engagement (Active vs Total)
        print("Fetching students...")
        students_resp = supabase.table("students").select("last_active_at, created_at").execute()
        students = students_resp.data
        print(f"Fetched {len(students)} students.")
        
        total_students = len(students)
        
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        active_count = sum(1 for s in students if s.get('last_active_at') and s['last_active_at'] > seven_days_ago)
        
        engagement_stats = {
            "total_students": total_students,
            "active_last_7_days": active_count,
            "inactive_count": total_students - active_count
        }
        print("Engagement stats calculated.")

        # 3. Question Difficulty (High Failure Rate)
        print("Fetching answers and questions...")
        answers_resp = supabase.table("student_answers").select("question_id, student_answer").execute()
        questions_resp = supabase.table("questions").select("id, question_text, correct_answer").execute()
        print(f"Fetched {len(answers_resp.data)} answers and {len(questions_resp.data)} questions.")
        
        questions_map = {q['id']: q for q in questions_resp.data}
        question_stats = {}
        
        for ans in answers_resp.data:
            q_id = ans['question_id']
            if q_id not in questions_map:
                continue
                
            if q_id not in question_stats:
                question_stats[q_id] = {"attempts": 0, "correct": 0, "text": questions_map[q_id]['question_text']}
            
            question_stats[q_id]["attempts"] += 1
            
            # Check correctness
            correct_answer = questions_map[q_id]['correct_answer']
            if str(ans['student_answer']).strip().lower() == str(correct_answer).strip().lower():
                question_stats[q_id]["correct"] += 1
        
        difficult_questions = []
        for q_id, stats in question_stats.items():
            if stats['attempts'] > 2:
                correct_rate = (stats['correct'] / stats['attempts']) * 100
                if correct_rate < 40:
                    difficult_questions.append({
                        "question_text": stats['text'],
                        "correct_rate": round(correct_rate, 1),
                        "attempts": stats['attempts']
                    })
        
        difficult_questions.sort(key=lambda x: x['correct_rate'])
        print("Difficult questions calculated.")

        # 4. At-Risk Students
        print("Calculating at-risk students...")
        student_scores = {}
        # Re-fetch results with student_id
        student_results_resp = supabase.table("results").select("student_id, score").not_.is_("score", "null").execute()
        
        for r in student_results_resp.data:
            s_id = r['student_id']
            if s_id not in student_scores:
                student_scores[s_id] = {"total": 0, "count": 0}
            try:
                student_scores[s_id]["total"] += float(r['score'])
                student_scores[s_id]["count"] += 1
            except:
                continue
        
        at_risk_students = []
        
        # Fetch full student details
        all_students_resp = supabase.table("students").select("id, first_name, last_name, email, last_active_at").execute()
        all_students_map = {s['id']: s for s in all_students_resp.data}
        
        for s_id, data in student_scores.items():
            if data["count"] == 0: continue
            avg = data["total"] / data["count"]
            if avg < 40: 
                student = all_students_map.get(s_id)
                if student:
                    at_risk_students.append({
                        "id": s_id,
                        "name": f"{student['first_name']} {student['last_name']}",
                        "reason": "Low Average Score",
                        "value": f"{round(avg, 1)}%"
                    })
        
        fourteen_days_ago = (datetime.now() - timedelta(days=14)).isoformat()
        for s in all_students_resp.data:
            if s.get('last_active_at') and s['last_active_at'] < fourteen_days_ago:
                if not any(r['id'] == s['id'] for r in at_risk_students):
                     at_risk_students.append({
                        "id": s['id'],
                        "name": f"{s['first_name']} {s['last_name']}",
                        "reason": "High Inactivity",
                        "value": "> 14 Days"
                    })
        print("At-risk students calculated.")

        return {
            "performance_trends": performance_trends,
            "engagement_stats": engagement_stats,
            "difficult_questions": difficult_questions[:5],
            "at_risk_students": at_risk_students[:10]
        }

    except Exception as e:
        print(f"Error generating reports: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    get_comprehensive_reports()
