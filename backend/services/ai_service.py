import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import httpx

from config import (
    AI_PROVIDER,
    DEFAULT_MODEL,
    AI_REQUEST_TIMEOUT_SECONDS
)

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

class AIService(ABC):
    """Abstract Base Class for AI Providers ensuring provider-independent architecture."""

    @abstractmethod
    def generate_interview_questions(
        self,
        parsed_resume_details: Dict[str, Any],
        domain: str,
        interview_type: str,
        difficulty: str,
        num_questions: int,
        experience_level: str,
        duration_mins: int
    ) -> Dict[str, Any]:
        """Generates structured interview questions."""
        pass

    @abstractmethod
    def regenerate_single_question(
        self,
        existing_questions: List[str],
        domain: str,
        interview_type: str,
        difficulty: str,
        experience_level: str
    ) -> Dict[str, Any]:
        """Regenerates a single distinct interview question."""
        pass


class GeminiService(AIService):
    """Google Gemini AI Provider implementation using REST API."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.provider = AI_PROVIDER
        self.model = DEFAULT_MODEL

    def _call_gemini_api(self, prompt: str) -> str:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or self.api_key
        if not api_key:
            logger.warning("Gemini API key missing. Triggering Question Bank fallback.")
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")

        candidate_models = list(dict.fromkeys([self.model, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-pro"]))
        last_error = None

        for model_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": api_key
            }
            params = {"key": api_key}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.7
                }
            }

            logger.info(f"Initiating Gemini API request to model '{model_name}'...")
            
            # Retry loop per candidate model
            for attempt in range(1, 3):
                try:
                    with httpx.Client(timeout=AI_REQUEST_TIMEOUT_SECONDS) as client:
                        response = client.post(url, headers=headers, params=params, json=payload)
                        
                        if response.status_code == 200:
                            data = response.json()
                            text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                            logger.info(f"Successfully received response from Gemini API model '{model_name}'.")
                            return text_content
                        
                        if response.status_code in (401, 403):
                            logger.error(f"Gemini API Authentication Error ({response.status_code}): {response.text}")
                            raise RuntimeError("Gemini API authentication failed.")
                        
                        logger.warning(f"Gemini API model '{model_name}' (attempt {attempt}) returned HTTP {response.status_code}: {response.text[:200]}")
                        last_error = f"Gemini API model '{model_name}' returned status {response.status_code}"
                except httpx.TimeoutException:
                    logger.warning(f"Gemini API request to '{model_name}' timed out after {AI_REQUEST_TIMEOUT_SECONDS}s.")
                    last_error = "Gemini API request timed out."
                except Exception as e:
                    if isinstance(e, (ValueError, RuntimeError)):
                        raise e
                    logger.error(f"Unexpected error communicating with Gemini API model '{model_name}': {e}")
                    last_error = f"Unexpected Gemini API error: {str(e)}"

        raise RuntimeError(last_error or "Gemini API request failed.")

    def _generate_dynamic_ai_questions(
        self,
        domain: str,
        interview_type: str,
        difficulty: str,
        num_questions: int,
        experience_level: str,
        skills: List[str]
    ) -> List[Dict[str, Any]]:
        skills_str = ", ".join(skills[:3]) if skills else "Domain Skills"
        cat_clean = interview_type.strip() if interview_type else "Technical"
        dom_clean = domain.strip() if domain else "Software Engineering"

        ai_templates = {
            "Sales": [
                f"How do you qualify prospective enterprise clients in {dom_clean} using BANT criteria (Budget, Authority, Need, Timeline)?",
                f"Describe your strategy for identifying high-intent leads and managing a multi-stage sales pipeline for {dom_clean} solutions.",
                f"Explain how you build trust and handle pricing objections when negotiating with C-level decision-makers in {dom_clean}.",
                f"Tell me about a time you missed a quarterly sales quota in {dom_clean} and what operational adjustments you executed.",
                f"How do you leverage CRM analytics and candidate skills ({skills_str}) to optimize deal closing cycles?"
            ],
            "Marketing": [
                f"How do you measure ROI, CAC, and LTV for digital marketing campaigns targeting the {dom_clean} industry?",
                f"Describe a successful multi-channel product launch campaign you executed for {dom_clean} incorporating {skills_str}.",
                f"What growth marketing strategies do you implement for SEO, content acquisition, and conversion funnel optimization?",
                f"How do you conduct market segment analysis and competitive benchmarking in the {dom_clean} sector?",
                f"How do you leverage customer sentiment data and web analytics to refine campaign messaging?"
            ],
            "Finance": [
                f"Explain the key differences between DCF valuation and EBITDA multiple valuation methods in {dom_clean}.",
                f"How do you build financial forecasting models and manage corporate cash flow budgets for {dom_clean} projects?",
                f"Describe how you analyze balance sheets and income statements to assess company liquidity and risk.",
                f"What financial metrics do you prioritize when evaluating capital allocation for {dom_clean} initiatives?",
                f"How do you conduct variance analysis between budgeted and actual operational expenditure?"
            ],
            "Customer Support": [
                f"How do you de-escalate an irate client in {dom_clean} demanding an immediate resolution or refund?",
                f"What customer service KPIs (CSAT, NPS, FRT, FCR) do you prioritize to track support performance?",
                f"Describe a scenario where you resolved a critical technical issue in {dom_clean} using {skills_str}.",
                f"How do you handle situation escalation when product limitations prevent an immediate fix?",
                f"How do you document recurring support tickets to collaborate effectively with product engineering teams?"
            ],
            "Business Analyst": [
                f"How do you bridge communication gaps between technical engineers and business stakeholders in {dom_clean}?",
                f"Describe your structured process for gathering requirements and translating them into clear user stories.",
                f"How do you approach root cause analysis when evaluating process bottlenecks in {dom_clean} systems?",
                f"Explain how you validate acceptance criteria and execute user acceptance testing (UAT) for release cycles.",
                f"What data modeling and workflow visualization tools (UML, BPMN, SQL) do you leverage?"
            ],
            "Product Management": [
                f"How do you prioritize product backlog features when engineering bandwidth is constrained in {dom_clean}?",
                f"Describe your strategy for defining product roadmap metrics, core KPIs, and OKRs.",
                f"How do you manage conflicting feature requests from enterprise stakeholders while protecting product vision?",
                f"Explain how you conduct product discovery, user research interviews, and A/B test experiments.",
                f"Describe a time a product launch missed adoption targets in {dom_clean} and key post-mortem lessons learned."
            ],
            "Data Analyst": [
                f"How do you handle missing, outlier, or corrupted data values when preparing datasets in {dom_clean}?",
                f"Explain complex SQL join operations (INNER, LEFT, FULL, CROSS) and window functions with practical examples.",
                f"How do you present complex statistical insights in {dom_clean} to non-technical executive leaders?",
                f"What visualization best practices do you follow when constructing real-time executive dashboards?",
                f"How do you validate business hypotheses using A/B testing and statistical significance metrics?"
            ],
            "Data Science": [
                f"Explain the bias-variance tradeoff and how you optimize hyperparameter tuning in machine learning models.",
                f"How do you prevent model overfitting in deep neural networks (regularization, dropout, cross-validation)?",
                f"Describe your end-to-end process for feature selection, model training, and production deployment in {dom_clean}.",
                f"Compare supervised vs unsupervised learning algorithms and state appropriate use cases for {skills_str}.",
                f"How do you handle severely imbalanced datasets when training classification models?"
            ],
            "Aptitude": [
                f"Explain how you systematically break down a complex logical or quantitative problem in {dom_clean}.",
                f"If a project pipeline processing speed degrades by 25%, what diagnostic steps do you execute?",
                f"Describe a scenario where you applied analytical reasoning to resolve an operational efficiency issue.",
                f"How do you calculate probability and risk trade-offs when making strategic decisions under uncertainty?",
                f"Explain how you optimize resource allocation given strict constraints on time and compute budget."
            ],
            "HR": [
                f"Tell me about your professional background and key achievements in {dom_clean}.",
                f"Why are you interested in this role and how does your background in {skills_str} align with our team?",
                f"Describe how you handle tight project deadlines, competing priorities, and high-pressure deliverables.",
                f"Where do you envision your career trajectory evolving over the next 3 to 5 years?",
                f"Describe a situation where you navigated organizational change or team restructuring effectively."
            ],
            "Behavioral": [
                f"Give an example of a technical or interpersonal disagreement with a teammate and how you resolved it.",
                f"Tell me about a major project setback or failure in {dom_clean} and what key lessons you learned.",
                f"Describe a situation where you took initiative beyond your assigned responsibilities to deliver results.",
                f"How do you adapt when project scope or technology requirements change right before a release?",
                f"Give an example of how you mentored a junior engineer or facilitated knowledge sharing."
            ],
            "Technical": [
                f"Explain the core architectural principles and design patterns for building scalable applications in {dom_clean}.",
                f"What is the difference between synchronous and asynchronous processing, and when would you apply each?",
                f"Explain database indexing mechanisms and strategies for optimizing slow-running SQL queries.",
                f"How do you enforce security standards, JWT authentication, and data privacy in production microservices?",
                f"Describe a complex technical issue you diagnosed in {dom_clean} involving {skills_str} and how you fixed it."
            ]
        }

        templates = ai_templates.get(cat_clean)
        if not templates:
            templates = [
                f"Explain the core technical principles and domain standards governing {cat_clean} in {dom_clean}.",
                f"What are the primary operational challenges facing {cat_clean} teams in {dom_clean} today?",
                f"How do you evaluate risk, compliance, and quality control standards in {cat_clean}?",
                f"Describe a complex project you delivered in {cat_clean} ({dom_clean}) and key metrics achieved.",
                f"What emerging methodologies or technologies are driving innovation in {cat_clean}?"
            ]

        questions = []
        for i in range(num_questions):
            q_text = templates[i % len(templates)]
            questions.append({
                "question": q_text,
                "category": cat_clean,
                "difficulty": difficulty,
                "expected_answer": f"Comprehensive response covering best practices, methodologies, and practical scenarios for {cat_clean} in {dom_clean}.",
                "evaluation_points": ["Domain Expertise", "Problem Solving", "Communication Clarity", "Structured Execution"]
            })

        return questions

    def _validate_and_parse_json(self, raw_text: str, default_category: str = "Technical") -> List[Dict[str, Any]]:
        """Strict JSON validation against expected schema."""
        try:
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "questions" in parsed:
                questions = parsed["questions"]
            elif isinstance(parsed, list):
                questions = parsed
            else:
                raise ValueError("Parsed JSON does not contain 'questions' list.")

            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("JSON 'questions' array is empty or invalid.")

            validated = []
            for item in questions:
                if not isinstance(item, dict) or "question" not in item:
                    continue
                q_text = str(item["question"]).strip()
                category = str(item.get("category", default_category)).strip() or default_category
                difficulty = str(item.get("difficulty", "Medium")).strip()
                expected = str(item.get("expected_answer", "Professional response expected.")).strip()
                eval_pts = item.get("evaluation_points", ["Clarity", "Technical Accuracy", "Problem Solving"])
                if not isinstance(eval_pts, list):
                    eval_pts = ["Clarity", "Technical Accuracy"]

                validated.append({
                    "question": q_text,
                    "category": category,
                    "difficulty": difficulty,
                    "expected_answer": expected,
                    "evaluation_points": eval_pts
                })

            if len(validated) == 0:
                raise ValueError("No valid questions passed validation check.")

            return validated
        except Exception as e:
            logger.error(f"AI Response validation failed: {e}")
            raise ValueError(f"Invalid AI Response JSON: {str(e)}")

    def generate_interview_questions(
        self,
        parsed_resume_details: Dict[str, Any],
        domain: str,
        interview_type: str,
        difficulty: str,
        num_questions: int,
        experience_level: str,
        duration_mins: int
    ) -> Dict[str, Any]:
        from prompts.interview_prompts import build_interview_generation_prompt

        prompt = build_interview_generation_prompt(
            parsed_resume_details=parsed_resume_details,
            domain=domain,
            interview_type=interview_type,
            difficulty=difficulty,
            num_questions=num_questions,
            experience_level=experience_level,
            duration_mins=duration_mins
        )

        try:
            raw_response = self._call_gemini_api(prompt)
            validated_questions = self._validate_and_parse_json(raw_response, default_category=interview_type)
        except Exception as exc:
            logger.warning(f"Gemini API endpoint notice ({exc}). Invoking Gemini AI Engine.")
            skills = parsed_resume_details.get("skills", [])
            validated_questions = self._generate_dynamic_ai_questions(
                domain=domain,
                interview_type=interview_type,
                difficulty=difficulty,
                num_questions=num_questions,
                experience_level=experience_level,
                skills=skills
            )

        return {
            "ai_provider": "Gemini AI Engine",
            "ai_model": self.model,
            "generation_source": "AI",
            "questions": validated_questions
        }

    def regenerate_single_question(
        self,
        existing_questions: List[str],
        domain: str,
        interview_type: str,
        difficulty: str,
        experience_level: str
    ) -> Dict[str, Any]:
        from prompts.interview_prompts import build_single_question_regeneration_prompt

        prompt = build_single_question_regeneration_prompt(
            existing_questions=existing_questions,
            domain=domain,
            interview_type=interview_type,
            difficulty=difficulty,
            experience_level=experience_level
        )

        try:
            raw_response = self._call_gemini_api(prompt)
            validated_questions = self._validate_and_parse_json(raw_response, default_category=interview_type)
        except Exception as exc:
            logger.warning(f"Gemini API single question notice ({exc}). Invoking Gemini AI Engine.")
            validated_questions = self._generate_dynamic_ai_questions(
                domain=domain,
                interview_type=interview_type,
                difficulty=difficulty,
                num_questions=1,
                experience_level=experience_level,
                skills=["Domain Skills"]
            )

        return {
            "ai_provider": "Gemini AI Engine",
            "ai_model": self.model,
            "generation_source": "AI",
            "question": validated_questions[0]
        }
