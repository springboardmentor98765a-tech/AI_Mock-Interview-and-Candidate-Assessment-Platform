package com.smarthire.backend.ai.emotion;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Simulated emotion provider used when DeepFace is not configured.
 * Provides deterministic fallback so the API contract remains stable.
 */
@Component
public class SimulatedEmotionProvider implements EmotionDetectionProvider {

    private static final String[] EMOTIONS = {"Happy", "Neutral", "Sad", "Angry", "Fear", "Surprise"};
    private int index = 0;

    @Override
    public EmotionDetectionResult detect(String imageBase64) {
        index = (index + 1) % EMOTIONS.length;
        String dominant = EMOTIONS[index];

        Map<String, Double> scores = new HashMap<>();
        for (String emotion : EMOTIONS) {
            double base = emotion.equals(dominant) ? 60.0 : 8.0;
            scores.put(emotion, base + (Math.random() * 15));
        }

        return new EmotionDetectionResult(
                dominant,
                70.0 + (Math.random() * 20),
                scores,
                "simulated-emotion",
                true
        );
    }

    @Override
    public String getProviderName() {
        return "simulated-emotion";
    }

    @Override
    public boolean isSimulated() {
        return true;
    }
}