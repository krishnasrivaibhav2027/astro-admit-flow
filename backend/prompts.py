from langchain_core.prompts import ChatPromptTemplate

# ===== PROMPTS (LangGraph style) =====
generate_questions_prompt_physics = ChatPromptTemplate.from_messages([
    ("system",
     "Generate physics exam questions. Follow rules strictly. Output ONLY valid JSON."
    ),
    ("human",
     "CONTEXT:\n{context}\n\n"
     "TOPIC: {topic}\n"
     "DIFFICULTY: {level}\n"
     "COUNT: {num_questions}\n\n"
     "RULES:\n"
     "- Generate EXACTLY {num_questions} questions\n"
     "- Every question MUST test a DIFFERENT concept within {topic}\n"
     "- Use at least 3 formats: conceptual, numerical, reasoning, comparison\n"
     "- Each question: max 2 sentences\n"
     "- Each answer: max 4 sentences\n"
     "- Use LaTeX ($...$) ONLY for equations\n"
     "- No references to text, passage, or source\n"
     "- No repeated structure or phrasing\n\n"
     "DIFFICULTY:\n"
     "- easy: single concept\n"
     "- medium: multi-step application\n"
     "- hard: multi-concept reasoning\n\n"
     "OUTPUT FORMAT:\n"
     "[{{\"question\":\"...\",\"answer\":\"...\"}}]"
    )
])

generate_questions_prompt_math = ChatPromptTemplate.from_messages([
    ("system",
     "Generate math exam problems and solutions. Output ONLY valid JSON."
    ),
    ("human",
     "CONTEXT:\n{context}\n\n"
     "TOPIC: {topic}\n"
     "DIFFICULTY: {level}\n"
     "COUNT: {num_questions}\n\n"
     "RULES:\n"
     "- Generate EXACTLY {num_questions} problems\n"
     "- Each problem must require calculation or proof\n"
     "- No repeated methods or formulas\n"
     "- Inline math: $x$, $y=mx+c$\n"
     "- Block math: $$...$$\n"
     "- Escape all LaTeX using double backslashes (\\\\)\n"
     "- Solutions: max 6 logical steps\n"
     "- Final answer must be clearly stated\n\n"
     "OUTPUT FORMAT:\n"
     "[{{\"question\":\"...\",\"answer\":\"...\"}}]"
    )
])

generate_questions_prompt_chemistry = ChatPromptTemplate.from_messages([
    ("system",
     "Generate chemistry exam questions. Output ONLY valid JSON."
    ),
    ("human",
     "CONTEXT:\n{context}\n\n"
     "TOPIC: {topic}\n"
     "DIFFICULTY: {level}\n"
     "COUNT: {num_questions}\n\n"
     "RULES:\n"
     "- Generate EXACTLY {num_questions} questions\n"
     "- Cover relevant organic / inorganic / physical concepts\n"
     "- No repeated reaction types or concepts\n"
     "- Use equations where appropriate\n"
     "- Each question: max 2 sentences\n"
     "- Each answer: max 5 sentences\n\n"
     "OUTPUT FORMAT:\n"
     "[{{\"question\":\"...\",\"answer\":\"...\"}}]"
    )
])

evaluate_answer_prompt_physics = ChatPromptTemplate.from_messages([
    ("system",
     "Evaluate answers numerically. Return ONLY valid JSON."
    ),
    ("human",
     "QUESTION: {question}\n"
     "REFERENCE ANSWER: {correct_answer}\n"
     "STUDENT ANSWER: {student_answer}\n\n"
     "SCORE (1–10):\n"
     "- Relevance\n"
     "- Accuracy\n"
     "- ConceptualCorrectness\n"
     "- Completeness\n"
     "- Clarity\n"
     "- Reasoning\n\n"
     "OUTPUT:\n"
     "{{"
     "\"Relevance\":n,"
     "\"Clarity\":n,"
     "\"SubjectUnderstanding\":n,"
     "\"Accuracy\":n,"
     "\"Completeness\":n,"
     "\"CriticalThinking\":n,"
     "\"average\":n"
     "}}"
    )
])

evaluate_answer_prompt_math = ChatPromptTemplate.from_messages([
    ("system",
     "Evaluate math answers mechanically. Return ONLY valid JSON."
    ),
    ("human",
     "QUESTION: {question}\n"
     "REFERENCE ANSWER: {correct_answer}\n"
     "STUDENT ANSWER: {student_answer}\n\n"
     "RULES:\n"
     "- If final numerical values match, Accuracy = 10\n"
     "- Ignore formatting differences\n\n"
     "SCORE (1–10):\n"
     "- Relevance\n"
     "- Accuracy\n"
     "- ConceptualCorrectness\n"
     "- Completeness\n"
     "- Clarity\n"
     "- Efficiency\n\n"
     "OUTPUT:\n"
     "{{"
     "\"Relevance\":n,"
     "\"Clarity\":n,"
     "\"SubjectUnderstanding\":n,"
     "\"Accuracy\":n,"
     "\"Completeness\":n,"
     "\"CriticalThinking\":n,"
     "\"average\":n"
     "}}"
    )
])

evaluate_answer_prompt_chemistry = ChatPromptTemplate.from_messages([
    ("system",
     "Evaluate chemistry answers mechanically and objectively. Return ONLY valid JSON."
    ),
    ("human",
     "QUESTION: {question}\n"
     "REFERENCE ANSWER: {correct_answer}\n"
     "STUDENT ANSWER: {student_answer}\n\n"
     "SCORING RULES (1–10):\n"
     "- Relevance: Directly answers the question\n"
     "- Accuracy: Correct formulas, reactions, and facts\n"
     "- ConceptualCorrectness: Correct chemical principles\n"
     "- Completeness: All required points covered\n"
     "- Clarity: Logical and clear explanation\n"
     "- Application: Correct application of theory (if applicable)\n\n"
     "OUTPUT FORMAT (STRICT):\n"
     "{{"
     "\"Relevance\":n,"
     "\"Clarity\":n,"
     "\"SubjectUnderstanding\":n,"
     "\"Accuracy\":n,"
     "\"Completeness\":n,"
     "\"CriticalThinking\":n,"
     "\"average\":n"
     "}}"
    )
])


topic_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Extract syllabus-level topics. Return ONLY valid JSON."
    ),
    ("human",
     "SUBJECT: {subject}\n\n"
     "TEXT:\n{context}\n\n"
     "RULES:\n"
     "- Extract ONLY main chapters or units\n"
     "- Ignore subsections, exercises, summaries\n"
     "- Generalize specific items to parent chapters\n"
     "- Remove numbering (Chapter 1, Unit 2)\n"
     "- Max 30 topics\n"
     "- No duplicates\n\n"
     "OUTPUT:\n"
     "{{ \"topics\": [\"...\"] }}"
    )
])
