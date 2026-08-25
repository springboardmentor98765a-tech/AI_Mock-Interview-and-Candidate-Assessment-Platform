package com.smarthireai.Service;

import com.smarthireai.Entity.InterviewQuestion;
import com.smarthireai.Repository.InterviewQuestionRepository;
import com.smarthireai.dto.InterviewQuestionRequest;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InterviewQuestionService {

    private final InterviewQuestionRepository repository;
    private final AIQuestionGenerationService aiQuestionGenerationService;

    public InterviewQuestionService(
            InterviewQuestionRepository repository,
            AIQuestionGenerationService aiQuestionGenerationService) {

        this.repository = repository;
        this.aiQuestionGenerationService =
                aiQuestionGenerationService;
    }

    // =========================================================
    // GENERATE AI QUESTIONS
    // =========================================================

    public List<InterviewQuestion> generateQuestions(
            String category,
            String difficulty,
            String technology,
            int count) {

        // -----------------------------------------------------
        // Create request for AI
        // -----------------------------------------------------

        InterviewQuestionRequest request =
                new InterviewQuestionRequest();

        request.setType(category);
        request.setDifficulty(difficulty);
        request.setDomain(technology);
        request.setNumberOfQuestions(count);

        // -----------------------------------------------------
        // Generate questions using OpenAI
        // -----------------------------------------------------

        List<String> generatedQuestions =
                aiQuestionGenerationService
                        .generateQuestions(request);

        // -----------------------------------------------------
        // Save questions
        // -----------------------------------------------------

        List<InterviewQuestion> savedQuestions =
                new ArrayList<>();

        int questionNumber = 1;

        for (String questionText :
                generatedQuestions) {

            InterviewQuestion question =
                    new InterviewQuestion();

            question.setQuestion(questionText);

            question.setCategory(category);

            question.setDifficulty(difficulty);

            question.setTechnology(technology);

            question.setQuestionNumber(
                    questionNumber++
            );

            savedQuestions.add(
                    repository.save(question)
            );

            // Make sure we don't exceed requested count
            if (questionNumber > count) {
                break;
            }
        }

        return savedQuestions;
    }
}