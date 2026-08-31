package com.smarthire.backend.interview.proctoring;

import com.smarthire.backend.interview.entity.InterviewSession;
import com.smarthire.backend.interview.entity.SessionStatus;
import com.smarthire.backend.interview.repository.InterviewSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProctoringServiceTest {
    @Mock InterviewSessionRepository sessions;
    @Mock ProctoringViolationRepository violations;
    @InjectMocks ProctoringService service;

    @Test
    void threeViolationsTerminateSession() {
        InterviewSession session = new InterviewSession(1L, 99L, 3, 900);
        session.setId(7L); session.setStatus(SessionStatus.IN_PROGRESS);
        when(sessions.findById(7L)).thenReturn(Optional.of(session));
        when(sessions.save(any(InterviewSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(violations.findBySessionIdOrderByDetectedAtAsc(7L)).thenReturn(java.util.List.of());
        when(violations.save(any(ProctoringViolation.class))).thenAnswer(inv -> inv.getArgument(0));

        ProctoringViolationRequest request = new ProctoringViolationRequest();
        request.setType("TAB_SWITCH");
        ProctoringStatusResponse s1 = service.record(7L, 99L, request);
        assertEquals(1, s1.getViolationCount());
        assertFalse(s1.isMalpracticeTerminated());

        ProctoringStatusResponse s2 = service.record(7L, 99L, request);
        assertEquals(2, s2.getViolationCount());
        assertFalse(s2.isMalpracticeTerminated());

        ProctoringStatusResponse s3 = service.record(7L, 99L, request);
        assertEquals(3, s3.getViolationCount());
        assertTrue(s3.isMalpracticeTerminated());
        assertEquals(SessionStatus.PROCTORING_TERMINATED, session.getStatus());
        assertEquals("Interview terminated after 3 proctoring violations.", session.getTerminatedReason());
    }
}
