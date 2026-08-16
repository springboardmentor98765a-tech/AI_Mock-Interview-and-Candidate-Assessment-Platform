package com.smarthire.backend.ai.speech;
import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile; import java.util.Map;
@RestController @RequestMapping("/api/ai/speech") public class SpeechController{
 private final WhisperTranscriptionService service; public SpeechController(WhisperTranscriptionService service){this.service=service;}
 @PostMapping("/transcribe") public ResponseEntity<Map<String,Object>> transcribe(@RequestParam("audio") MultipartFile audio)throws Exception{return ResponseEntity.ok(service.transcribe(audio));}
}
