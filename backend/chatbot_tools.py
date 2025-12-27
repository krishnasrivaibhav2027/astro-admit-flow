import json
import logging
import os
from typing import List, Dict, Any
from youtube_search import YoutubeSearch as YTSearch
from supabase import Client
from supabase import create_client

# Initialize Supabase (re-using env vars)
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

# Singleton client for tools
_supabase_client = None

def get_supabase() -> Client:
    global _supabase_client
    if not _supabase_client:
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not found in env")
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client

def get_student_performance(student_id: str) -> Dict[str, Any]:
    """
    Fetches the student's performance, strengths, weaknesses, and patterns.
    """
    try:
        sb = get_supabase()
        
        # 1. Fetch all results
        response = sb.table("results").select("*").eq("student_id", student_id).execute()
        results = response.data
        
        if not results:
            return {"formatted_summary": "No test results found yet. The student is new."}
            
        # 2. Analyze
        subjects = {}
        total_attempts = 0
        total_passed = 0
        
        for r in results:
            sub = r['subject']
            level = r['level']
            res = r['result']
            
            if sub not in subjects:
                subjects[sub] = {"attempts": 0, "passed": 0, "levels": {}}
            
            subjects[sub]["attempts"] += 1
            if res == 'pass':
                subjects[sub]["passed"] += 1
                total_passed += 1
            
            if level not in subjects[sub]["levels"]:
                subjects[sub]["levels"][level] = []
            
            subjects[sub]["levels"][level].append(res)
            total_attempts += 1
            
        # 3. Identify Strong/Weak
        strong_areas = []
        weak_areas = []
        
        for sub, data in subjects.items():
            pass_rate = data["passed"] / data["attempts"] if data["attempts"] > 0 else 0
            if pass_rate > 0.7:
                strong_areas.append(f"{sub} (High Pass Rate)")
            elif pass_rate < 0.4:
                weak_areas.append(f"{sub} (Needs Improvement)")
                
            # Granular level check
            if "hard" in data["levels"] and "pass" in data["levels"]["hard"]:
                strong_areas.append(f"{sub} - Advanced Level Mastered")
            
            # Check for struggle patterns (multiple fails in easy/medium)
            for lvl in ["easy", "medium"]:
                if lvl in data["levels"]:
                    fails = data["levels"][lvl].count("fail")
                    if fails > 1:
                        weak_areas.append(f"{sub} - Struggling with {lvl} concepts")

        summary = {
            "total_tests": total_attempts,
            "subjects_breakdown": subjects,
            "strong_areas": strong_areas,
            "weak_areas": weak_areas,
            "formatted_summary": f"User has taken {total_attempts} tests. Strong in: {', '.join(strong_areas) or 'None yet'}. Needs focus on: {', '.join(weak_areas) or 'None specifically'}."
        }
        
        return summary
    except Exception as e:
        logging.error(f"Error fetching student performance: {e}")
        return {"error": str(e)}

