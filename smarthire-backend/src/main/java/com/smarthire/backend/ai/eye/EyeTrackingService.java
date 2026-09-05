package com.smarthire.backend.ai.eye;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Orchestrates real MediaPipe eye tracking. A failed provider returns an explicit
 * unavailable state; it is never converted into synthetic face/attention data.
 */
@Service
public class EyeTrackingService {

    private final MediaPipeEyeTrackingProvider mediaPipeProvider;

    public EyeTrackingService(MediaPipeEyeTrackingProvider mediaPipeProvider) {
        this.mediaPipeProvider = mediaPipeProvider;
    }

    public EyeTrackingProvider.EyeTrackingResult analyze(String imageBase64) {
        EyeTrackingProvider.EyeTrackingResult result = mediaPipeProvider.analyze(imageBase64);
        if (result != null) return result;

        EyeTrackingProvider.EyeTrackingResult unavailable = new EyeTrackingProvider.EyeTrackingResult();
        unavailable.setEyeContactPercentage(0);
        unavailable.setLookingAwayDurationSeconds(0);
        unavailable.setHeadOrientation("Unavailable");
        unavailable.setAttentionLevel("Unavailable");
        unavailable.setProvider("unavailable");
        unavailable.setSimulated(false);
        unavailable.setFaceCount(-1);
        return unavailable;
    }

    public List<EyeTrackingProvider> getAvailableProviders() {
        return List.of(mediaPipeProvider);
    }
}
