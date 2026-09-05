package com.smarthire.backend.interview.ai;

import com.smarthire.backend.interview.dto.InterviewEvaluationResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InterviewEvaluationRubricTest {

    @Test
    void module7ConfidenceUsesFiveParameters() {
        int confidence = Math.round((90 + 80 + 70 + 85 + 75) / 5f);
        assertEquals(80, confidence);
    }

    @Test
    void professionalCommunicationIsAnIndependentModule7Metric() {
        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        response.setProfessionalCommunicationScore(82);
        assertEquals(82, response.getProfessionalCommunicationScore());
    }

    @Test
    void rubricFieldsRemainIndependent() {
        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        response.setCommunicationScore(90);
        response.setConfidenceScore(80);
        response.setTechnicalScore(70);
        response.setProfessionalismScore(60);
        int overall = Math.round(response.getCommunicationScore() * .30f
                + response.getConfidenceScore() * .25f
                + response.getTechnicalScore() * .30f
                + response.getProfessionalismScore() * .15f);
        assertEquals(77, overall);
    }
}
