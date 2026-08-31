package com.smarthire.backend.interview.proctoring;
import com.smarthire.backend.entity.User; import com.smarthire.backend.interview.exception.InterviewSessionAccessDeniedException; import com.smarthire.backend.repository.UserRepository; import org.springframework.http.ResponseEntity; import org.springframework.security.core.Authentication; import org.springframework.security.core.context.SecurityContextHolder; import org.springframework.security.core.userdetails.UserDetails; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/interview-sessions/{sessionId}/proctoring") @CrossOrigin("*")
public class ProctoringController {
 private final ProctoringService service; private final UserRepository users;
 public ProctoringController(ProctoringService service, UserRepository users){this.service=service;this.users=users;}
 @PostMapping("/violation") public ResponseEntity<ProctoringStatusResponse> record(@PathVariable Long sessionId,@RequestBody ProctoringViolationRequest req){return ResponseEntity.ok(service.record(sessionId,currentUserId(),req));}
 @GetMapping public ResponseEntity<ProctoringStatusResponse> status(@PathVariable Long sessionId){return ResponseEntity.ok(service.getStatus(sessionId,currentUserId()));}
 @GetMapping("/events") public ResponseEntity<?> events(@PathVariable Long sessionId){return ResponseEntity.ok(service.list(sessionId,currentUserId()));}
 private Long currentUserId(){Authentication a=SecurityContextHolder.getContext().getAuthentication(); if(a==null||!a.isAuthenticated())throw new InterviewSessionAccessDeniedException("Authentication is required."); Object p=a.getPrincipal();String e=p instanceof UserDetails?((UserDetails)p).getUsername():String.valueOf(p);return users.findByEmail(e).map(User::getId).orElseThrow(()->new InterviewSessionAccessDeniedException("Authenticated user not found."));}
}
