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
        private int faceCount;
        private String gazeDirection;
        private boolean eyesClosed;
        private int headStabilityScore;
        private int facialActivityScore;
        private int engagementScore;

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
            this.faceCount = 1;
        }

        public int getFaceCount() { return faceCount; }
        public void setFaceCount(int faceCount) { this.faceCount = faceCount; }
        public String getGazeDirection() { return gazeDirection; }
        public void setGazeDirection(String gazeDirection) { this.gazeDirection = gazeDirection; }
        public boolean isEyesClosed() { return eyesClosed; }
        public void setEyesClosed(boolean eyesClosed) { this.eyesClosed = eyesClosed; }
        public int getHeadStabilityScore() { return headStabilityScore; }
        public void setHeadStabilityScore(int headStabilityScore) { this.headStabilityScore = headStabilityScore; }
        public int getFacialActivityScore() { return facialActivityScore; }
        public void setFacialActivityScore(int facialActivityScore) { this.facialActivityScore = facialActivityScore; }
        public int getEngagementScore() { return engagementScore; }
        public void setEngagementScore(int engagementScore) { this.engagementScore = engagementScore; }

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