package com.smarthire.backend.ai.controller;

import com.smarthire.backend.ai.emotion.EmotionDetectionProvider;
import com.smarthire.backend.ai.emotion.EmotionDetectionService;
import com.smarthire.backend.ai.eye.EyeTrackingProvider;
import com.smarthire.backend.ai.eye.EyeTrackingService;
import com.smarthire.backend.ai.speech.SpeechAnalysisService;
import com.smarthire.backend.ai.speech.SpeechAnalysisResult;
import com.smarthire.backend.ai.technical.TechnicalAnswerEvaluationGeminiClient;
import com.smarthire.backend.ai.technical.TechnicalAnswerEvaluationRequest;
import com.smarthire.backend.ai.technical.TechnicalAnswerEvaluationResponse;
import com.smarthire.backend.ai.feedback.FeedbackEngineService;
import com.smarthire.backend.ai.feedback.FeedbackRequest;
import com.smarthire.backend.ai.feedback.FeedbackResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final EmotionDetectionService emotionDetectionService;
    private final EyeTrackingService eyeTrackingService;
    private final SpeechAnalysisService speechAnalysisService;
    private final TechnicalAnswerEvaluationGeminiClient technicalAnswerEvaluationGeminiClient;
    private final FeedbackEngineService feedbackEngineService;

    public AiController(EmotionDetectionService emotionDetectionService,
                        EyeTrackingService eyeTrackingService,
                        SpeechAnalysisService speechAnalysisService,
                        TechnicalAnswerEvaluationGeminiClient technicalAnswerEvaluationGeminiClient,
                        FeedbackEngineService feedbackEngineService) {
        this.emotionDetectionService = emotionDetectionService;
        this.eyeTrackingService = eyeTrackingService;
        this.speechAnalysisService = speechAnalysisService;
        this.technicalAnswerEvaluationGeminiClient = technicalAnswerEvaluationGeminiClient;
        this.feedbackEngineService = feedbackEngineService;
    }

    @PostMapping("/emotion")
    public ResponseEntity<EmotionDetectionProvider.EmotionDetectionResult> detectEmotion(
            @RequestBody Map<String, String> request) {
        String imageBase64 = request.getOrDefault("image", "");
        return ResponseEntity.ok(emotionDetectionService.detect(imageBase64));
    }

    @PostMapping("/eye-tracking")
    public ResponseEntity<EyeTrackingProvider.EyeTrackingResult> analyzeEyeTracking(
            @RequestBody Map<String, String> request) {
        String imageBase64 = request.getOrDefault("image", "");
        return ResponseEntity.ok(eyeTrackingService.analyze(imageBase64));
    }

    @PostMapping("/speech-analysis")
    public ResponseEntity<SpeechAnalysisResult> analyzeSpeech(
            @RequestBody Map<String, String> request) {
        String transcript = request.getOrDefault("transcript", "");
        Integer durationSeconds = request.containsKey("durationSeconds")
                ? Integer.parseInt(request.get("durationSeconds"))
                : null;
        return ResponseEntity.ok(speechAnalysisService.analyze(transcript, durationSeconds));
    }

    @PostMapping("/technical-evaluation")
    public ResponseEntity<TechnicalAnswerEvaluationResponse> evaluateTechnicalAnswers(
            @RequestBody TechnicalAnswerEvaluationRequest request) {
        return ResponseEntity.ok(technicalAnswerEvaluationGeminiClient.evaluateAnswers(request));
    }

    @PostMapping("/feedback")
    public ResponseEntity<FeedbackResponse> generateFeedback(
            @RequestBody FeedbackRequest request) {
        return ResponseEntity.ok(feedbackEngineService.generateFeedback(request));
    }
}
