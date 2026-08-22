package com.smarthire.backend.interview.ai;

import com.smarthire.backend.interview.dto.InterviewEvaluationResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InterviewEvaluationRubricTest {

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
