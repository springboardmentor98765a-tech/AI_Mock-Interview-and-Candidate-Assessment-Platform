package com.smarthire.backend.ai.speech;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@Service
public class WhisperTranscriptionService {
 private final RestClient client; private final String url; private final boolean enabled;
 public WhisperTranscriptionService(RestClient.Builder b,@Value("${ai.whisper.url:}") String url,@Value("${ai.whisper.enabled:false}") boolean enabled){this.client=b.build();this.url=url;this.enabled=enabled;}
 public Map<String,Object> transcribe(MultipartFile audio) throws IOException {
  if(audio==null||audio.isEmpty()) throw new IllegalArgumentException("Audio file is required");
  if(!enabled||url==null||url.isBlank()) return Map.of("transcript","","provider","browser-or-local","simulated",true,"message","Whisper service is not configured");
  ByteArrayResource resource=new ByteArrayResource(audio.getBytes()){ @Override public String getFilename(){return audio.getOriginalFilename()==null?"audio.webm":audio.getOriginalFilename();}};
  MultiValueMap<String,Object> form=new LinkedMultiValueMap<>(); form.add("audio",resource);
  Map<?,?> result=client.post().uri(url+"/transcribe").contentType(MediaType.MULTIPART_FORM_DATA).body(form).retrieve().body(Map.class);
  if(result==null) throw new IllegalStateException("Whisper service returned no response");
  return Map.of("transcript",String.valueOf(result.get("text") == null ? "" : result.get("text")),"provider","whisper","confidence",result.get("confidence") == null ? 0 : result.get("confidence"),"segments",result.get("segments") == null ? 0 : result.get("segments"),"simulated",false);
 }
}
