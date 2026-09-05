# SmartHire AI — Module 7 Implementation

Module 7 adds a rubric-driven AI Feedback & Scoring layer while preserving the existing Python CNN emotion service, MediaPipe eye tracking, speech analysis, Gemini integration, persistence, and Module 6 proctoring.

## Scoring model

Overall Score = Communication × 30% + Confidence × 25% + Technical Relevance × 30% + Professionalism × 15%.

Confidence explicitly consumes five parameters: eye-contact consistency, facial engagement, response hesitation, speaking confidence, and attention level.

Professionalism exposes time management, response organization, professional communication, and interview etiquette.

## Feedback outputs

The evaluation response and database persist: Strengths, Weaknesses, Improvement Suggestions, Practice Recommendations, and Learning Resources. The detailed report now renders each category and all Module 7 sub-scores.

## Existing AI preserved

The Python custom CNN emotion detection service under `ai-services/emotion-cnn-service/` is preserved and remains the facial/emotion signal provider. No CNN replacement is introduced by Module 7.

## Database migration

`section6-schema-repair.sql` contains idempotent additions for the new Module 7 columns so an existing PostgreSQL database can upgrade safely with Hibernate `ddl-auto=update`.

## Verification

Frontend inline JavaScript syntax was checked successfully with Node.js. Full Maven test execution could not be completed in this environment because the Maven wrapper could not download Maven 3.9.12 from Maven Central.

## Actionable feedback enhancement

The evaluation flow now enriches Gemini feedback with score-grounded Module 7 feedback for each measurable parameter. Low scores produce an explicit weakness, a concrete improvement action, a targeted practice task, and a named learning resource. Strong scores produce evidence-based strengths. Feedback is capped to keep the report readable while preserving the highest-priority items.

The report shows the exact performance-rating band and weighted overall-score formula. Learning-resource URLs are rendered as clickable links in the report UI.

Rating boundaries are authoritative everywhere: 90–100 Excellent, 75–89 Good, 60–74 Average, 40–59 Needs Improvement, below 40 Poor.
