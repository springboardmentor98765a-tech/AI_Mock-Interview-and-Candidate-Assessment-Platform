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
            strengths.add("Strong technical depth with clear explanations relevant to " + safeText(request.getJobRole()));
        }
        if (request.getCommunicationScore() >= 75) {
            strengths.add("Excellent communication with clear, structured responses.");
        }
        if (request.getConfidenceScore() >= 70) {
            strengths.add("High confidence signals with strong eye contact and steady delivery.");
        }
        if (request.getProfessionalismScore() >= 70) {
            strengths.add("Professional interview etiquette and well-organized answers.");
        }
        if (request.getOverallScore() >= 80) {
            strengths.add("Overall performance indicates strong readiness for the next interview stage.");
        }
        if (strengths.isEmpty()) {
            strengths.add("Candidate provided sufficient data for a complete evaluation.");
        }
        return strengths;
    }

    private List<String> buildWeaknesses(FeedbackRequest request) {
        List<String> weaknesses = new ArrayList<>();
        if (request.getTechnicalScore() < 70) {
            weaknesses.add("Technical answers need more depth, examples, and trade-off analysis.");
        }
        if (request.getCommunicationScore() < 70) {
            weaknesses.add("Communication needs improvement in pacing, grammar, or clarity.");
        }
        if (request.getConfidenceScore() < 70) {
            weaknesses.add("Confidence signals are limited; more on-camera practice is recommended.");
        }
        if (request.getProfessionalismScore() < 70) {
            weaknesses.add("Answer structure and interview etiquette need refinement.");
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("No critical weaknesses detected from the available interview signals.");
        }
        return weaknesses;
    }

    private List<String> buildImprovementSuggestions(FeedbackRequest request) {
        List<String> suggestions = new ArrayList<>();
        if (request.getTechnicalScore() < 75) {
            suggestions.add("Use the STAR method for behavioral questions and structured reasoning for technical ones.");
        }
        if (request.getCommunicationScore() < 75) {
            suggestions.add("Practice concise answers with clear topic sentences and supporting examples.");
        }
        if (request.getConfidenceScore() < 75) {
            suggestions.add("Record mock interviews on camera and review eye contact and posture.");
        }
        if (request.getProfessionalismScore() < 75) {
            suggestions.add("Open with a brief acknowledgement and close with a summary sentence.");
        }
        if (suggestions.isEmpty()) {
            suggestions.add("Keep practicing harder questions to continue improving the overall score.");
        }
        return suggestions;
    }

    private List<String> buildLearningRecommendations(FeedbackRequest request) {
        List<String> recommendations = new ArrayList<>();
        String role = safeText(request.getJobRole());
        String domain = safeText(request.getDomain());

        recommendations.add(role.isBlank() ? "Role-specific interview preparation guide" : role + " interview preparation guide");
        recommendations.add(domain.isBlank() ? "Core domain fundamentals refresher" : domain + " fundamentals refresher");
        recommendations.add("System design and architecture case studies");
        recommendations.add("Behavioral interview question bank with STAR examples");

        if (request.getTechnicalScore() < 70) {
            recommendations.add("Technical deep-dive courses on algorithms, data structures, and system design");
        }
        if (request.getCommunicationScore() < 70) {
            recommendations.add("Public speaking and communication skills course");
        }
        return recommendations;
    }

    private List<String> buildPracticePlan(FeedbackRequest request) {
        List<String> plan = new ArrayList<>();
        plan.add("Week 1: Complete 3 timed mock interviews focusing on " + safeText(request.getJobRole()));
        plan.add("Week 2: Review evaluation feedback and practice weak areas identified in this session");
        plan.add("Week 3: Take 2 full-length mock interviews with camera and microphone enabled");
        plan.add("Week 4: Final assessment interview and compare scores with this baseline");

        if (request.getTechnicalScore() < 70) {
            plan.add("Daily: Solve 2-3 technical problems and explain solutions aloud");
        }
        if (request.getConfidenceScore() < 70) {
            plan.add("Daily: 10 minutes of on-camera self-introduction and answer practice");
        }
        return plan;
    }

    private String safeText(String text) {
        return text == null || text.isBlank() ? "the target role" : text.trim();
    }
}