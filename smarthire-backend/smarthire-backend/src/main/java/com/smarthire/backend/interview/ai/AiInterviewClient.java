package com.smarthire.backend.interview.ai;

import com.smarthire.backend.interview.dto.InterviewQuestionDto;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AiInterviewClient {

    private final InterviewGeminiClient interviewGeminiClient;

    public AiInterviewClient(InterviewGeminiClient interviewGeminiClient) {
        this.interviewGeminiClient = interviewGeminiClient;
    }

    public List<InterviewQuestionDto> generateQuestions(
            String jobRole,
            String interviewType,
            String domain,
            String experienceLevel,
            String difficulty
    ) {
        return interviewGeminiClient.generateQuestions(
                jobRole,
                interviewType,
                domain,
                experienceLevel,
                difficulty
        );
    }
}