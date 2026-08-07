package com.smarthire.backend.ai.eye;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * MediaPipe Face Mesh eye tracking adapter.
 * This provider is isolated so MediaPipe can be plugged in without changing APIs.
 * It calls a MediaPipe REST endpoint (e.g., a Python FastAPI service running MediaPipe Face Mesh).
 * If the endpoint is not configured or unreachable, it falls back to simulation.
 */
@Component
public class MediaPipeEyeTrackingProvider implements EyeTrackingProvider {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String mediaPipeUrl;
    private final boolean enabled;

    public MediaPipeEyeTrackingProvider(RestClient.Builder restClientBuilder,
                                        @Value("${ai.mediapipe.url:}") String mediaPipeUrl,
                                        @Value("${ai.mediapipe.enabled:false}") boolean enabled) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = new ObjectMapper();
        this.mediaPipeUrl = mediaPipeUrl;
        this.enabled = enabled;
    }

    @Override
    public EyeTrackingResult analyze(String imageBase64) {
        if (!enabled || mediaPipeUrl == null || mediaPipeUrl.isBlank()) {
            return null; // Not configured - caller falls back to simulation
        }

        try {
            Map<String, String> requestBody = Map.of("image", imageBase64);

            JsonNode response = restClient.post()
                    .uri(mediaPipeUrl + "/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return null;
            }

            int eyeContact = response.path("eye_contact_percentage").asInt(50);
            int lookingAway = response.path("looking_away_duration_seconds").asInt(0);
            String headOrientation = response.path("head_orientation").asText("Front");
            String attention = response.path("attention_level").asText("Medium");

            return new EyeTrackingResult(
                    Math.max(0, Math.min(100, eyeContact)),
                    Math.max(0, lookingAway),
                    headOrientation,
                    attention,
                    "mediapipe",
                    false
            );
        } catch (Exception e) {
            return null; // MediaPipe unreachable - caller falls back to simulation
        }
    }

    @Override
    public String getProviderName() {
        return "mediapipe";
    }

    @Override
    public boolean isSimulated() {
        return false;
    }
}