package com.smarthire.backend.ai.eye;

import org.springframework.stereotype.Component;

/**
 * Simulated eye tracking provider used when MediaPipe is not configured.
 * Provides deterministic fallback so the API contract remains stable.
 */
@Component
public class SimulatedEyeTrackingProvider implements EyeTrackingProvider {

    private int lastEyeContact = 65;
    private int lookingAwayAccumulator = 0;

    @Override
    public EyeTrackingResult analyze(String imageBase64) {
        // Simulate slight drift in eye contact
        int drift = (int) (Math.random() * 8) - 4;
        lastEyeContact = Math.max(15, Math.min(97, lastEyeContact + drift));

        if (lastEyeContact < 45) {
            lookingAwayAccumulator += 2;
        } else {
            lookingAwayAccumulator = Math.max(0, lookingAwayAccumulator - 1);
        }

        String attention = lastEyeContact >= 75 ? "High" : (lastEyeContact >= 50 ? "Medium" : "Low");
        String headOrientation = lastEyeContact >= 70 ? "Front" : (lastEyeContact >= 45 ? "Slight Turn" : "Turned Away");

        return new EyeTrackingResult(
                lastEyeContact,
                lookingAwayAccumulator,
                headOrientation,
                attention,
                "simulated-eye",
                true
        );
    }

    @Override
    public String getProviderName() {
        return "simulated-eye";
    }

    @Override
    public boolean isSimulated() {
        return true;
    }
}