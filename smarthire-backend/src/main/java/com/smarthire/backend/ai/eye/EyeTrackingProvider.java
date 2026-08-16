package com.smarthire.backend.ai.eye;

/**
 * Provider interface for eye tracking.
 * Implementations can plug in MediaPipe Face Mesh, OpenCV, or any other
 * eye tracking backend without changing the API contract.
 */
public interface EyeTrackingProvider {

    /**
     * Analyze eye tracking metrics from an image frame (base64 encoded).
     *
     * @param imageBase64 base64-encoded image frame (JPEG/PNG)
     * @return eye tracking result with metrics
     */
    EyeTrackingResult analyze(String imageBase64);

    /**
     * Provider name for identification.
     */
    String getProviderName();

    /**
     * Whether this provider is a real implementation or a simulation fallback.
     */
    boolean isSimulated();

    /**
     * Result of eye tracking analysis.
     */
    class EyeTrackingResult {
        private int eyeContactPercentage;
        private int lookingAwayDurationSeconds;
        private String headOrientation;
        private String attentionLevel;
        private String provider;
        private boolean simulated;

        public EyeTrackingResult() {
        }

        public EyeTrackingResult(int eyeContactPercentage,
                                 int lookingAwayDurationSeconds,
                                 String headOrientation,
                                 String attentionLevel,
                                 String provider,
                                 boolean simulated) {
            this.eyeContactPercentage = eyeContactPercentage;
            this.lookingAwayDurationSeconds = lookingAwayDurationSeconds;
            this.headOrientation = headOrientation;
            this.attentionLevel = attentionLevel;
            this.provider = provider;
            this.simulated = simulated;
        }

        public int getEyeContactPercentage() {
            return eyeContactPercentage;
        }

        public void setEyeContactPercentage(int eyeContactPercentage) {
            this.eyeContactPercentage = eyeContactPercentage;
        }

        public int getLookingAwayDurationSeconds() {
            return lookingAwayDurationSeconds;
        }

        public void setLookingAwayDurationSeconds(int lookingAwayDurationSeconds) {
            this.lookingAwayDurationSeconds = lookingAwayDurationSeconds;
        }

        public String getHeadOrientation() {
            return headOrientation;
        }

        public void setHeadOrientation(String headOrientation) {
            this.headOrientation = headOrientation;
        }

        public String getAttentionLevel() {
            return attentionLevel;
        }

        public void setAttentionLevel(String attentionLevel) {
            this.attentionLevel = attentionLevel;
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