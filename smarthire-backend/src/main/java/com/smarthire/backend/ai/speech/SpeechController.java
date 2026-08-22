package com.smarthire.backend.ai.speech;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/speech")
public class SpeechController {
    private final WhisperTranscriptionService service;
    private final SpeechAnalysisService analysisService;

    public SpeechController(WhisperTranscriptionService service, SpeechAnalysisService analysisService) {
        this.service = service;
        this.analysisService = analysisService;
    }

    @PostMapping("/transcribe")
    public ResponseEntity<Map<String,Object>> transcribe(@RequestParam("audio") MultipartFile audio) throws Exception {
        return ResponseEntity.ok(service.transcribe(audio));
    }

    @PostMapping("/analyze")
    public ResponseEntity<SpeechAnalysisResult> analyze(
            @RequestParam("transcript") String transcript,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds,
            @RequestParam(value = "transcriptionConfidence", required = false) Integer transcriptionConfidence) {
        return ResponseEntity.ok(analysisService.analyze(transcript, durationSeconds, transcriptionConfidence));
    }
}
