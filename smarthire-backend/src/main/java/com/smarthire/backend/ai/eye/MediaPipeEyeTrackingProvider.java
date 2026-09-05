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
 * If the endpoint is not configured or unreachable, it returns an explicit unavailable result when the provider is unavailable.
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
            return null; // Not configured - caller receives an unavailable result
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
            int faceCount = response.path("face_count").asInt(1);
            int lookingAway = response.path("looking_away_duration_seconds").asInt(0);
            String headOrientation = response.path("head_orientation").asText("Front");
            String attention = response.path("attention_level").asText("Medium");
            String gaze = response.path("gaze_direction").asText("Unavailable");
            boolean eyesClosed = response.path("eyes_closed").asBoolean(false);
            int headStability = response.path("head_stability_score").asInt(0);
            int facialActivity = response.path("facial_activity_score").asInt(0);
            int engagementScore = response.path("engagement_score").asInt(0);

            EyeTrackingResult result = new EyeTrackingResult(
                    Math.max(0, Math.min(100, eyeContact)),
                    Math.max(0, lookingAway),
                    headOrientation,
                    attention,
                    response.path("provider").asText("mediapipe"),
                    response.path("simulated").asBoolean(false)
            );
            result.setFaceCount(Math.max(0, faceCount));
            result.setGazeDirection(gaze);
            result.setEyesClosed(eyesClosed);
            result.setHeadStabilityScore(Math.max(0, Math.min(100, headStability)));
            result.setFacialActivityScore(Math.max(0, Math.min(100, facialActivity)));
            result.setEngagementScore(Math.max(0, Math.min(100, engagementScore)));
            return result;
        } catch (Exception e) {
            return null; // MediaPipe unreachable - caller receives an unavailable result
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