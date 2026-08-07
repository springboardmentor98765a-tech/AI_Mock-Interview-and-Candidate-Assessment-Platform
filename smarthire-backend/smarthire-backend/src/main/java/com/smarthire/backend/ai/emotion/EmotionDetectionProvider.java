package com.smarthire.backend.ai.emotion;

import java.util.Map;

/**
 * Provider interface for emotion detection.
 * Implementations can plug in DeepFace, TensorFlow.js, or any other
 * emotion detection backend without changing the API contract.
 */
public interface EmotionDetectionProvider {

    /**
     * Detect the dominant emotion from an image frame (base64 encoded).
     *
     * @param imageBase64 base64-encoded image frame (JPEG/PNG)
     * @return emotion detection result with confidence scores
     */
    EmotionDetectionResult detect(String imageBase64);

    /**
     * Provider name for identification.
     */
    String getProviderName();

    /**
     * Whether this provider is a real implementation or a simulation fallback.
     */
    boolean isSimulated();

    /**
     * Result of emotion detection.
     */
    class EmotionDetectionResult {
        private String dominantEmotion;
        private double confidence;
        private Map<String, Double> scores;
        private String provider;
        private boolean simulated;

        public EmotionDetectionResult() {
        }

        public EmotionDetectionResult(String dominantEmotion, double confidence,
                                      Map<String, Double> scores, String provider, boolean simulated) {
            this.dominantEmotion = dominantEmotion;
            this.confidence = confidence;
            this.scores = scores;
            this.provider = provider;
            this.simulated = simulated;
        }

        public String getDominantEmotion() {
            return dominantEmotion;
        }

        public void setDominantEmotion(String dominantEmotion) {
            this.dominantEmotion = dominantEmotion;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public Map<String, Double> getScores() {
            return scores;
        }

        public void setScores(Map<String, Double> scores) {
            this.scores = scores;
        }

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public boolean isSimulated() {
            return simulated;
        }

        public void setSimulated(boolean simulated) {
            this.simulated = simulated;
        }
    }
}