# ============================================================
#  ai_service.py — AI Interview Question & Evaluation Service
# ============================================================
import json
import logging
import random
import httpx
from typing import Any, Dict, List
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger("smarthire.ai")


class AIService:
    """
    Reusable AI service supporting Gemini, OpenAI, Ollama, and a rich fallback engine.
    """

    @classmethod
    def get_gemini_api_key(cls) -> str:
        """
        Retrieves Gemini API key from admin configuration, settings, or environment variables.
        """
        import os
        admin_key = ""
        try:
            from app.routers.admin import _ai_config
            if isinstance(_ai_config, dict):
                admin_key = _ai_config.get("gemini_api_key", "")
        except Exception:
            pass

        key = (
            admin_key or
            settings.GEMINI_API_KEY or 
            os.environ.get("GEMINI_API_KEY", "") or 
            os.environ.get("GOOGLE_API_KEY", "") or 
            ""
        ).strip()
        return key

    @classmethod
    async def generate_interview_questions(
        cls,
        job_role: str,
        domain: str,
        interview_type: str,
        difficulty: str,
        num_questions: int = 5,
        user_skills: str | None = None,
        job_description: str | None = None,
        resume_text: str | None = None,
        generation_seed: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate interview questions using configured AI provider (Gemini/OpenAI/Ollama).
        Raises HTTPException on API failure without returning hardcoded fallback questions.
        """
        provider = settings.AI_PROVIDER.lower()
        gemini_key = cls.get_gemini_api_key()

        # Try Gemini API if provider is gemini or if key is available
        if (provider == "gemini" or gemini_key) and gemini_key:
            questions = await cls._generate_with_gemini(
                job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, gemini_key, generation_seed
            )
            if questions and len(questions) > 0:
                # Validate generated questions against requested interview_type
                if interview_type == "HR Interview" or "hr" in interview_type.lower():
                    tech_keywords = [
                        "coding", "programming", "algorithm", "data structure", "system design",
                        "sql", "database", "api", "react", "javascript", "python", "memory leak",
                        "memory management", "debugging", "microservice", "architecture", "restful",
                        "async i/o", "concurrency", "thread", "process", "compiler", "query optimization"
                    ]
                    valid_questions = []
                    for q in questions:
                        q_text = q.get("question_text", "").lower()
                        if not any(kw in q_text for kw in tech_keywords):
                            valid_questions.append(q)
                        else:
                            logger.warning(f"[Gemini AI] Filtered out technical question from HR interview: {q.get('question_text')}")
                    
                    for idx, q in enumerate(valid_questions, 1):
                        q["question_number"] = idx
                        q["interview_type"] = "HR Interview"
                    questions = valid_questions[:num_questions]
                return questions

        # Try OpenAI API if key is present or provider is openai
        if provider == "openai" and settings.OPENAI_API_KEY:
            questions = await cls._generate_with_openai(
                job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed
            )
            if questions:
                return questions

        # Try Ollama API
        if provider == "ollama":
            questions = await cls._generate_with_ollama(
                job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed
            )
            if questions:
                return questions

        # If no key or provider failed without raising HTTPException
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Service configured key is missing or failed to generate questions."
        )

    @classmethod
    async def evaluate_answer(
        cls,
        question_text: str,
        user_answer: str,
        interview_type: str,
        difficulty: str,
        expected_points: List[str] | None = None,
    ) -> Dict[str, Any]:
        """
        Evaluate candidate's answer and return score (0-100), feedback, and improved sample answer.
        """
        if not user_answer or len(user_answer.strip()) < 5:
            return {
                "score": 20.0,
                "feedback": "Answer is incomplete or too short. Please provide a more detailed response.",
                "sample_answer": "A complete response should address key technical concepts and provide specific context or practical examples."
            }

        provider = settings.AI_PROVIDER.lower()
        gemini_key = cls.get_gemini_api_key()
        if (provider == "gemini" or gemini_key) and gemini_key:
            try:
                prompt = f"""Evaluate this interview answer.
Question: {question_text}
Candidate Answer: {user_answer}
Interview Type: {interview_type}
Difficulty: {difficulty}
Expected Key Points: {json.dumps(expected_points or [])}

Respond ONLY with valid JSON in format:
{{
  "score": <number 0 to 100>,
  "feedback": "<detailed feedback on strengths and areas of improvement>",
  "sample_answer": "<model answer illustrating ideal response structure>"
}}"""
                models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]
                for model_name in models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        res = await client.post(url, json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"response_mime_type": "application/json"}
                        })
                        if res.status_code == 200:
                            data = res.json()
                            text = data['candidates'][0]['content']['parts'][0]['text']
                            text = text.replace("```json", "").replace("```", "").strip()
                            parsed = json.loads(text)
                            return parsed
            except Exception as e:
                logger.warning(f"Gemini evaluation failed: {e}")

        # Fallback heuristic evaluation
        length = len(user_answer.split())
        base_score = min(90.0, max(50.0, 45 + length * 0.8))
        feedback = f"Good effort! Your response addresses the question well. To strengthen it, consider framing your answer with clearer structure (e.g., STAR method for behavioral or concrete architectural steps for technical)."
        sample_answer = f"An exemplary response for '{question_text}' involves highlighting key principles, real-world experience, and metric-driven outcomes."
        return {
            "score": round(base_score, 1),
            "feedback": feedback,
            "sample_answer": sample_answer
        }

    # ── AI Provider Implementations ───────────────────────────

    @classmethod
    async def _generate_with_gemini(cls, job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, gemini_key: str, generation_seed: str | None = None):
        logger.info(f"[Gemini AI] Request received: Role='{job_role}', Domain='{domain}', Type='{interview_type}', Difficulty='{difficulty}', Seed='{generation_seed}'")
        prompt = cls._build_prompt(job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed)
        models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]
        
        last_error = None
        has_quota_error = False

        for model_name in models:
            logger.info(f"[Gemini AI] Selected Gemini model: '{model_name}'")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
            
            payloads = [
                {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"response_mime_type": "application/json"}},
                {"contents": [{"parts": [{"text": prompt}]}]}
            ]

            for payload in payloads:
                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        res = await client.post(url, json=payload)
                        logger.info(f"[Gemini AI] Model '{model_name}' Gemini response status: {res.status_code}")
                        
                        if res.status_code == 200:
                            data = res.json()
                            candidates = data.get('candidates', [])
                            if candidates and 'content' in candidates[0]:
                                parts = candidates[0]['content'].get('parts', [])
                                if parts and 'text' in parts[0]:
                                    raw_text = parts[0]['text']
                                    questions = cls._parse_json_questions(raw_text, interview_type, domain, difficulty)
                                    if questions:
                                        logger.info(f"[Gemini AI] Parsing success! Generated {len(questions)} questions using model '{model_name}'")
                                        return questions
                                    else:
                                        logger.warning(f"[Gemini AI] Parsing failure for output from model '{model_name}'")
                        elif res.status_code == 429 or "quota" in res.text.lower():
                            has_quota_error = True
                            error_detail = res.text[:300]
                            logger.error(f"[Gemini AI] Quota error on model '{model_name}': {error_detail}")
                            last_error = f"Status 429: Gemini API quota exceeded. Please check the Gemini API quota/billing for this API key."
                        else:
                            error_detail = res.text[:300]
                            logger.warning(f"[Gemini AI] Model '{model_name}' returned status {res.status_code}: {error_detail}")
                            last_error = f"Status {res.status_code}: {error_detail}"
                except Exception as e:
                    logger.warning(f"[Gemini AI] Error calling Gemini model '{model_name}': {e}")
                    last_error = str(e)
                
        if has_quota_error:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Gemini API quota exceeded. Please check the Gemini API quota/billing for this API key."
            )
        elif last_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API request failed: {last_error}"
            )
        return None

    @classmethod
    async def _generate_with_openai(cls, job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed: str | None = None):
        prompt = cls._build_prompt(job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed)
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.8,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_text = data['choices'][0]['message']['content']
                return cls._parse_json_questions(raw_text, interview_type, domain, difficulty)
        return None

    @classmethod
    async def _generate_with_ollama(cls, job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed: str | None = None):
        prompt = cls._build_prompt(job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed)
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json={"model": "llama3", "prompt": prompt, "stream": False})
            if res.status_code == 200:
                data = res.json()
                return cls._parse_json_questions(data.get("response", ""), interview_type, domain, difficulty)
        return None

    @classmethod
    def _build_prompt(cls, job_role, domain, interview_type, difficulty, num_questions, user_skills, job_description, resume_text, generation_seed: str | None = None):
        import time
        entropy_token = generation_seed or f"{time.time()}_{random.randint(10000, 99999)}"

        is_hr = interview_type == "HR Interview" or "hr" in interview_type.lower()
        is_behavioral = interview_type == "Behavioral Interview" or "behavioral" in interview_type.lower()
        is_aptitude = interview_type == "Aptitude Interview" or "aptitude" in interview_type.lower()

        if is_hr:
            type_rules = """
Interview Type: HR Interview

You MUST generate questions specifically for this interview type.
Do not generate questions from another interview type.

If Interview Type is HR, generate ONLY HR/non-technical questions such as:
- Tell me about yourself.
- Why do you want to join this company?
- What are your strengths and weaknesses?
- Describe a conflict you handled at work.
- How do you handle pressure and deadlines?
- Describe a leadership/teamwork experience.
- Where do you see yourself in five years?
- Why should we hire you?

Never generate programming, coding, algorithms, system design, database, API, memory management, or other technical questions for HR interviews.
Even though the candidate's job role may be technical (e.g. Developer/Engineer), every single HR question MUST be purely non-technical and focused on career background, culture fit, and workplace behavior.
"""
        elif is_behavioral:
            type_rules = """
Interview Type: Behavioral Interview

You MUST generate questions specifically for this interview type.
Do not generate questions from another interview type.

Generate ONLY behavioral and situational questions focused on communication, teamwork, leadership, conflict resolution, problem solving, adaptability, and managing priorities using the STAR framework.
"""
        elif is_aptitude:
            type_rules = """
Interview Type: Aptitude Interview

You MUST generate questions specifically for this interview type.
Do not generate questions from another interview type.

Generate ONLY quantitative reasoning, logical deduction, numerical, and verbal reasoning questions. Do NOT ask programming language syntax questions.
"""
        else:
            type_rules = f"""
Interview Type: Technical Interview

You MUST generate questions specifically for this interview type.
Generate technical questions relevant to the selected job role ({job_role}), domain ({domain}), and skills ({user_skills or 'core skills'}).
"""

        return f"""You are an expert interviewer and hiring manager.
Generate exactly {num_questions} tailored, fresh, and completely unique interview questions for a candidate.
Generation Entropy Seed: {entropy_token}

Selected Interview Configuration:
- Job Role: {job_role}
- Domain: {domain}
- Interview Type: {interview_type}
- Difficulty Level: {difficulty}
- Candidate Skills: {user_skills or 'Standard domain skills'}
- Job Description: {job_description or 'Standard industry expectations'}
- Candidate Resume / Background: {resume_text or 'Standard experience'}

{type_rules}

CRITICAL INSTRUCTION:
Every question MUST strictly belong to the specified Interview Type: "{interview_type}".
Respond ONLY with a valid JSON array of objects. Do NOT wrap in markdown or add conversational text.

Format:
[
  {{
    "question_number": 1,
    "question_text": "<Clear, engaging question strictly matching {interview_type}>",
    "category": "<Specific category>",
    "expected_answer_points": ["<Key point 1>", "<Key point 2>", "<Key point 3>"],
    "sample_answer": "<Concise model answer>"
  }}
"""

    @classmethod
    def _parse_json_questions(cls, raw_text: str, interview_type: str, domain: str, difficulty: str) -> List[Dict[str, Any]]:

        if not raw_text:
            return []
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        
        items = None
        try:
            items = json.loads(cleaned)
        except Exception:
            pass

        if items is None:
            start = cleaned.find("[")
            end = cleaned.rfind("]")
            if start != -1 and end != -1 and start < end:
                try:
                    items = json.loads(cleaned[start:end+1])
                except Exception:
                    pass

        if items is None:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and start < end:
                try:
                    items = json.loads(cleaned[start:end+1])
                except Exception:
                    pass

        if isinstance(items, dict):
            for key in ["questions", "interview_questions", "data", "results", "items"]:
                if key in items and isinstance(items[key], list):
                    items = items[key]
                    break

        if not isinstance(items, list):
            return []

        results = []
        for idx, q in enumerate(items, 1):
            if not isinstance(q, dict):
                continue
            results.append({
                "question_number": q.get("question_number", idx),
                "question_text": q.get("question_text") or q.get("question") or f"Question {idx} for target role",
                "interview_type": interview_type,
                "domain": domain,
                "difficulty": difficulty,
                "category": q.get("category", domain),
                "expected_answer_points": q.get("expected_answer_points") or q.get("points") or ["Domain depth", "Structured explanation", "Concrete examples"],
                "sample_answer": q.get("sample_answer") or q.get("sample") or "A clear response covering technical approach and practical implementation."
            })
        return results

    # ── Smart Fallback Question Generator ─────────────────────

    @classmethod
    def _generate_smart_fallback(
        cls,
        job_role: str,
        domain: str,
        interview_type: str,
        difficulty: str,
        num_questions: int,
        user_skills: str | None,
        job_description: str | None,
        resume_text: str | None
    ) -> List[Dict[str, Any]]:
        """
        Produces realistic domain-specific and type-tailored interview questions when external LLM is offline.
        """
        questions_bank = {
            "Technical Interview": {
                "Software Development": [
                    {
                        "question": f"In {job_role}, how do you approach designing scalable RESTful APIs microservices architecture?",
                        "category": "System Design",
                        "points": ["API versioning & rate limiting", "Database connection pooling", "Stateless auth with JWT"],
                        "sample": "I start by mapping resource endpoints, ensuring statelessness, defining idempotent methods, and using caching layers like Redis."
                    },
                    {
                        "question": "Can you explain the difference between processes and threads, and how asynchronous I/O improves concurrency?",
                        "category": "Operating Systems & Concurrency",
                        "points": ["Process memory isolation vs thread shared memory", "Event-loop non-blocking I/O", "Context switching overhead"],
                        "sample": "Processes have distinct memory spaces while threads share memory. Async I/O delegates waiting on network/disk to OS events, avoiding thread blocking."
                    },
                    {
                        "question": f"How do you optimize complex SQL database queries when dealing with millions of records in {domain} applications?",
                        "category": "Database Performance",
                        "points": ["Index analysis & EXPLAIN ANALYZE", "Query refactoring & avoiding N+1", "Database partitioning and sharding"],
                        "sample": "I use EXPLAIN ANALYZE to identify sequential scans, index foreign keys, avoid SELECT *, and implement pagination or CTEs where appropriate."
                    },
                    {
                        "question": f"Walk us through your CI/CD and unit testing strategy for {job_role} projects.",
                        "category": "DevOps & QA",
                        "points": ["Automated test suites (unit, integration, e2e)", "GitHub Actions / GitLab CI pipelines", "Zero-downtime deployment strategies"],
                        "sample": "We write unit tests with high coverage, run automated linting and security scans in CI on pull requests, and deploy using rolling updates."
                    },
                    {
                        "question": "How do you detect, handle, and prevent memory leaks in modern application runtimes?",
                        "category": "Memory Management",
                        "points": ["Garbage collection cycles", "Dangling event listeners / subscriptions", "Memory profiling tools"],
                        "sample": "Using heap snapshots and profilers to identify unreferenced memory retained by event listeners, global references, or unclosed streams."
                    }
                ],
                "AI/ML": [
                    {
                        "question": "Explain the trade-offs between bias and variance in machine learning models and how to mitigate overfitting.",
                        "category": "Machine Learning Fundamentals",
                        "points": ["High bias = underfitting, High variance = overfitting", "Regularization (L1/L2)", "Cross-validation & data augmentation"],
                        "sample": "Bias represents simplifying assumptions while variance represents sensitivity to noise. Overfitting is combated via dropout, regularization, and cross-validation."
                    },
                    {
                        "question": f"How do you evaluate and optimize Large Language Models (LLMs) for domain-specific tasks in {job_role}?",
                        "category": "Generative AI",
                        "points": ["Retrieval-Augmented Generation (RAG)", "Parameter-Efficient Fine-Tuning (PEFT/LoRA)", "Evaluation metrics (ROUGE, BLEU, human eval)"],
                        "sample": "We use RAG with vector stores to inject updated contextual data, combined with LoRA fine-tuning for custom tone and structured output compliance."
                    },
                    {
                        "question": "Describe the architecture of Transformer models and the core role of Self-Attention mechanism.",
                        "category": "Deep Learning Architecture",
                        "points": ["Scaled Dot-Product Attention", "Multi-Head Attention", "Positional Encodings"],
                        "sample": "Self-attention computes dynamic context vectors across sequence tokens by calculating Query, Key, Value matrix dot-products scaled by dimension sqrt."
                    }
                ],
                "Data Science": [
                    {
                        "question": "How do you handle missing values, outliers, and imbalanced datasets prior to model training?",
                        "category": "Data Preprocessing",
                        "points": ["Imputation techniques (Mean, KNN, MICE)", "SMOTE & Class re-weighting", "Robust statistical scaling"],
                        "sample": "I assess missingness mechanism (MCAR/MAR), use median/iterative imputation, apply log transforms or winsorization for outliers, and SMOTE for imbalance."
                    },
                    {
                        "question": "Explain the mathematical difference between ROC-AUC and Precision-Recall curves. When should you use which?",
                        "category": "Model Evaluation Metrics",
                        "points": ["ROC uses True Positive Rate vs False Positive Rate", "Precision-Recall focuses on positive class", "PR curves preferred for highly imbalanced data"],
                        "sample": "ROC curves can be overly optimistic on heavily imbalanced datasets because False Positive Rate stays low; PR curves prioritize true positive quality."
                    }
                ],
                "Cloud": [
                    {
                        "question": f"How do you architect a multi-region fault-tolerant infrastructure for {job_role}?",
                        "category": "Cloud Architecture",
                        "points": ["Active-active or active-passive DNS routing", "Cross-region database replication", "Infrastructure as Code (Terraform)"],
                        "sample": "By using Terraform to deploy load balancers with Route53 latency routing, multi-region database read-replicas, and auto-scaling groups."
                    }
                ],
                "Cyber Security": [
                    {
                        "question": "Explain Zero Trust Architecture principles and how you protect APIs from OWASP Top 10 vulnerabilities.",
                        "category": "Application Security",
                        "points": ["Never trust, always verify principle", "Authentication & Granular RBAC", "Input sanitization & rate limiting"],
                        "sample": "Zero Trust assumes network compromise. We enforce strict mTLS, JWT token validation, strict schema validation, and SQL/XSS parameterization."
                    }
                ]
            },
            "HR Interview": {
                "general": [
                    {
                        "question": f"Tell us about your professional background and why you are interested in this {job_role} role at SmartHire.",
                        "category": "Introduction & Fit",
                        "points": ["Career growth trajectory", "Alignment with company mission", "Relevant domain skill alignment"],
                        "sample": "I have spent several years expanding my expertise in technology and problem solving. This role aligns with my passion for building impactful solutions."
                    },
                    {
                        "question": "What are your key professional strengths, and what is one area you are actively working to improve?",
                        "category": "Self-Awareness",
                        "points": ["Concrete professional strengths", "Self-reflection & constructive improvement action", "Growth mindset"],
                        "sample": "My strength is breaking down complex specifications into clear milestones. I am actively improving my delegation and cross-team communication."
                    },
                    {
                        "question": "Where do you see your career progressing over the next 3 to 5 years?",
                        "category": "Career Vision",
                        "points": ["Long-term professional ambition", "Skill development goals", "Leadership / technical domain mastery"],
                        "sample": "Over the next 3 to 5 years, I aim to master advanced architectural patterns in this domain while mentoring junior team members."
                    },
                    {
                        "question": "How do you maintain work-life balance and handle tight project deadlines under pressure?",
                        "category": "Stress Management",
                        "points": ["Prioritization & time management", "Proactive stakeholder communication", "Personal wellbeing practices"],
                        "sample": "I prioritize tasks using urgent-important matrices, communicate blockers early with project managers, and maintain clear boundaries."
                    }
                ]
            },
            "Behavioral Interview": {
                "general": [
                    {
                        "question": "Describe a situation where you had a major disagreement with a technical lead or manager. How did you resolve it?",
                        "category": "Conflict Resolution",
                        "points": ["STAR Method (Situation, Task, Action, Result)", "Focus on objective data and user value", "Professionalism and alignment"],
                        "sample": "I scheduled a 1-on-1, presented benchmark data comparing both technical approaches, listened to their architectural constraints, and reached a data-driven consensus."
                    },
                    {
                        "question": "Give an example of a project that failed or missed a critical deadline. What went wrong and what did you learn?",
                        "category": "Accountability & Learning",
                        "points": ["Ownership without shifting blame", "Root cause analysis", "Process changes implemented after"],
                        "sample": "We under-estimated third-party API integration scope. I took ownership, updated stakeholders, and introduced spike tasks for all future external dependencies."
                    },
                    {
                        "question": "Tell us about a time you had to learn a completely new domain or framework on a very short deadline.",
                        "category": "Adaptability",
                        "points": ["Fast learning strategy", "Hands-on prototyping", "Delivering MVP within deadline"],
                        "sample": "I dedicated non-work hours to documentation, built a small proof-of-concept prototype, and leveraged peer code reviews to ramp up in 5 days."
                    }
                ]
            },
            "Aptitude Interview": {
                "general": [
                    {
                        "question": "A system processes 120 requests per second. If capacity is upgraded by 45%, how many total requests will it handle in 10 minutes?",
                        "category": "Quantitative Reasoning",
                        "points": ["Calculate upgraded rate: 120 * 1.45 = 174 req/sec", "Calculate per minute: 174 * 60 = 10,440", "Calculate 10 minutes: 104,400 requests"],
                        "sample": "Upgraded rate = 174 requests/sec. For 10 minutes (600 seconds): 174 * 600 = 104,400 requests."
                    },
                    {
                        "question": "If all software engineers use git, and some git users write Python, does it logically follow that all Python programmers are software engineers?",
                        "category": "Logical Deduction",
                        "points": ["Identify premise structures", "Recognize fallacious reverse deduction", "State clear logical conclusion"],
                        "sample": "No. The premise states all software engineers use git, not that everyone using git or Python is a software engineer. This would be a converse error."
                    },
                    {
                        "question": "A server room has 5 backup batteries. If the probability of any single battery failing in a year is 10%, what is the probability that all 5 operate without failure?",
                        "category": "Probability & Analysis",
                        "points": ["Independent event probability: P(Success) = 0.90", "Compound probability = (0.90)^5", "Result = 0.59049 (approx 59%)"],
                        "sample": "Assuming independent events: 0.90^5 = 0.59049 or approximately 59.05% probability all 5 operate without failure."
                    }
                ]
            }
        }

        # Select matching category list or general fallback
        type_bank = questions_bank.get(interview_type)
        if not type_bank:
            for k, v in questions_bank.items():
                if k.lower() in interview_type.lower() or interview_type.lower() in k.lower():
                    type_bank = v
                    break
        if not type_bank:
            type_bank = questions_bank["Technical Interview"]

        if isinstance(type_bank, dict):
            if domain in type_bank:
                domain_questions = type_bank[domain]
            elif "general" in type_bank:
                domain_questions = type_bank["general"]
            else:
                first_key = list(type_bank.keys())[0]
                domain_questions = type_bank[first_key]
        else:
            domain_questions = type_bank


        pool = list(domain_questions)
        import time
        seed_val = generation_seed or f"{time.time()}_{random.randint(10000, 99999)}"
        rng = random.Random(seed_val)
        rng.shuffle(pool)
        start_offset = rng.randint(0, max(0, len(pool) - 1))


        # Select items up to num_questions
        selected = []
        for idx in range(num_questions):
            template = pool[(idx + start_offset) % len(pool)]

            selected.append({
                "question_number": idx + 1,
                "question_text": template["question"],
                "interview_type": interview_type,
                "domain": domain,
                "difficulty": difficulty,
                "category": template.get("category", domain),
                "expected_answer_points": template.get("points", ["Domain depth", "Structured explanation", "Concrete examples"]),
                "sample_answer": template.get("sample", "A complete answer covers core principles, practical application, and performance considerations.")
            })
        return selected
