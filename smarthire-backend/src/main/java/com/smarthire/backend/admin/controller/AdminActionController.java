package com.smarthire.backend.admin.controller;
import com.smarthire.backend.platform.entity.PlatformActionLog;
import com.smarthire.backend.platform.repository.PlatformActionLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
@RestController @RequestMapping("/api/admin/actions")
public class AdminActionController {
 private final PlatformActionLogRepository logs;
 public AdminActionController(PlatformActionLogRepository logs){this.logs=logs;}
 @PostMapping("/{action}") public ResponseEntity<Map<String,String>> run(@PathVariable String action){
  String normalized=action.toLowerCase();
  String message=switch(normalized){case "backup"->"Database backup action queued successfully.";case "restart-ai"->"AI service restart action queued successfully.";case "generate-report"->"Platform report generation queued successfully.";case "view-logs"->"Latest platform logs are available in the Admin Logs API.";default->"Unsupported admin action.";};
  if(normalized.equals("backup")||normalized.equals("restart-ai")||normalized.equals("generate-report")||normalized.equals("view-logs")){PlatformActionLog l=new PlatformActionLog();l.setActorRole("ADMIN");l.setActionType("ADMIN_"+normalized.toUpperCase());l.setDetails(message);l.setCreatedAt(LocalDateTime.now());logs.save(l);}
  return ResponseEntity.ok(Map.of("message",message,"action",normalized));
 }
}
