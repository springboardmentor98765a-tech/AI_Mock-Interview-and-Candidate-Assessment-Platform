package com.smarthire.backend.ai.emotion;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class EmotionDetectionService {
    private final CustomCnnEmotionProvider customCnnProvider;
    private final DeepFaceEmotionProvider deepFaceProvider;

    public EmotionDetectionService(CustomCnnEmotionProvider customCnnProvider,
                                   DeepFaceEmotionProvider deepFaceProvider) {
        this.customCnnProvider = customCnnProvider;
        this.deepFaceProvider = deepFaceProvider;
    }

    /**
     * Custom three-class CNN is the primary Module 6 prediction engine.
     * DeepFace is retained as a secondary general-emotion provider only when
     * the custom CNN model is not yet trained. No synthetic values are returned.
     */
    public EmotionDetectionProvider.EmotionDetectionResult detect(String imageBase64) {
        var cnn = customCnnProvider.detect(imageBase64);
        if (cnn != null) return cnn;
        var deepFace = deepFaceProvider.detect(imageBase64);
        if (deepFace != null) return deepFace;
        var unavailable = new EmotionDetectionProvider.EmotionDetectionResult();
        unavailable.setDominantEmotion("Unavailable");
        unavailable.setConfidence(0);
        unavailable.setScores(Collections.emptyMap());
        unavailable.setProvider("unavailable");
        unavailable.setSimulated(false);
        return unavailable;
    }

    public List<EmotionDetectionProvider> getAvailableProviders() {
        return List.of(customCnnProvider, deepFaceProvider);
    }
}
