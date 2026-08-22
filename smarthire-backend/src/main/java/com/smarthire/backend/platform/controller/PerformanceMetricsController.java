package com.smarthire.backend.platform.controller;

import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import com.smarthire.backend.platform.dto.PerformanceMetricsResponse;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class PerformanceMetricsController {
    private final UserRepository users; private final ResumeRepository resumes; private final InterviewRepository interviews; private final InterviewEvaluationRepository evaluations;
    public PerformanceMetricsController(UserRepository users, ResumeRepository resumes, InterviewRepository interviews, InterviewEvaluationRepository evaluations){this.users=users;this.resumes=resumes;this.interviews=interviews;this.evaluations=evaluations;}
    @GetMapping("/api/analytics/performance")
    public PerformanceMetricsResponse performance(){
        List<Interview> sessions=interviews.findAll();
        List<InterviewEvaluation> scored=sessions.stream().map(i->evaluations.findByInterviewId(i.getId()).orElse(null)).filter(x->x!=null).toList();
        PerformanceMetricsResponse r=new PerformanceMetricsResponse();
        r.setTotalUsers(users.count()); r.setTotalResumes(resumes.count()); r.setTotalInterviews(sessions.size()); r.setEvaluatedInterviews(scored.size());
        r.setEvaluationCoveragePercent(sessions.isEmpty()?0:round(scored.size()*100.0/sessions.size()));
        r.setAverageOverallScore(avg(scored,0)); r.setAverageCommunicationScore(avg(scored,1)); r.setAverageConfidenceScore(avg(scored,2)); r.setAverageTechnicalScore(avg(scored,3)); r.setAverageProfessionalismScore(avg(scored,4)); r.setAveragePronunciationScore(avg(scored,5));
        Map<String,String> b=new LinkedHashMap<>();
        b.put("speechTranscriptionAccuracy","Runtime confidence available when Whisper/browser confidence is captured; no labeled-dataset accuracy claim.");
        b.put("emotionRecognitionAccuracy","Runtime DeepFace confidence is captured; formal validation dataset benchmark not claimed.");
        b.put("eyeContactAccuracy","MediaPipe gaze/landmark proxy is captured; formal benchmark not claimed.");
        b.put("communicationScoringAccuracy","Weighted rubric is deterministic and stored; human-labeled benchmark not claimed.");
        b.put("technicalRelevance","Gemini evaluation plus deterministic fallback is stored per interview.");
        b.put("concurrency","Database-backed stateless API/session model; load test should be run before production.");
        b.put("apiHealth","Use /api/health for runtime service configuration status.");
        r.setBenchmarkStatus(b);
        return r;
    }
    private double avg(List<InterviewEvaluation> list,int mode){ if(list.isEmpty()) return 0; return round(list.stream().mapToInt(x -> switch(mode){case 0->x.getOverallScore();case 1->n(x.getCommunicationScore());case 2->n(x.getConfidenceScore());case 3->x.getTechnicalScore();case 4->n(x.getProfessionalismScore());default->n(x.getPronunciationScore());}).average().orElse(0)); }
    private int n(Integer v){return v==null?0:v;} private double round(double v){return Math.round(v*10.0)/10.0;}
}
