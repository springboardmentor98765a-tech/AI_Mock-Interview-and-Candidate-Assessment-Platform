"""
Comprehensive AI Scoring Engine
Evaluates candidate performance across multiple dimensions:
- Communication Score (30%)
- Confidence Score (25%)
- Technical Relevance Score (30%)
- Professionalism Score (15%)
"""

import re
import math
from collections import Counter
from typing import Dict, List, Tuple

class ScoringEngine:
    """Main scoring engine for comprehensive interview evaluation"""
    
    # Configuration weights
    WEIGHTS = {
        'communication': 0.30,
        'confidence': 0.25,
        'technical': 0.30,
        'professionalism': 0.15
    }
    
    # Performance thresholds
    THRESHOLDS = {
        'excellent': 90,
        'good': 75,
        'average': 60,
        'needs_improvement': 40,
        'poor': 0
    }
    
    def __init__(self):
        self.scores = {}
    
    # =============================================
    # 1. COMMUNICATION SCORE (30%)
    # =============================================
    def calculate_communication_score(self, answer: str, response_audio_data: Dict = None) -> Dict:
        """
        Calculates communication score based on:
        - Speech clarity
        - Grammar quality
        - Filler-word frequency
        - Speaking pace
        - Response completeness
        """
        score = 0
        details = {}
        
        # Speech clarity (20 points) - based on sentence structure and vocabulary
        clarity_score = self._evaluate_clarity(answer)
        details['clarity'] = clarity_score
        score += clarity_score * 0.20
        
        # Grammar quality (20 points)
        grammar_score = self._evaluate_grammar(answer)
        details['grammar'] = grammar_score
        score += grammar_score * 0.20
        
        # Filler words frequency (20 points) - fewer is better
        filler_score = self._evaluate_filler_words(answer)
        details['filler_words'] = filler_score
        score += filler_score * 0.20
        
        # Speaking pace (20 points) - estimated from word count
        pace_score = self._evaluate_pace(answer)
        details['speaking_pace'] = pace_score
        score += pace_score * 0.20
        
        # Response completeness (20 points)
        completeness_score = self._evaluate_completeness(answer)
        details['completeness'] = completeness_score
        score += completeness_score * 0.20
        
        return {
            'score': min(100, max(0, score)),
            'details': details,
            'breakdown': {
                'clarity': clarity_score,
                'grammar': grammar_score,
                'filler_words': filler_score,
                'speaking_pace': pace_score,
                'completeness': completeness_score
            }
        }
    
    def _evaluate_clarity(self, answer: str) -> float:
        """Evaluate speech clarity based on sentence structure"""
        if not answer or len(answer.strip()) == 0:
            return 0
        
        # Count sentences and average length
        sentences = re.split(r'[.!?]+', answer.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 20
        
        avg_sentence_length = len(answer.split()) / len(sentences)
        
        # Ideal: 12-18 words per sentence
        if 12 <= avg_sentence_length <= 18:
            return 90
        elif 10 <= avg_sentence_length <= 20:
            return 75
        elif 8 <= avg_sentence_length <= 22:
            return 60
        else:
            return 40
    
    def _evaluate_grammar(self, answer: str) -> float:
        """Evaluate grammar quality"""
        if not answer or len(answer.strip()) == 0:
            return 0
        
        words = answer.split()
        total_words = len(words)
        
        # Look for common grammar issues
        grammar_issues = 0
        
        # Check for sentence fragments (very short sentences)
        sentences = re.split(r'[.!?]+', answer.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        fragment_count = sum(1 for s in sentences if len(s.split()) < 3)
        grammar_issues += fragment_count * 2
        
        # Check for double spaces (typos)
        if '  ' in answer:
            grammar_issues += 3
        
        # Check for missing capitalization
        if answer[0].islower():
            grammar_issues += 1
        
        # Error rate
        if total_words == 0:
            return 50
        
        error_rate = grammar_issues / total_words
        
        if error_rate < 0.05:
            return 90
        elif error_rate < 0.10:
            return 75
        elif error_rate < 0.15:
            return 60
        else:
            return 40
    
    def _evaluate_filler_words(self, answer: str) -> float:
        """Evaluate filler word usage - fewer is better"""
        if not answer:
            return 50
        
        filler_words = [
            'um', 'uh', 'err', 'like', 'you know', 'basically', 
            'actually', 'kind of', 'sort of', 'literally', 'honestly',
            'well', 'so', 'anyway', 'i mean', 'in other words'
        ]
        
        answer_lower = answer.lower()
        words = answer_lower.split()
        total_words = len(words)
        
        filler_count = 0
        for filler in filler_words:
            if ' ' + filler + ' ' in ' ' + answer_lower + ' ':
                filler_count += answer_lower.count(filler)
        
        if total_words == 0:
            return 50
        
        filler_ratio = filler_count / total_words
        
        if filler_ratio < 0.02:
            return 95
        elif filler_ratio < 0.05:
            return 80
        elif filler_ratio < 0.10:
            return 60
        else:
            return 30
    
    def _evaluate_pace(self, answer: str) -> float:
        """Evaluate speaking pace based on word count"""
        if not answer:
            return 50
        
        words = answer.split()
        word_count = len(words)
        
        # Average speaking pace: 120-150 words per minute
        # For a 60-second response, expect 120-150 words
        if 100 <= word_count <= 200:
            return 90
        elif 80 <= word_count <= 250:
            return 75
        elif 50 <= word_count <= 300:
            return 60
        else:
            return 40
    
    def _evaluate_completeness(self, answer: str) -> float:
        """Evaluate response completeness"""
        if not answer or len(answer.strip()) == 0:
            return 0
        
        words = answer.split()
        word_count = len(words)
        
        # Minimum 30 words for a complete response
        if word_count < 20:
            return 20
        elif word_count < 50:
            return 50
        elif word_count < 100:
            return 75
        else:
            return 95
    
    # =============================================
    # 2. CONFIDENCE SCORE (25%)
    # =============================================
    def calculate_confidence_score(self, 
                                   answer: str, 
                                   behavioral_data: Dict = None) -> Dict:
        """
        Calculates confidence score based on:
        - Eye-contact consistency (from video)
        - Facial engagement (from video)
        - Response hesitation (from text analysis)
        - Speaking confidence (from text analysis)
        - Attention level (from video)
        """
        score = 0
        details = {}
        
        # Initialize from behavioral data if provided
        eye_contact = 0
        facial_engagement = 0
        attention_level = 0
        
        if behavioral_data:
            eye_contact = behavioral_data.get('eyeContactPercentage', 0) or 0
            facial_engagement = behavioral_data.get('engagement', 0) or 0
            attention_level = behavioral_data.get('attention', 0) or 0
        
        details['eye_contact'] = eye_contact
        details['facial_engagement'] = facial_engagement
        details['attention_level'] = attention_level
        
        # Eye contact consistency (25 points) - from video
        eye_contact_score = min(100, max(0, eye_contact))
        score += eye_contact_score * 0.25
        
        # Facial engagement (25 points) - from video
        engagement_score = min(100, max(0, facial_engagement))
        score += engagement_score * 0.25
        
        # Response hesitation (20 points) - from text analysis
        hesitation_score = self._evaluate_hesitation(answer)
        details['hesitation'] = hesitation_score
        score += hesitation_score * 0.20
        
        # Speaking confidence (20 points) - from text analysis
        speaking_confidence = self._evaluate_speaking_confidence(answer)
        details['speaking_confidence'] = speaking_confidence
        score += speaking_confidence * 0.20
        
        # Attention level (10 points) - from video
        attention_score = min(100, max(0, attention_level))
        score += attention_score * 0.10
        
        return {
            'score': min(100, max(0, score)),
            'details': details,
            'breakdown': {
                'eye_contact': eye_contact_score,
                'facial_engagement': engagement_score,
                'hesitation': hesitation_score,
                'speaking_confidence': speaking_confidence,
                'attention_level': attention_score
            }
        }
    
    def _evaluate_hesitation(self, answer: str) -> float:
        """Evaluate response hesitation - fewer hesitation markers is better"""
        if not answer:
            return 50
        
        hesitation_markers = [
            'i think', 'i believe', 'maybe', 'perhaps', 'i guess',
            'might be', 'could be', 'somewhat', 'relatively', 'pretty much',
            'sort of', 'kind of', 'probably', 'apparently'
        ]
        
        answer_lower = answer.lower()
        hesitation_count = 0
        
        for marker in hesitation_markers:
            hesitation_count += answer_lower.count(marker)
        
        words = answer.split()
        if len(words) == 0:
            return 50
        
        hesitation_ratio = hesitation_count / len(words)
        
        if hesitation_ratio < 0.03:
            return 95
        elif hesitation_ratio < 0.08:
            return 75
        elif hesitation_ratio < 0.15:
            return 55
        else:
            return 30
    
    def _evaluate_speaking_confidence(self, answer: str) -> float:
        """Evaluate speaking confidence from text"""
        if not answer:
            return 50
        
        # Confidence markers
        confidence_markers = [
            'i am', 'i have', 'i know', 'i can', 'i successfully',
            'we implemented', 'we achieved', 'i achieved', 'i completed',
            'i demonstrated', 'i led', 'i managed'
        ]
        
        answer_lower = answer.lower()
        confidence_count = sum(1 for marker in confidence_markers if marker in answer_lower)
        
        words = answer.split()
        if len(words) == 0:
            return 50
        
        confidence_ratio = confidence_count / len(words)
        
        if confidence_ratio > 0.08:
            return 95
        elif confidence_ratio > 0.05:
            return 80
        elif confidence_ratio > 0.02:
            return 65
        else:
            return 40
    
    # =============================================
    # 3. TECHNICAL RELEVANCE SCORE (30%)
    # =============================================
    def calculate_technical_relevance_score(self, 
                                           question: str, 
                                           answer: str,
                                           domain: str = 'general',
                                           expected_keywords: List[str] = None) -> Dict:
        """
        Calculates technical relevance score based on:
        - Technical accuracy
        - Keyword relevance
        - Problem-solving ability
        - Domain knowledge
        - Answer completeness
        """
        score = 0
        details = {}
        
        # Technical accuracy (25 points)
        accuracy_score = self._evaluate_technical_accuracy(answer, domain)
        details['technical_accuracy'] = accuracy_score
        score += accuracy_score * 0.25
        
        # Keyword relevance (25 points)
        keyword_score = self._evaluate_keyword_relevance(answer, question, expected_keywords)
        details['keyword_relevance'] = keyword_score
        score += keyword_score * 0.25
        
        # Problem-solving ability (25 points)
        problem_solving_score = self._evaluate_problem_solving(answer)
        details['problem_solving'] = problem_solving_score
        score += problem_solving_score * 0.25
        
        # Domain knowledge (15 points)
        domain_score = self._evaluate_domain_knowledge(answer, domain)
        details['domain_knowledge'] = domain_score
        score += domain_score * 0.15
        
        # Answer completeness (10 points)
        completeness_score = self._evaluate_technical_completeness(answer, question)
        details['completeness'] = completeness_score
        score += completeness_score * 0.10
        
        return {
            'score': min(100, max(0, score)),
            'details': details,
            'breakdown': {
                'technical_accuracy': accuracy_score,
                'keyword_relevance': keyword_score,
                'problem_solving': problem_solving_score,
                'domain_knowledge': domain_score,
                'completeness': completeness_score
            }
        }
    
    def _evaluate_technical_accuracy(self, answer: str, domain: str) -> float:
        """Evaluate technical accuracy based on domain"""
        if not answer:
            return 0
        
        answer_lower = answer.lower()
        
        # Domain-specific accuracy checks
        domain_rules = {
            'ai_ml': {
                'positive_terms': ['neural network', 'training', 'model', 'algorithm', 'accuracy', 'loss', 'optimization'],
                'negative_terms': ['incorrect', 'wrong', 'never works', 'impossible']
            },
            'sde': {
                'positive_terms': ['code', 'implementation', 'database', 'api', 'class', 'function', 'variable'],
                'negative_terms': ['syntax error', 'undefined', 'null pointer']
            },
            'general': {
                'positive_terms': ['implement', 'design', 'process', 'system', 'approach'],
                'negative_terms': []
            }
        }
        
        rules = domain_rules.get(domain, domain_rules['general'])
        
        positive_count = sum(1 for term in rules['positive_terms'] if term in answer_lower)
        negative_count = sum(1 for term in rules['negative_terms'] if term in answer_lower)
        
        # Calculate score
        if positive_count > negative_count:
            return 85 + (positive_count * 2)
        elif positive_count == negative_count:
            return 60
        else:
            return max(20, 50 - (negative_count * 5))
    
    def _evaluate_keyword_relevance(self, answer: str, question: str, 
                                   expected_keywords: List[str] = None) -> float:
        """Evaluate keyword relevance"""
        if not answer or not question:
            return 0
        
        answer_lower = answer.lower()
        question_lower = question.lower()
        
        # Extract keywords from question
        question_words = set(word for word in question_lower.split() 
                            if len(word) > 4 and word not in ['what', 'which', 'does', 'would', 'could'])
        
        # Use expected keywords if provided
        if expected_keywords:
            keywords = set(k.lower() for k in expected_keywords)
        else:
            keywords = question_words
        
        # Count keyword matches in answer
        matches = sum(1 for keyword in keywords if keyword in answer_lower)
        
        if not keywords:
            return 50
        
        match_ratio = matches / len(keywords)
        
        if match_ratio >= 0.8:
            return 95
        elif match_ratio >= 0.6:
            return 80
        elif match_ratio >= 0.4:
            return 65
        elif match_ratio >= 0.2:
            return 45
        else:
            return 25
    
    def _evaluate_problem_solving(self, answer: str) -> float:
        """Evaluate problem-solving ability"""
        if not answer:
            return 50
        
        answer_lower = answer.lower()
        
        # Problem-solving indicators
        indicators = [
            'approach', 'solution', 'algorithm', 'optimize', 'efficient',
            'analyze', 'break down', 'step', 'logical', 'systematic',
            'handle', 'edge case', 'error', 'improve', 'better', 'optimize'
        ]
        
        indicator_count = sum(1 for ind in indicators if ind in answer_lower)
        
        words = answer.split()
        if len(words) == 0:
            return 50
        
        # Check for logical structure
        has_steps = answer_lower.count('step') + answer_lower.count('first') + answer_lower.count('then') + answer_lower.count('finally')
        
        score = min(100, (indicator_count * 3) + (has_steps * 5))
        
        return max(30, score)
    
    def _evaluate_domain_knowledge(self, answer: str, domain: str) -> float:
        """Evaluate domain-specific knowledge"""
        if not answer:
            return 50
        
        answer_lower = answer.lower()
        
        # Domain-specific technical terms
        domain_terms = {
            'ai_ml': [
                'supervised', 'unsupervised', 'classification', 'regression',
                'neural', 'deep', 'cnn', 'rnn', 'lstm', 'transformer',
                'training', 'validation', 'testing', 'accuracy', 'precision',
                'recall', 'f1', 'loss', 'backpropagation', 'gradient'
            ],
            'sde': [
                'object oriented', 'design pattern', 'solid principles',
                'database', 'sql', 'nosql', 'api', 'rest', 'microservices',
                'docker', 'kubernetes', 'ci/cd', 'git', 'agile', 'scrum'
            ],
            'general': ['system', 'process', 'methodology', 'approach', 'implement']
        }
        
        terms = domain_terms.get(domain, domain_terms['general'])
        
        term_count = sum(1 for term in terms if term in answer_lower)
        
        if term_count >= 5:
            return 95
        elif term_count >= 3:
            return 80
        elif term_count >= 1:
            return 65
        else:
            return 40
    
    def _evaluate_technical_completeness(self, answer: str, question: str) -> float:
        """Evaluate if answer comprehensively addresses the question"""
        if not answer or not question:
            return 50
        
        words = answer.split()
        
        # Longer answers typically more complete
        if len(words) >= 150:
            return 95
        elif len(words) >= 100:
            return 85
        elif len(words) >= 50:
            return 70
        elif len(words) >= 30:
            return 50
        else:
            return 30
    
    # =============================================
    # 4. PROFESSIONALISM SCORE (15%)
    # =============================================
    def calculate_professionalism_score(self, answer: str) -> Dict:
        """
        Calculates professionalism score based on:
        - Time management (response length appropriateness)
        - Response organization
        - Professional communication
        - Interview etiquette (inferred from text)
        """
        score = 0
        details = {}
        
        # Time management (25 points)
        time_score = self._evaluate_time_management(answer)
        details['time_management'] = time_score
        score += time_score * 0.25
        
        # Response organization (30 points)
        organization_score = self._evaluate_response_organization(answer)
        details['organization'] = organization_score
        score += organization_score * 0.30
        
        # Professional communication (30 points)
        professional_score = self._evaluate_professional_language(answer)
        details['professional_communication'] = professional_score
        score += professional_score * 0.30
        
        # Interview etiquette (15 points)
        etiquette_score = self._evaluate_interview_etiquette(answer)
        details['etiquette'] = etiquette_score
        score += etiquette_score * 0.15
        
        return {
            'score': min(100, max(0, score)),
            'details': details,
            'breakdown': {
                'time_management': time_score,
                'organization': organization_score,
                'professional_communication': professional_score,
                'etiquette': etiquette_score
            }
        }
    
    def _evaluate_time_management(self, answer: str) -> float:
        """Evaluate time management based on response length"""
        if not answer:
            return 50
        
        words = answer.split()
        word_count = len(words)
        
        # Ideal: 50-200 words (appropriate response time)
        if 50 <= word_count <= 200:
            return 95
        elif 40 <= word_count <= 250:
            return 80
        elif 30 <= word_count <= 300:
            return 65
        elif word_count < 30:
            return 40
        else:
            return 50  # Too long
    
    def _evaluate_response_organization(self, answer: str) -> float:
        """Evaluate response organization"""
        if not answer:
            return 50
        
        answer_lower = answer.lower()
        
        # Organization indicators
        indicators = [
            'first', 'second', 'third', 'finally',
            'in the beginning', 'in summary', 'to conclude',
            'therefore', 'as a result', 'in conclusion'
        ]
        
        indicator_count = sum(1 for ind in indicators if ind in answer_lower)
        
        # Check for paragraph-like structure (multiple sentences with purpose)
        sentences = re.split(r'[.!?]+', answer.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 2:
            organization_score = 40
        elif len(sentences) < 4:
            organization_score = 60
        else:
            organization_score = 80
        
        # Boost score if has structural indicators
        if indicator_count > 0:
            organization_score = min(100, organization_score + (indicator_count * 10))
        
        return organization_score
    
    def _evaluate_professional_language(self, answer: str) -> float:
        """Evaluate use of professional language"""
        if not answer:
            return 50
        
        answer_lower = answer.lower()
        
        # Professional markers
        professional_terms = [
            'develop', 'implement', 'design', 'architecture', 'optimize',
            'collaborate', 'communicate', 'demonstrate', 'achieve', 'accomplished',
            'professional', 'effective', 'efficient', 'systematic', 'thorough'
        ]
        
        professional_count = sum(1 for term in professional_terms if term in answer_lower)
        
        # Unprofessional markers
        unprofessional_terms = [
            'like', 'gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nope',
            'stuff', 'thing', 'whatever'
        ]
        
        unprofessional_count = sum(1 for term in unprofessional_terms if ' ' + term + ' ' in ' ' + answer_lower + ' ')
        
        words = answer.split()
        if len(words) == 0:
            return 50
        
        professional_ratio = professional_count / len(words)
        unprofessional_ratio = unprofessional_count / len(words)
        
        score = 60 + (professional_ratio * 200) - (unprofessional_ratio * 300)
        
        return min(100, max(20, score))
    
    def _evaluate_interview_etiquette(self, answer: str) -> float:
        """Evaluate interview etiquette (inferred from text)"""
        if not answer:
            return 50
        
        answer_lower = answer.lower()
        
        # Positive etiquette indicators
        positive = [
            'thank', 'appreciate', 'pleased', 'happy', 'welcome',
            'respectfully', 'humbly', 'grateful', 'opportunity'
        ]
        
        # Negative etiquette indicators
        negative = [
            'i don\'t', 'impossible', 'can\'t', 'never', 'absolutely not',
            'wrong', 'stupid', 'dumb', 'obvious'
        ]
        
        positive_count = sum(1 for term in positive if term in answer_lower)
        negative_count = sum(1 for term in negative if term in answer_lower)
        
        if positive_count > negative_count:
            return 85 + (positive_count * 3)
        elif positive_count == negative_count:
            return 60
        else:
            return max(30, 60 - (negative_count * 10))
    
    # =============================================
    # OVERALL SCORE CALCULATION
    # =============================================
    def calculate_overall_score(self,
                               communication_score: float,
                               confidence_score: float,
                               technical_score: float,
                               professionalism_score: float) -> Dict:
        """Calculate weighted overall score"""
        
        overall = (
            communication_score * self.WEIGHTS['communication'] +
            confidence_score * self.WEIGHTS['confidence'] +
            technical_score * self.WEIGHTS['technical'] +
            professionalism_score * self.WEIGHTS['professionalism']
        )
        
        rating = self._get_performance_rating(overall)
        
        return {
            'overall_score': round(overall, 2),
            'rating': rating,
            'breakdown': {
                'communication': round(communication_score, 2),
                'confidence': round(confidence_score, 2),
                'technical': round(technical_score, 2),
                'professionalism': round(professionalism_score, 2)
            },
            'weights': self.WEIGHTS
        }
    
    def _get_performance_rating(self, score: float) -> str:
        """Get performance rating based on score"""
        if score >= self.THRESHOLDS['excellent']:
            return 'Excellent'
        elif score >= self.THRESHOLDS['good']:
            return 'Good'
        elif score >= self.THRESHOLDS['average']:
            return 'Average'
        elif score >= self.THRESHOLDS['needs_improvement']:
            return 'Needs Improvement'
        else:
            return 'Poor'
    
    # =============================================
    # COMPREHENSIVE EVALUATION
    # =============================================
    def evaluate_comprehensive(self,
                              question: str,
                              answer: str,
                              domain: str = 'general',
                              behavioral_data: Dict = None,
                              expected_keywords: List[str] = None) -> Dict:
        """
        Perform comprehensive evaluation across all dimensions
        """
        
        # Calculate individual scores
        comm_result = self.calculate_communication_score(answer)
        conf_result = self.calculate_confidence_score(answer, behavioral_data)
        tech_result = self.calculate_technical_relevance_score(question, answer, domain, expected_keywords)
        prof_result = self.calculate_professionalism_score(answer)
        
        # Calculate overall score
        overall_result = self.calculate_overall_score(
            comm_result['score'],
            conf_result['score'],
            tech_result['score'],
            prof_result['score']
        )
        
        return {
            'communication': comm_result,
            'confidence': conf_result,
            'technical': tech_result,
            'professionalism': prof_result,
            'overall': overall_result,
            'question': question,
            'answer': answer
        }


def evaluate_interview_session(session_data: Dict) -> Dict:
    """
    Evaluate entire interview session with multiple QA pairs
    
    Args:
        session_data: {
            'qa_pairs': [{'question': str, 'answer': str, ...}, ...],
            'domain': str,
            'behavioral_data': [Dict, ...] (optional, per Q&A)
        }
    
    Returns:
        Comprehensive evaluation with scores and feedback
    """
    
    engine = ScoringEngine()
    qa_pairs = session_data.get('qa_pairs', [])
    domain = session_data.get('domain', 'general')
    behavioral_data_list = session_data.get('behavioral_data', [])
    
    all_results = []
    
    for idx, qa in enumerate(qa_pairs):
        question = qa.get('question', '')
        answer = qa.get('answer', '')
        behavioral = behavioral_data_list[idx] if idx < len(behavioral_data_list) else None
        expected_keywords = qa.get('expected_keywords', None)
        
        result = engine.evaluate_comprehensive(
            question=question,
            answer=answer,
            domain=domain,
            behavioral_data=behavioral,
            expected_keywords=expected_keywords
        )
        
        all_results.append(result)
    
    # Calculate session averages
    if all_results:
        avg_communication = sum(r['communication']['score'] for r in all_results) / len(all_results)
        avg_confidence = sum(r['confidence']['score'] for r in all_results) / len(all_results)
        avg_technical = sum(r['technical']['score'] for r in all_results) / len(all_results)
        avg_professionalism = sum(r['professionalism']['score'] for r in all_results) / len(all_results)
        
        session_overall = engine.calculate_overall_score(
            avg_communication, avg_confidence, avg_technical, avg_professionalism
        )
    else:
        session_overall = {
            'overall_score': 0,
            'rating': 'Poor',
            'breakdown': {
                'communication': 0,
                'confidence': 0,
                'technical': 0,
                'professionalism': 0
            },
            'weights': engine.WEIGHTS
        }
    
    return {
        'individual_evaluations': all_results,
        'session_summary': {
            'total_questions': len(qa_pairs),
            'overall_scores': session_overall,
            'average_scores': {
                'communication': round(avg_communication, 2) if all_results else 0,
                'confidence': round(avg_confidence, 2) if all_results else 0,
                'technical': round(avg_technical, 2) if all_results else 0,
                'professionalism': round(avg_professionalism, 2) if all_results else 0
            }
        }
    }