def search_youtube_videos(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Searches YouTube for top videos matching the educational query using youtube-search.
    """
    try:
        # returns JSON string directly or dict list depending on usage
        # simple usage: YoutubeSearch('search terms', max_results=10).to_dict()
        results = YTSearch(query, max_results=max_results).to_dict()
        
        formatted_results = []
        for v in results:
            # youtube-search returns: {id, thumbnails, title, long_desc, channel, duration, views, publish_time, url_suffix}
            link = f"https://www.youtube.com{v.get('url_suffix')}"
            formatted_results.append({
                "title": v.get('title'),
                "link": link,
                "thumbnail": v.get('thumbnails', [None])[0] if isinstance(v.get('thumbnails'), list) else v.get('thumbnails'),
                "duration": v.get('duration'),
                "views": v.get('views')
            })
            
        return formatted_results
    except Exception as e:
        logging.error(f"Error searching YouTube: {e}")
        return []


def generate_educational_illustration(prompt: str, subject: str = "general") -> Dict[str, Any]:
    """
    Generates an educational illustration using Vertex AI Imagen.
    Wrapper that delegates to the image_generator module.
    
    Args:
        prompt: Description of the illustration to generate
        subject: The subject area (physics, chemistry, mathematics) for context
        
    Returns:
        Dictionary with image URL or diagram description
    """
    try:
        # Import from the dedicated image generator module
        from image_generator import generate_educational_illustration as vertex_generate
        return vertex_generate(prompt, subject)
    except ImportError as e:
        logging.error(f"Could not import image_generator module: {e}")
        return {
            "success": False,
            "error": "Image generator module not available",
            "description": f"I'll describe the {subject} concept: {prompt}"
        }
    except Exception as e:
        logging.error(f"Error in image generation: {e}")
        return {
            "success": True,
            "type": "fallback",
            "description": f"Let me describe the {subject} concept: {prompt}",
            "error": str(e)
        }


# ===== ENHANCED ANALYST FUNCTIONS =====

def get_detailed_test_analysis(student_id: str, result_id: str = None, limit: int = 3) -> Dict[str, Any]:
    """
    Fetches deep question-level analysis for tests.
    If result_id is provided, focuses on that specific test.
    Otherwise, returns aggregated analysis of most recent tests.
    
    Returns:
        - test_summary: Basic test info (subject, level, score, date)
        - question_breakdown: Per-question analysis with AI explanations
        - weak_topics: Identified weak areas based on wrong answers
        - error_patterns: Common mistake types
        - improvement_suggestions: Actionable next steps
    """
    try:
        # Validate student_id
        if not student_id or student_id.strip() == "":
            return {"error": "Student ID not available. Please try again.", "question_breakdown": [], "weak_topics": []}
        
        sb = get_supabase()
        
        # 1. Fetch test results
        if result_id:
            results_resp = sb.table("results").select("*").eq("id", result_id).execute()
        else:
            results_resp = sb.table("results").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(limit).execute()
        
        if not results_resp.data:
            return {"error": "No test results found", "question_breakdown": [], "weak_topics": []}
        
        results = results_resp.data
        all_analyses = []
        all_wrong_questions = []
        topic_performance = {}  # Track performance by topic
        
        for result in results:
            rid = result.get("id")
            subject = result.get("subject", "physics")
            level = result.get("level", "medium")
            score = result.get("score", 0)
            passed = result.get("result") == "pass"
            created_at = result.get("created_at", "")
            
            # 2. Fetch questions for this result
            questions_resp = sb.table("questions").select(
                "id, question_text, correct_answer"
            ).eq("result_id", rid).order("created_at").execute()
            
            if not questions_resp.data:
                continue
            
            questions = questions_resp.data
            question_breakdown = []
            
            for idx, q in enumerate(questions, 1):
                qid = q.get("id")
                
                # 3. Fetch student's answer
                ans_resp = sb.table("student_answers").select("student_answer").eq("question_id", qid).execute()
                student_answer = ""
                if ans_resp.data and len(ans_resp.data) > 0:
                    student_answer = ans_resp.data[0].get("student_answer", "")
                
                # 4. Fetch AI review/explanation
                review_resp = sb.table("question_reviews").select("is_correct, explanation").eq("question_id", qid).execute()
                is_correct = None
                explanation = ""
                if review_resp.data and len(review_resp.data) > 0:
                    is_correct = review_resp.data[0].get("is_correct")
                    explanation = review_resp.data[0].get("explanation", "")
                
                # 5. Extract topic from question (simple keyword-based for now)
                topic = _extract_topic_from_question(q.get("question_text", ""), subject)
                
                # Track topic performance
                if topic not in topic_performance:
                    topic_performance[topic] = {"correct": 0, "total": 0}
                topic_performance[topic]["total"] += 1
                if is_correct:
                    topic_performance[topic]["correct"] += 1
                
                q_analysis = {
                    "question_number": idx,
                    "question_text": q.get("question_text", "")[:200] + "..." if len(q.get("question_text", "")) > 200 else q.get("question_text", ""),
                    "student_answer": student_answer[:150] if student_answer else "No answer provided",
                    "correct_answer": q.get("correct_answer", "")[:150],
                    "is_correct": is_correct,
                    "topic": topic,
                    "ai_explanation": explanation
                }
                question_breakdown.append(q_analysis)
                
                if is_correct == False:
                    all_wrong_questions.append({
                        "subject": subject,
                        "level": level,
                        "topic": topic,
                        "question_text": q.get("question_text", "")[:100],
                        "explanation": explanation
                    })
            
            test_analysis = {
                "result_id": rid,
                "subject": subject,
                "level": level,
                "score": score,
                "passed": passed,
                "date": created_at[:10] if created_at else "",
                "total_questions": len(questions),
                "correct_count": sum(1 for q in question_breakdown if q["is_correct"] == True),
                "question_breakdown": question_breakdown
            }
            all_analyses.append(test_analysis)
        
        # 6. Identify weak topics (< 50% accuracy)
        weak_topics = []
        strong_topics = []
        for topic, perf in topic_performance.items():
            if perf["total"] > 0:
                accuracy = perf["correct"] / perf["total"]
                if accuracy < 0.5:
                    weak_topics.append(f"{topic} ({int(accuracy*100)}% accuracy)")
                elif accuracy >= 0.8:
                    strong_topics.append(f"{topic} ({int(accuracy*100)}% accuracy)")
        
        # 7. Identify error patterns
        error_patterns = _identify_error_patterns(all_wrong_questions)
        
        # 8. Generate improvement suggestions
        suggestions = _generate_improvement_suggestions(weak_topics, error_patterns)
        
        return {
            "tests_analyzed": len(all_analyses),
            "test_analyses": all_analyses,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "error_patterns": error_patterns,
            "improvement_suggestions": suggestions,
            "recent_wrong_questions": all_wrong_questions[:5]  # Last 5 wrong for quick reference
        }
        
    except Exception as e:
        logging.error(f"Error in get_detailed_test_analysis: {e}")
        import traceback
        logging.error(traceback.format_exc())
        return {"error": str(e), "question_breakdown": [], "weak_topics": []}


def get_question_explanation(student_id: str, result_id: str, question_number: int) -> Dict[str, Any]:
    """
    Retrieves detailed explanation for a specific question in a test.
    Used when student asks "Why was question 3 wrong?" or "Explain question 2"
    
    Args:
        student_id: The student's ID
        result_id: The test result ID
        question_number: 1-indexed question number
        
    Returns:
        Full question details with AI explanation
    """
    try:
        sb = get_supabase()
        
        # Fetch questions for this result
        questions_resp = sb.table("questions").select(
            "id, question_text, correct_answer"
        ).eq("result_id", result_id).order("created_at").execute()
        
        if not questions_resp.data:
            return {"error": "No questions found for this test"}
        
        questions = questions_resp.data
        
        if question_number < 1 or question_number > len(questions):
            return {"error": f"Invalid question number. This test has {len(questions)} questions."}
        
        q = questions[question_number - 1]
        qid = q.get("id")
        
        # Fetch student's answer
        ans_resp = sb.table("student_answers").select("student_answer").eq("question_id", qid).execute()
        student_answer = ""
        if ans_resp.data and len(ans_resp.data) > 0:
            student_answer = ans_resp.data[0].get("student_answer", "No answer provided")
        
        # Fetch AI review
        review_resp = sb.table("question_reviews").select("is_correct, explanation").eq("question_id", qid).execute()
        is_correct = None
        explanation = "No detailed explanation available for this question."
        if review_resp.data and len(review_resp.data) > 0:
            is_correct = review_resp.data[0].get("is_correct")
            explanation = review_resp.data[0].get("explanation", explanation)
        
        return {
            "question_number": question_number,
            "question_text": q.get("question_text", ""),
            "your_answer": student_answer,
            "correct_answer": q.get("correct_answer", ""),
            "is_correct": is_correct,
            "explanation": explanation,
            "topic": _extract_topic_from_question(q.get("question_text", ""), "general")
        }
        
    except Exception as e:
        logging.error(f"Error in get_question_explanation: {e}")
        return {"error": str(e)}


def get_temporal_progress(student_id: str, subject: str = None) -> Dict[str, Any]:
    """
    Fetches score progression over time to show learning trajectory.
    
    Args:
        student_id: The student's ID
        subject: Optional - filter by subject
        
    Returns:
        Chronological score data and trend analysis
    """
    try:
        sb = get_supabase()
        
        query = sb.table("results").select("subject, level, score, result, created_at").eq("student_id", student_id)
        
        if subject:
            query = query.eq("subject", subject.lower())
        
        results_resp = query.order("created_at", desc=False).execute()
        
        if not results_resp.data:
            return {"progress": [], "trend": "No data"}
        
        results = results_resp.data
        
        # Group by subject
        progress_by_subject = {}
        for r in results:
            sub = r.get("subject", "unknown")
            if sub not in progress_by_subject:
                progress_by_subject[sub] = []
            
            progress_by_subject[sub].append({
                "date": r.get("created_at", "")[:10],
                "level": r.get("level"),
                "score": r.get("score", 0),
                "passed": r.get("result") == "pass"
            })
        
        # Calculate trends
        trends = {}
        for sub, progress in progress_by_subject.items():
            if len(progress) >= 2:
                first_score = progress[0].get("score", 0) or 0
                last_score = progress[-1].get("score", 0) or 0
                diff = last_score - first_score
                
                if diff > 1:
                    trends[sub] = f"📈 Improving (+{diff:.1f} points)"
                elif diff < -1:
                    trends[sub] = f"📉 Declining ({diff:.1f} points)"
                else:
                    trends[sub] = "➡️ Stable"
            else:
                trends[sub] = "📊 Need more data"
        
        return {
            "progress_by_subject": progress_by_subject,
            "trends": trends,
            "total_tests": len(results),
            "overall_pass_rate": f"{sum(1 for r in results if r.get('result') == 'pass') / len(results) * 100:.0f}%"
        }
        
    except Exception as e:
        logging.error(f"Error in get_temporal_progress: {e}")
        return {"error": str(e)}


# ===== HELPER FUNCTIONS =====

def _extract_topic_from_question(question_text: str, subject: str) -> str:
    """
    Extracts the likely topic from a question using keyword matching.
    This is a simplified version - could be enhanced with LLM classification.
    """
    question_lower = question_text.lower()
    
    # Physics topics
    physics_topics = {
        "kinematics": ["velocity", "acceleration", "displacement", "motion", "projectile", "free fall", "speed"],
        "dynamics": ["force", "newton", "friction", "tension", "momentum", "impulse"],
        "energy": ["kinetic", "potential", "work", "power", "conservation of energy", "joule"],
        "waves": ["wave", "frequency", "wavelength", "amplitude", "sound", "light", "oscillation"],
        "electricity": ["current", "voltage", "resistance", "ohm", "circuit", "capacitor", "charge"],
        "magnetism": ["magnetic", "field", "flux", "induction", "electromagnet"],
        "thermodynamics": ["heat", "temperature", "entropy", "thermal", "specific heat", "calorimetry"],
        "optics": ["lens", "mirror", "reflection", "refraction", "prism", "focal"]
    }
    
    # Chemistry topics
    chemistry_topics = {
        "atomic structure": ["atom", "electron", "proton", "neutron", "orbital", "shell", "nucleus"],
        "periodic table": ["element", "period", "group", "atomic number", "metal", "nonmetal"],
        "chemical bonding": ["bond", "ionic", "covalent", "metallic", "hydrogen bond", "valence"],
        "stoichiometry": ["mole", "molarity", "concentration", "limiting reagent", "yield"],
        "acids and bases": ["acid", "base", "ph", "buffer", "neutralization", "titration"],
        "organic chemistry": ["carbon", "hydrocarbon", "alkane", "alkene", "functional group", "isomer"],
        "thermochemistry": ["enthalpy", "exothermic", "endothermic", "hess", "calorimetry"],
        "electrochemistry": ["oxidation", "reduction", "redox", "electrode", "electrolysis", "galvanic"]
    }
    
    # Math topics
    math_topics = {
        "algebra": ["equation", "variable", "polynomial", "quadratic", "linear", "factor"],
        "calculus": ["derivative", "integral", "limit", "differentiate", "integrate", "rate of change"],
        "geometry": ["triangle", "circle", "angle", "area", "perimeter", "volume", "coordinate"],
        "trigonometry": ["sin", "cos", "tan", "angle", "radian", "trigonometric"],
        "statistics": ["mean", "median", "mode", "probability", "distribution", "variance"],
        "matrices": ["matrix", "determinant", "inverse", "eigenvalue", "linear transformation"]
    }
    
    # Select topic dictionary based on subject
    if subject.lower() == "physics":
        topics = physics_topics
    elif subject.lower() == "chemistry":
        topics = chemistry_topics
    elif subject.lower() in ["math", "mathematics"]:
        topics = math_topics
    else:
        # Combine all
        topics = {**physics_topics, **chemistry_topics, **math_topics}
    
    # Find matching topic
    for topic, keywords in topics.items():
        for keyword in keywords:
            if keyword in question_lower:
                return topic.title()
    
    return "General Concepts"


def _identify_error_patterns(wrong_questions: List[Dict]) -> List[str]:
    """
    Identifies common patterns in wrong answers.
    """
    patterns = []
    
    if not wrong_questions:
        return ["No errors to analyze - great job!"]
    
    # Count topics
    topic_counts = {}
    for q in wrong_questions:
        topic = q.get("topic", "Unknown")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    # Find repeated mistakes in same topic
    for topic, count in topic_counts.items():
        if count >= 2:
            patterns.append(f"Repeated mistakes in {topic} ({count} errors)")
    
    # Check for common explanation patterns
    explanations = [q.get("explanation", "").lower() for q in wrong_questions]
    
    calculation_keywords = ["calculation", "arithmetic", "computed incorrectly", "math error"]
    conceptual_keywords = ["concept", "understanding", "fundamental", "principle"]
    incomplete_keywords = ["incomplete", "partial", "missing", "did not include"]
    
    calc_errors = sum(1 for e in explanations if any(k in e for k in calculation_keywords))
    concept_errors = sum(1 for e in explanations if any(k in e for k in conceptual_keywords))
    incomplete_errors = sum(1 for e in explanations if any(k in e for k in incomplete_keywords))
    
    if calc_errors >= 2:
        patterns.append(f"Multiple calculation/arithmetic errors ({calc_errors})")
    if concept_errors >= 2:
        patterns.append(f"Conceptual understanding gaps ({concept_errors})")
    if incomplete_errors >= 2:
        patterns.append(f"Incomplete answers ({incomplete_errors})")
    
    if not patterns:
        patterns.append("Errors spread across different topics - review fundamentals")
    
    return patterns


def _generate_improvement_suggestions(weak_topics: List[str], error_patterns: List[str]) -> List[str]:
    """
    Generates actionable improvement suggestions based on analysis.
    """
    suggestions = []
    
    if not weak_topics:
        suggestions.append("🌟 No major weak areas identified - focus on maintaining performance")
        return suggestions
    
    # Topic-specific suggestions
    for topic in weak_topics[:3]:  # Top 3 weak areas
        topic_name = topic.split("(")[0].strip()
        suggestions.append(f"📚 Review core concepts of {topic_name}")
    
    # Pattern-based suggestions
    for pattern in error_patterns:
        if "calculation" in pattern.lower():
            suggestions.append("🧮 Practice more numerical problems and double-check calculations")
        elif "conceptual" in pattern.lower():
            suggestions.append("📖 Re-read theory sections and watch explanatory videos")
        elif "incomplete" in pattern.lower():
            suggestions.append("✍️ Practice writing complete, structured answers")
    
    # General suggestions
    suggestions.append("📝 Attempt practice questions on weak topics before re-taking the test")
    
    return suggestions[:5]  # Limit to 5 suggestions
