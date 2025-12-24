
import logging
import json
import redis
import asyncio
from typing import List, Dict, Set
from redis_client import get_redis
from langchain_google_genai import ChatGoogleGenerativeAI
from settings_manager import settings_manager
import os

# Prompt for Concept Extraction
CONCEPT_EXTRACTION_PROMPT = """
You are an expert curriculum designer for NCERT {subject}.
Analyze the following text from the textbook.
Ignore the text's internal chapter numbering (e.g. "Chapter 4") if it conflicts with the provided Valid Topics list.

OBJECTIVE:
Identify the hierarchy of concepts and map them to the Official Syllabus.

VALID TOPICS (Syllabus):
{valid_topics}

INSTRUCTIONS:
1. Extract key CONCEPTS from the text.
2. Map each Concept to the MOST RELEVANT topic from the 'VALID TOPICS' list above.
3. If the text covers a "Chapter" that matches a Valid Topic exactly, use that.
4. If a concept seems to belong to a sub-topic, map it to the parent Valid Topic.
5. Identify dependencies (prerequisites).

Output a JSON object with this structure:
{{
  "chapter": "Name of the Valid Topic this text belongs to",
  "topics": [
    {{
      "name": "Sub-topic or Specific Area (optional, or reuse Chapter Name)",
      "concepts": [
        {{
          "name": "Concept Name",
          "description": "Brief description",
          "prerequisites": ["prerequisite_concept_name_1", ...] 
        }}
      ]
    }}
  ]
}}

Text to analyze:
{text}
"""

class GraphService:
    @staticmethod
    def _normalize_key(text: str) -> str:
        """Normalize text to a redis-friendly key suffix"""
        return text.lower().strip().replace(" ", "_").replace("'", "").replace("-", "_")

    @staticmethod
    def _load_canonical_topics(subject: str) -> str:
        try:
            with open("topics.json", "r") as f:
                data = json.load(f)
                topics = data.get(subject.lower(), [])
                return ", ".join(topics)
        except Exception as e:
            logging.warning(f"Could not load topics.json: {e}")
            return "No restrictions, infer from text."

    @staticmethod
    async def build_graph_from_text(subject: str, text_chunk: str):
        """
        Parse text chunk using LLM and update the Redis Graph.
        """
        redis_client = get_redis()
        if not redis_client:
            logging.warning("Redis not available, skipping graph build.")
            return

        try:
            # Load Valid Topics
            valid_topics_str = GraphService._load_canonical_topics(subject)
            print(f"📋 Enforcing Syllabus Topics: {valid_topics_str[:100]}...", flush=True)

            # 1. Extract Concepts using LLM
            # We use a cheaper/faster model for this extraction task if possible
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp", 
                google_api_key=os.getenv("GEMINI_API_KEY"),
                temperature=0.1
            )
            
            prompt = CONCEPT_EXTRACTION_PROMPT.format(
                subject=subject, 
                text=text_chunk[:15000],  # Increased context slightly
                valid_topics=valid_topics_str
            ) # Limit context
            
            response = llm.invoke(prompt)
            content = response.content.replace('```json', '').replace('```', '').strip()
            
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                # Try simple fix
                import re
                content = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', content)
                data = json.loads(content)

            # 2. Store in Redis
            # Schema:
            # SADD subject:{subject}:chapters "{chapter_name}"
            # SADD chapter:{normalized_chapter}:topics "{topic_name}"
            # SADD topic:{normalized_topic}:concepts "{concept_name}"
            # HSET concept:{normalized_concept} description "..." subject "{subject}"
            # SADD concept:{normalized_concept}:prereqs "{prereq_name}"
            
            chapter = data.get("chapter", "Unknown Chapter")
            norm_chapter = GraphService._normalize_key(chapter)
            
            pipeline = redis_client.pipeline()
            
            # Add Chapter
            pipeline.sadd(f"subject:{subject}:chapters", chapter)
            
            print(f"📖 extracted CHAPTER: {chapter}", flush=True)
            
            for topic in data.get("topics", []):
                topic_name = topic.get("name")
                norm_topic = GraphService._normalize_key(topic_name)
                
                print(f"  └── 📂 TOPIC: {topic_name}", flush=True)
                
                # Link Chapter -> Topic
                pipeline.sadd(f"chapter:{norm_chapter}:topics", topic_name)
                
                # Link Topic -> Concept
                for concept in topic.get("concepts", []):
                    c_name = concept.get("name")
                    c_desc = concept.get("description", "")
                    norm_concept = GraphService._normalize_key(c_name)
                    
                    print(f"      └── 💡 CONCEPT: {c_name}", flush=True)
                    
                    pipeline.sadd(f"topic:{norm_topic}:concepts", c_name)
                    
                    # Concept Details
                    pipeline.hset(
                        f"concept:{norm_concept}", 
                        mapping={"name": c_name, "description": c_desc, "subject": subject, "topic": topic_name}
                    )
                    
                    # Prerequisites
                    for prereq in concept.get("prerequisites", []):
                        print(f"          └── 🔗 NEEDS: {prereq}", flush=True)
                        norm_prereq = GraphService._normalize_key(prereq)
                        pipeline.sadd(f"concept:{norm_concept}:prereqs", norm_prereq)
                        # Inverse (Dependents)
                        pipeline.sadd(f"concept:{norm_prereq}:dependents", norm_concept)
            
            pipeline.execute()
            print(f"✅ Graph committed to Redis for {subject}", flush=True)
            
        except Exception as e:
            logging.error(f"❌ Error building graph: {e}")

    @staticmethod
    def get_traversal_path(subject: str, start_topic: str = None, depth: int = 2) -> List[str]:
        """
        Suggest a list of concepts to cover.
        If start_topic is None, picks random chapter/topic.
        If provided, explores related/dependent concepts.
        """
        redis_client = get_redis()
        if not redis_client:
            return []
            
        try:
            if not start_topic:
                # Pick random chapter
                chapters = redis_client.smembers(f"subject:{subject}:chapters")
                if not chapters: return []
                import random
                chapter = random.choice(list(chapters))
                norm_chapter = GraphService._normalize_key(chapter)
                
                # Pick topics
                topics = redis_client.smembers(f"chapter:{norm_chapter}:topics")
                if not topics: return [chapter]
                
                # Pick Concepts
                all_concepts = []
                for t in list(topics)[:3]: # Sample few topics
                    norm_t = GraphService._normalize_key(t)
                    concepts = redis_client.smembers(f"topic:{norm_t}:concepts")
                    all_concepts.extend(list(concepts))
                
                return random.sample(all_concepts, min(len(all_concepts), 5)) if all_concepts else [chapter]
                
            else:
                # Traversal Logic
                norm_start = GraphService._normalize_key(start_topic)
                
                # Get direct concepts if input is a topic
                concepts = redis_client.smembers(f"topic:{norm_start}:concepts")
                
                # If input is a concept, get prereqs and dependents
                if not concepts:
                    # Check if it is a concept itself
                    if redis_client.exists(f"concept:{norm_start}"):
                        prereqs = redis_client.smembers(f"concept:{norm_start}:prereqs")
                        deps = redis_client.smembers(f"concept:{norm_start}:dependents")
                        return list(prereqs) + [start_topic] + list(deps)
                
                return list(concepts)
                
        except Exception as e:
            logging.error(f"Graph Traversal Error: {e}")
            return [start_topic] if start_topic else []

