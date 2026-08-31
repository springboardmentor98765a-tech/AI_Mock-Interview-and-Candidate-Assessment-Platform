package com.smarthire.backend.ai.emotion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class CustomCnnEmotionProvider implements EmotionDetectionProvider {
    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String serviceUrl;
    private final boolean enabled;

    public CustomCnnEmotionProvider(RestClient.Builder restClientBuilder,
                                    @Value("${ai.emotion-cnn.url:http://localhost:8095}") String serviceUrl,
                                    @Value("${ai.emotion-cnn.enabled:true}") boolean enabled) {
        this.restClient = restClientBuilder.build();
        this.serviceUrl = serviceUrl;
        this.enabled = enabled;
    }

    @Override
    public EmotionDetectionResult detect(String imageBase64) {
        if (!enabled || serviceUrl == null || serviceUrl.isBlank()) return null;
        try {
            JsonNode response = restClient.post()
                    .uri(serviceUrl + "/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("image", imageBase64))
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || !response.path("available").asBoolean(false)
                    || !response.path("model_ready").asBoolean(false)) return null;

            String dominant = response.path("dominant_emotion").asText("Unavailable");
            double confidence = response.path("confidence").asDouble(0);
            Map<String, Double> scores = new HashMap<>();
            JsonNode scoreNode = response.path("scores");
            if (scoreNode.isObject()) {
                scoreNode.fields().forEachRemaining(e -> scores.put(e.getKey(), e.getValue().asDouble(0)));
            }
            // emotion_cnn custom CNN backend integration; the custom model only uses the exact assignment classes.
            for (String label : new String[]{"Nervous", "Scared", "Confused"}) scores.putIfAbsent(label, 0.0);
            EmotionDetectionResult result = new EmotionDetectionResult(
                    dominant, confidence, scores, "custom-cnn", false);
            result.setFaceCount(response.path("face_count").asInt(-1));
            return result;
        } catch (Exception ex) {
            return null;
        }
    }

    @Override public String getProviderName() { return "custom-cnn"; }
    @Override public boolean isSimulated() { return false; }
}

