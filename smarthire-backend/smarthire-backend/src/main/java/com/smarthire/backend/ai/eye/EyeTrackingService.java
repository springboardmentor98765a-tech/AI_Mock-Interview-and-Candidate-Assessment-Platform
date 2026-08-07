package com.smarthire.backend.ai.eye;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates eye tracking between real and simulated providers.
 * Tries MediaPipe first, falls back to simulation if unavailable.
 */
@Service
public class EyeTrackingService {

    private final MediaPipeEyeTrackingProvider mediaPipeProvider;
    private final SimulatedEyeTrackingProvider simulatedProvider;

    public EyeTrackingService(MediaPipeEyeTrackingProvider mediaPipeProvider,
                              SimulatedEyeTrackingProvider simulatedProvider) {
        this.mediaPipeProvider = mediaPipeProvider;
        this.simulatedProvider = simulatedProvider;
    }

    public EyeTrackingProvider.EyeTrackingResult analyze(String imageBase64) {
        // Try real MediaPipe provider first
        EyeTrackingProvider.EyeTrackingResult result = mediaPipeProvider.analyze(imageBase64);
        if (result != null) {
            return result;
        }
        // Fall back to simulation
        return simulatedProvider.analyze(imageBase64);
    }

    public List<EyeTrackingProvider> getAvailableProviders() {
        return List.of(mediaPipeProvider, simulatedProvider);
    }
}