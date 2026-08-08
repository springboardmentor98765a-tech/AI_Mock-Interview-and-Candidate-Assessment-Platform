import datetime
import random
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status
from models.interview import QuestionBank
from schemas.interview import QuestionBankCreate, QuestionBankUpdate

logger = logging.getLogger("question_bank_service")

class QuestionBankService:
    """Manages PostgreSQL Question Bank operations, search, Admin CRUD, and least-recently-used fallback question rotation."""

    @staticmethod
    def get_questions(
        db: Session,
        search: Optional[str] = None,
        domain: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        keywords: Optional[str] = None
    ) -> List[QuestionBank]:
        """Queries Question Bank with optional search filters."""
        query = db.query(QuestionBank)

        if domain and domain.strip() and domain.upper() != "ALL":
            query = query.filter(QuestionBank.domain.ilike(f"%{domain.strip()}%"))

        if category and category.strip() and category.upper() != "ALL":
            query = query.filter(QuestionBank.category.ilike(f"%{category.strip()}%"))

        if difficulty and difficulty.strip() and difficulty.upper() != "ALL":
            query = query.filter(QuestionBank.difficulty.ilike(f"%{difficulty.strip()}%"))

        search_term = search or keywords
        if search_term and search_term.strip():
            term = f"%{search_term.strip()}%"
            query = query.filter(
                or_(
                    QuestionBank.question.ilike(term),
                    QuestionBank.domain.ilike(term),
                    QuestionBank.category.ilike(term),
                    QuestionBank.expected_answer.ilike(term)
                )
            )

        return query.order_by(QuestionBank.domain.asc(), QuestionBank.difficulty.asc(), QuestionBank.id.asc()).all()

    @staticmethod
    def create_question(db: Session, data: QuestionBankCreate) -> QuestionBank:
        """Creates a new Question Bank entry (Admin Only). Prevents duplicate questions."""
        existing = db.query(QuestionBank).filter(QuestionBank.question == data.question.strip()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A question with identical text already exists in the Question Bank."
            )

        q_entry = QuestionBank(
            domain=data.domain.strip(),
            category=data.category.strip(),
            difficulty=data.difficulty.strip(),
            question=data.question.strip(),
            expected_answer=data.expected_answer,
            evaluation_points=data.evaluation_points or ["Technical accuracy", "Clarity of response"],
            usage_count=0,
            created_at=datetime.datetime.utcnow()
        )
        db.add(q_entry)
        db.commit()
        db.refresh(q_entry)
        return q_entry

    @staticmethod
    def update_question(db: Session, question_id: int, data: QuestionBankUpdate) -> QuestionBank:
        """Updates an existing Question Bank entry (Admin Only)."""
        q_entry = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if not q_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question Bank entry with ID {question_id} not found."
            )

        if data.question and data.question.strip() != q_entry.question:
            duplicate = db.query(QuestionBank).filter(QuestionBank.question == data.question.strip()).first()
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Another question with identical text already exists."
                )

        update_data = data.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None and hasattr(q_entry, key):
                setattr(q_entry, key, val)

        db.commit()
        db.refresh(q_entry)
        return q_entry

    @staticmethod
    def delete_question(db: Session, question_id: int) -> dict:
        """Deletes a Question Bank entry (Admin Only)."""
        q_entry = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if not q_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question Bank entry with ID {question_id} not found."
            )

        db.delete(q_entry)
        db.commit()
        return {"success": True, "message": f"Question #{question_id} deleted successfully."}

    @staticmethod
    def get_fallback_questions(
        db: Session,
        domain: str,
        category: str,
        difficulty: str,
        num_questions: int
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching fallback questions from Question Bank, prioritizing least-recently used
        questions (usage_count ASC, func.random()) to minimize repetition across multiple generations.
        """
        query = db.query(QuestionBank).filter(QuestionBank.domain.ilike(f"%{domain.strip()}%"))
        
        # Filter by difficulty if available, else match domain
        diff_matches = query.filter(QuestionBank.difficulty.ilike(f"%{difficulty.strip()}%")).all()
        if len(diff_matches) < num_questions:
            # Fall back to matching domain overall
            pool = query.order_by(QuestionBank.usage_count.asc(), func.random()).all()
        else:
            pool = query.filter(QuestionBank.difficulty.ilike(f"%{difficulty.strip()}%")).order_by(QuestionBank.usage_count.asc(), func.random()).all()

        # If domain pool is too small, fetch general questions
        if len(pool) < num_questions:
            general_pool = db.query(QuestionBank).order_by(QuestionBank.usage_count.asc(), func.random()).limit(num_questions * 2).all()
            pool = list({q.id: q for q in (pool + general_pool)}.values())

        selected = pool[:num_questions]
        now = datetime.datetime.utcnow()

        results = []
        for q in selected:
            q.usage_count = (q.usage_count or 0) + 1
            q.last_used_at = now
            results.append({
                "question": q.question,
                "category": q.category or category,
                "difficulty": q.difficulty or difficulty,
                "expected_answer": q.expected_answer or "Structured professional response expected.",
                "evaluation_points": q.evaluation_points or ["Communication", "Domain Knowledge", "Problem Solving"]
            })

        db.commit()

        # Ensure we return exactly num_questions even if DB pool is smaller
        if len(results) < num_questions:
            missing_count = num_questions - len(results)
            cat_clean = category.strip() if category else "Technical"
            dom_clean = domain.strip() if domain else "Software Engineering"
            
            category_templates = {
                "Sales": [
                    f"How do you handle prospective clients in {dom_clean} objecting to product pricing during pitch meetings?",
                    f"Describe your strategy for identifying high-intent leads and managing a multi-stage sales pipeline in {dom_clean}.",
                    f"Explain how you build trust and long-term relationships with enterprise decision-makers in {dom_clean}.",
                    "Tell me about a time you missed a quarterly sales quota and what operational adjustments you made.",
                    "How do you qualify leads using frameworks like BANT (Budget, Authority, Need, Timeline)?"
                ],
                "Marketing": [
                    f"How do you measure ROI and Customer Acquisition Cost (CAC) for digital marketing campaigns in {dom_clean}?",
                    f"Describe a successful multi-channel product launch campaign you planned and executed for {dom_clean}.",
                    "What strategies do you use for SEO, content marketing, and conversion rate optimization?",
                    f"How do you conduct market segment analysis and competitive benchmarking in the {dom_clean} sector?",
                    "How do you leverage customer feedback and marketing analytics to refine brand messaging?"
                ],
                "Finance": [
                    "Explain the key differences between DCF valuation and EBITDA multiple valuation methods.",
                    f"How do you build financial forecasting models and manage corporate cash flow budgets in {dom_clean}?",
                    "Describe how you analyze financial statements to assess company liquidity and financial risk.",
                    "What metrics do you prioritize when evaluating investment decisions and capital allocation?",
                    "How do you handle variance analysis between budgeted and actual operational expenditure?"
                ],
                "Customer Support": [
                    f"How do you handle an irate customer in {dom_clean} demanding an immediate resolution or refund?",
                    "What customer service KPIs (CSAT, NPS, FRT) do you prioritize to track team performance?",
                    f"Describe a situation where you went above and beyond to resolve a complex support ticket in {dom_clean}.",
                    "How do you handle de-escalation when product limitations prevent a direct solution?",
                    "How do you document recurring customer issues to assist engineering and product development teams?"
                ],
                "Business Analyst": [
                    f"How do you bridge communication gaps between technical engineers and business stakeholders in {dom_clean}?",
                    "Describe your process for gathering requirements and translating them into user stories.",
                    f"How do you approach root cause analysis when evaluating process inefficiencies in {dom_clean}?",
                    "Explain how you validate and test acceptance criteria for a new system feature release.",
                    "What tools and modeling techniques (UML, BPMN, SQL) do you use for workflow design?"
                ],
                "Product Management": [
                    f"How do you prioritize product backlog features when engineering resources are constrained in {dom_clean}?",
                    "Describe your strategy for defining product roadmap metrics and OKRs.",
                    "How do you handle feature requests from key stakeholders that conflict with product vision?",
                    f"Explain how you conduct product discovery, user interviews, and A/B test experiments in {dom_clean}.",
                    "Describe a time a product launch missed target metrics and what post-mortem lessons you learned."
                ],
                "Data Analyst": [
                    "How do you handle missing or corrupted data values when preparing datasets for analysis?",
                    "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN in SQL with examples.",
                    f"How do you present complex statistical findings in {dom_clean} to non-technical business leaders?",
                    "What visualization best practices do you follow when building executive dashboards?",
                    "How do you validate hypotheses using statistical significance tests and cohort analysis?"
                ],
                "Data Science": [
                    "Explain the trade-offs between bias and variance in predictive machine learning models.",
                    "How do you prevent overfitting in deep learning models (regularization, dropout, cross-validation)?",
                    f"Describe your end-to-end process for feature engineering and model deployment in {dom_clean}.",
                    "Compare supervised vs unsupervised learning algorithms and state appropriate use cases for each.",
                    "How do you handle imbalanced datasets when training classification models?"
                ],
                "Aptitude": [
                    f"Explain how you systematically break down a complex quantitative problem in {dom_clean}.",
                    "If a project pipeline throughput drops by 20%, what logical diagnostic steps do you execute?",
                    "Describe a scenario where you applied spatial or inductive reasoning to solve an operational bottleneck.",
                    "How do you calculate probability and risk trade-offs when making high-stakes decisions under uncertainty?",
                    "Explain how you optimize resource allocation given strict time and budget constraints."
                ],
                "HR": [
                    f"Tell me about your background and key professional achievements in {dom_clean}.",
                    "Why are you interested in joining our company and how does this role align with your career goals?",
                    "Describe how you handle tight deadlines, competing priorities, and high-pressure situations.",
                    "Where do you see your career trajectory evolving over the next 3 to 5 years?",
                    "Describe a time you navigated organizational change or team restructuring effectively."
                ],
                "Behavioral": [
                    "Give an example of a technical or interpersonal conflict with a colleague and how you resolved it.",
                    f"Tell me about a major project failure in {dom_clean} and what key lessons you learned.",
                    "Describe a situation where you took initiative beyond your formal job responsibilities.",
                    "How do you adapt when project requirements change dramatically right before a deadline?",
                    "Give an example of how you mentored a junior team member or shared knowledge with peers."
                ],
                "Technical": [
                    f"Explain the key architectural patterns and best practices for building scalable systems in {dom_clean}.",
                    "What is the difference between synchronous and asynchronous execution, and when would you use each?",
                    "Explain how database indexing works and how you optimize slow-performing SQL queries.",
                    "How do you ensure security, authentication, and data protection in production applications?",
                    f"Describe a challenging technical bug you diagnosed in {dom_clean} and how you fixed it."
                ]
            }

            templates = category_templates.get(cat_clean)
            if not templates:
                templates = [
                    f"Explain the core principles and domain standards governing {cat_clean} in {dom_clean}.",
                    f"What are the major operational challenges facing {cat_clean} projects in {dom_clean} today?",
                    f"How do you evaluate risk, compliance, and quality control standards in {cat_clean}?",
                    f"Describe a complex project you delivered in {cat_clean} ({dom_clean}) and key metrics achieved.",
                    f"What emerging methodologies or tools are driving innovation in {cat_clean} for {dom_clean}?"
                ]

            for i in range(missing_count):
                q_text = templates[i % len(templates)]
                results.append({
                    "question": f"[{cat_clean} - {difficulty}] {q_text}",
                    "category": cat_clean,
                    "difficulty": difficulty,
                    "expected_answer": f"Comprehensive professional response covering best practices, methodologies, and practical scenarios for {cat_clean} in {dom_clean}.",
                    "evaluation_points": ["Domain Expertise", "Problem Solving", "Communication Clarity", "Structured Execution"]
                })

        return results
