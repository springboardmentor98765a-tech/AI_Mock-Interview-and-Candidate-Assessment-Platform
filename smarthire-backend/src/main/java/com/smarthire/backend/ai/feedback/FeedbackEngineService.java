package com.smarthire.backend.ai.feedback;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * AI Feedback Engine.
 * Generates personalized strengths, weaknesses, improvement suggestions,
 * learning recommendations, and practice plan based on interview scores.
 */
@Service
public class FeedbackEngineService {

    public FeedbackResponse generateFeedback(FeedbackRequest request) {
        FeedbackResponse response = new FeedbackResponse();
        response.setInterviewId(request.getInterviewId());

        response.setStrengths(buildStrengths(request));
        response.setWeaknesses(buildWeaknesses(request));
        response.setImprovementSuggestions(buildImprovementSuggestions(request));
        response.setLearningRecommendations(buildLearningRecommendations(request));
        response.setPracticePlan(buildPracticePlan(request));

        return response;
    }

    private List<String> buildStrengths(FeedbackRequest request) {
        List<String> strengths = new ArrayList<>();
        if (request.getTechnicalScore() >= 75) {
            strengths.add("Technical Relevance score: " + request.getTechnicalScore() + "/100. This meets the strong-performance band, showing sound accuracy and depth relevant to " + safeText(request.getJobRole()) + ".");
        }
        if (request.getCommunicationScore() >= 75) {
            strengths.add("Communication score: " + request.getCommunicationScore() + "/100. Grammar, clarity, and pacing are consistently strong across responses.");
        }
        if (request.getConfidenceScore() >= 70) {
            strengths.add("Confidence score: " + request.getConfidenceScore() + "/100. Eye contact, facial engagement, and steady delivery support a confident on-camera presence.");
        }
        if (request.getProfessionalismScore() >= 70) {
            strengths.add("Professionalism score: " + request.getProfessionalismScore() + "/100. Time management, structure, and interview etiquette are well handled.");
        }
        if (request.getOverallScore() >= 80) {
            strengths.add("Overall score: " + request.getOverallScore() + "/100. This indicates strong readiness for the next interview stage.");
        }
        if (strengths.isEmpty()) {
            strengths.add("No Module 7 category (Communication, Confidence, Technical Relevance, Professionalism) reached the strong-performance threshold in this session; see Weaknesses for the specific score-grounded gaps.");
        }
        return strengths;
    }

    private List<String> buildWeaknesses(FeedbackRequest request) {
        List<String> weaknesses = new ArrayList<>();
        if (request.getTechnicalScore() < 70) {
            weaknesses.add("Technical Relevance score: " + request.getTechnicalScore() + "/100 (below the 70 threshold). Answers likely lack sufficient depth, examples, or trade-off analysis for " + safeText(request.getJobRole()) + " questions.");
        }
        if (request.getCommunicationScore() < 70) {
            weaknesses.add("Communication score: " + request.getCommunicationScore() + "/100 (below the 70 threshold). Pacing, grammar, or clarity issues are reducing how easy responses are to follow.");
        }
        if (request.getConfidenceScore() < 70) {
            weaknesses.add("Confidence score: " + request.getConfidenceScore() + "/100 (below the 70 threshold). Eye contact, facial engagement, or hesitation signals suggest limited on-camera confidence.");
        }
        if (request.getProfessionalismScore() < 70) {
            weaknesses.add("Professionalism score: " + request.getProfessionalismScore() + "/100 (below the 70 threshold). Time management, answer structure, or interview etiquette need refinement.");
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("All four Module 7 categories are at or above the 70/100 threshold in this session; no critical weaknesses were detected from the available interview signals.");
        }
        return weaknesses;
    }

