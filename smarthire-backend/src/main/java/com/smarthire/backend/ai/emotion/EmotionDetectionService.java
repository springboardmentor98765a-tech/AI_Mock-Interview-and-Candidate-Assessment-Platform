package com.smarthire.backend.ai.emotion;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates emotion detection between real and simulated providers.
 * Tries DeepFace first, falls back to simulation if unavailable.
 */
@Service
public class EmotionDetectionService {

    private final DeepFaceEmotionProvider deepFaceProvider;
    private final SimulatedEmotionProvider simulatedProvider;

    public EmotionDetectionService(DeepFaceEmotionProvider deepFaceProvider,
                                   SimulatedEmotionProvider simulatedProvider) {
        this.deepFaceProvider = deepFaceProvider;
        this.simulatedProvider = simulatedProvider;
    }

    public EmotionDetectionProvider.EmotionDetectionResult detect(String imageBase64) {
        // Try real DeepFace provider first
        EmotionDetectionProvider.EmotionDetectionResult result = deepFaceProvider.detect(imageBase64);
        if (result != null) {
            return result;
        }
        // Fall back to simulation
        return simulatedProvider.detect(imageBase64);
    }

    public List<EmotionDetectionProvider> getAvailableProviders() {
        return List.of(deepFaceProvider, simulatedProvider);
    }
}