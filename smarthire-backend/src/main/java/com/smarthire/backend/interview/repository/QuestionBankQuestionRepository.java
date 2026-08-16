package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.QuestionBankQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionBankQuestionRepository extends JpaRepository<QuestionBankQuestion, Long> {

    List<QuestionBankQuestion> findTop10ByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndActiveTrueOrderByIdAsc(
            String jobRole, String interviewType, String difficulty);

    List<QuestionBankQuestion> findTop10ByInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndActiveTrueOrderByIdAsc(
            String interviewType, String difficulty);

    List<QuestionBankQuestion> findTop10ByDifficultyIgnoreCaseAndActiveTrueOrderByIdAsc(String difficulty);

    List<QuestionBankQuestion> findTop10ByActiveTrueOrderByIdAsc();

    List<QuestionBankQuestion> findTop10ByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
            String jobRole, String interviewType, String difficulty, String answerMode);

    List<QuestionBankQuestion> findByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
            String jobRole, String interviewType, String difficulty, String answerMode);

    List<QuestionBankQuestion> findByInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
            String interviewType, String difficulty, String answerMode);

    List<QuestionBankQuestion> findByAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(String answerMode);

    boolean existsByQuestionIgnoreCase(String question);

    Optional<QuestionBankQuestion> findByQuestionIgnoreCase(String question);
}
