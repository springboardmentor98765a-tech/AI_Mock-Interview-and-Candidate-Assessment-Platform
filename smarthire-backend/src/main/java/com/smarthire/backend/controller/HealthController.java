package com.smarthire.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {
    @Value("${gemini.api.key:}") private String geminiKey;
    @Value("${ai.deepface.enabled:false}") private boolean deepfaceEnabled;
    @Value("${ai.mediapipe.enabled:false}") private boolean mediapipeEnabled;
    @Value("${ai.whisper.enabled:false}") private boolean whisperEnabled;

    @GetMapping("/api/health")
    public Map<String,Object> health() {
        Map<String,Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "SmartHire AI Backend");
        response.put("geminiConfigured", geminiKey != null && !geminiKey.isBlank());
        response.put("deepfaceEnabled", deepfaceEnabled);
        response.put("mediapipeEnabled", mediapipeEnabled);
        response.put("whisperEnabled", whisperEnabled);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}
