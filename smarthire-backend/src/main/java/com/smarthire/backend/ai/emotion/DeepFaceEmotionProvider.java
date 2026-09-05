package com.smarthire.backend.ai.emotion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

/**
 * DeepFace emotion detection adapter.
 * This provider is isolated so DeepFace can be plugged in without changing APIs.
 * It calls a DeepFace REST endpoint (e.g., a Python FastAPI service running DeepFace).
 * If the endpoint is not configured or unreachable, it returns an explicit unavailable result when the provider is unavailable.
 */
@Component
public class DeepFaceEmotionProvider implements EmotionDetectionProvider {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String deepFaceUrl;
    private final boolean enabled;

    public DeepFaceEmotionProvider(RestClient.Builder restClientBuilder,
                                   @Value("${ai.deepface.url:}") String deepFaceUrl,
                                   @Value("${ai.deepface.enabled:false}") boolean enabled) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = new ObjectMapper();
        this.deepFaceUrl = deepFaceUrl;
        this.enabled = enabled;
    }

    @Override
    public EmotionDetectionResult detect(String imageBase64) {
        if (!enabled || deepFaceUrl == null || deepFaceUrl.isBlank()) {
            return null; // Not configured - caller receives an unavailable result
        }

        try {
            Map<String, String> requestBody = Map.of("image", imageBase64);

            JsonNode response = restClient.post()
                    .uri(deepFaceUrl + "/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return null;
            }

            String dominantEmotion = response.path("dominant_emotion").asText("Neutral");
            double confidence = response.path("confidence").asDouble(50.0);

            Map<String, Double> scores = new HashMap<>();
            JsonNode emotions = response.path("emotion");
            if (emotions.isObject()) {
                emotions.fields().forEachRemaining(entry -> {
                    scores.put(entry.getKey(), entry.getValue().asDouble(0.0));
                });
            }

            // Ensure all required emotions are present
            for (String emotion : new String[]{"Happy", "Neutral", "Sad", "Angry", "Fear", "Surprise"}) {
                scores.putIfAbsent(emotion, 0.0);
            }

            return new EmotionDetectionResult(
                    dominantEmotion,
                    confidence,
                    scores,
                    "deepface",
                    false
            );
        } catch (Exception e) {
            return null; // DeepFace unreachable - caller receives an unavailable result
        }
    }

    @Override
    public String getProviderName() {
        return "deepface";
    }

    @Override
    public boolean isSimulated() {
        return false;
    }
}