    private List<String> buildImprovementSuggestions(FeedbackRequest request) {
        List<String> suggestions = new ArrayList<>();
        if (request.getTechnicalScore() < 75) {
            suggestions.add("Technical Relevance (" + request.getTechnicalScore() + "/100): use the pattern requirement → approach → example → edge case → trade-off → conclusion, and explicitly name the key concept before explaining it.");
        }
        if (request.getCommunicationScore() < 75) {
            suggestions.add("Communication (" + request.getCommunicationScore() + "/100): use a three-part answer structure (direct answer → evidence/example → closing takeaway) and pause 1-2 seconds instead of using filler words.");
        }
        if (request.getConfidenceScore() < 75) {
            suggestions.add("Confidence (" + request.getConfidenceScore() + "/100): keep your eyes near the webcam while answering and begin each response with a direct sentence instead of a hesitant opener.");
        }
        if (request.getProfessionalismScore() < 75) {
            suggestions.add("Professionalism (" + request.getProfessionalismScore() + "/100): open with a brief acknowledgement, keep answers within a 90-second to 2-minute target, and close with a one-sentence summary.");
        }
        if (suggestions.isEmpty()) {
            suggestions.add("All four Module 7 categories are already at or above 75/100; focus practice on maintaining consistency rather than remediation.");
        }
        return suggestions;
    }

    private List<String> buildLearningRecommendations(FeedbackRequest request) {
        List<String> recommendations = new ArrayList<>();
        String role = safeText(request.getJobRole());
        String domain = safeText(request.getDomain());

        recommendations.add((role.isBlank() ? "Role-specific" : role) + " interview preparation guide: https://www.indeed.com/career-advice/interviewing");
        recommendations.add((domain.isBlank() ? "Core domain" : domain) + " fundamentals refresher: https://ocw.mit.edu/");
        recommendations.add("System design and architecture case studies: https://www.geeksforgeeks.org/system-design/");
        recommendations.add("Behavioral interview question bank with STAR examples: https://www.themuse.com/advice/star-interview-method");

        if (request.getTechnicalScore() < 70) {
            recommendations.add("Technical Relevance (" + request.getTechnicalScore() + "/100) — algorithms, data structures and problem-solving practice: https://leetcode.com/");
        }
        if (request.getCommunicationScore() < 70) {
            recommendations.add("Communication (" + request.getCommunicationScore() + "/100) — public speaking and clarity practice: https://www.toastmasters.org/");
        }
        if (request.getConfidenceScore() < 70) {
            recommendations.add("Confidence (" + request.getConfidenceScore() + "/100) — on-camera mock interview practice: https://biginterview.com/");
        }
        if (request.getProfessionalismScore() < 70) {
            recommendations.add("Professionalism (" + request.getProfessionalismScore() + "/100) — professional communication course: https://www.linkedin.com/learning/");
        }
        return recommendations;
    }

    private List<String> buildPracticePlan(FeedbackRequest request) {
        List<String> plan = new ArrayList<>();
        plan.add("Week 1: Complete 3 timed mock interviews focusing on " + safeText(request.getJobRole()) + ", then review this baseline's lowest two Module 7 category scores.");
        plan.add("Week 2: Review evaluation feedback and run 5 targeted drills on the specific weak parameters named in this report.");
        plan.add("Week 3: Take 2 full-length mock interviews with camera and microphone enabled and compare each Module 7 category against this baseline.");
        plan.add("Week 4: Final assessment interview; the goal is at least a 10-point improvement on the two lowest-scoring categories from this report.");

        if (request.getTechnicalScore() < 70) {
            plan.add("Daily: solve 2-3 technical problems for " + safeText(request.getDomain()) + " and explain the solution and trade-offs aloud (current Technical Relevance: " + request.getTechnicalScore() + "/100).");
        }
        if (request.getConfidenceScore() < 70) {
            plan.add("Daily: 10 minutes of on-camera self-introduction and answer practice, focusing on eye contact and steady pacing (current Confidence: " + request.getConfidenceScore() + "/100).");
        }
        return plan;
    }

    private String safeText(String text) {
        return text == null || text.isBlank() ? "the target role" : text.trim();
    }
}