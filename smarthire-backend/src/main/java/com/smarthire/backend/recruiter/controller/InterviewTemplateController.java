package com.smarthire.backend.recruiter.controller;

import com.smarthire.backend.recruiter.dto.InterviewTemplateRequest;
import com.smarthire.backend.recruiter.entity.InterviewTemplate;
import com.smarthire.backend.recruiter.repository.InterviewTemplateRepository;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recruiter/templates")
public class InterviewTemplateController {
    private final InterviewTemplateRepository repository; private final UserRepository users;
    public InterviewTemplateController(InterviewTemplateRepository repository, UserRepository users){this.repository=repository;this.users=users;}
    @GetMapping public List<InterviewTemplate> list(Authentication auth){return repository.findByRecruiterIdOrderByCreatedAtDesc(currentRecruiter(auth));}
    @PostMapping public ResponseEntity<?> create(@RequestBody InterviewTemplateRequest req, Authentication auth){
        if(req.getName()==null||req.getName().isBlank()) return ResponseEntity.badRequest().body(java.util.Map.of("message","Template name is required"));
        InterviewTemplate t=new InterviewTemplate(); t.setRecruiterId(currentRecruiter(auth)); t.setName(req.getName().trim()); t.setJobRole(req.getJobRole()); t.setInterviewType(req.getInterviewType()); t.setDifficulty(req.getDifficulty()); t.setQuestionCount(req.getQuestionCount()==null?10:Math.max(1,Math.min(50,req.getQuestionCount()))); t.setInstructions(req.getInstructions());
        return ResponseEntity.ok(repository.save(t));
    }
    @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id,@RequestBody InterviewTemplateRequest req,Authentication auth){
        return repository.findById(id).filter(t->t.getRecruiterId().equals(currentRecruiter(auth))).map(t->{if(req.getName()!=null&&!req.getName().isBlank())t.setName(req.getName().trim());t.setJobRole(req.getJobRole());t.setInterviewType(req.getInterviewType());t.setDifficulty(req.getDifficulty());t.setInstructions(req.getInstructions());if(req.getQuestionCount()!=null)t.setQuestionCount(Math.max(1,Math.min(50,req.getQuestionCount())));return ResponseEntity.ok(repository.save(t));}).orElseGet(()->ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> delete(@PathVariable Long id,Authentication auth){return repository.findById(id).filter(t->t.getRecruiterId().equals(currentRecruiter(auth))).map(t->{repository.delete(t);return ResponseEntity.ok(java.util.Map.of("message","Template deleted"));}).orElseGet(()->ResponseEntity.notFound().build());}
    private Long currentRecruiter(Authentication a){return users.findByEmail(a.getName()).filter(u->"recruiter".equalsIgnoreCase(u.getRole())||"admin".equalsIgnoreCase(u.getRole())).orElseThrow().getId();}
}
