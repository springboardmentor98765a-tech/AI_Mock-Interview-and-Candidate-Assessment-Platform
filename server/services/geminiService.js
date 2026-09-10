import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ==========================================
// Resume Analysis
// ==========================================
export const analyzeResumeWithAI = async (resumeText) => {

    const prompt = `
You are an expert Resume Analyzer.

Analyze the resume and return ONLY valid JSON.

{
  "skills":[
    "..."
  ],

  "experience":"...",

  "technologies":[
    "..."
  ],

  "education":{

      "degree":"...",

      "college":"...",

      "year":"..."

  },

  "summary":"..."
}

Resume:

${resumeText}
`;

    try {

        const response = await ai.models.generateContent({

            model: "gemini-3.5-flash-lite",

            contents: prompt

        });

        const text =
            response.candidates[0].content.parts[0].text;

        return text;

    }

    catch (error) {

        console.error(error);

        throw error;

    }

};
// ==========================================
// Module 5 - Communication Analysis
// ==========================================

export const analyzeCommunicationWithAI = async (
    transcript,
    timeSpent = 0
) => {

    const prompt = `
You are an expert interview communication evaluator.

Analyze the candidate's spoken interview answer.

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations outside JSON.

Analyze:

1. Grammar correctness
2. Filler words
3. Communication quality

Use these common filler words:

um, uh, hmm, like, you know, actually, basically,
literally, so, well, I mean, kind of, sort of

Return exactly this JSON structure:

{
    "grammar_score": 0,
    "filler_word_count": 0,
    "filler_words": [],
    "grammar_feedback": "",
    "communication_feedback": ""
}

Rules:

- grammar_score must be between 0 and 100.
- filler_word_count must be the total number of filler-word occurrences.
- filler_words must contain the detected filler words.
- grammar_feedback should briefly explain grammar quality.
- communication_feedback should briefly describe the candidate's communication quality.
- Do not invent filler words that are not present.
- Analyze only the provided transcript.

Candidate transcript:

${transcript}
`;

    try {

        const response =
            await ai.models.generateContent({

                model: "gemini-3.5-flash-lite",

                contents: prompt

            });

        const text =
            response.candidates[0]
                .content.parts[0]
                .text;

        const cleanedText =
            text
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

        const analysis =
            JSON.parse(cleanedText);


        // ==========================================
        // SPEECH PACE ANALYSIS
        // ==========================================

        const words =
            transcript
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        const wordCount =
            words.length;


        let speechRate = 0;

        if (timeSpent > 0) {

            speechRate =
                Math.round(
                    (
                        wordCount /
                        (timeSpent / 60)
                    ) * 100
                ) / 100;

        }


        // ==========================================
        // SPEECH RATE CATEGORY
        // ==========================================

        let speechRateCategory =
            "NORMAL";

        if (speechRate < 100) {

            speechRateCategory =
                "SLOW";

        }
        else if (speechRate > 160) {

            speechRateCategory =
                "FAST";

        }


        // ==========================================
        // COMMUNICATION SCORE
        // ==========================================

        const grammarScore =
            Number(
                analysis.grammar_score
            ) || 0;


        const fillerCount =
            Number(
                analysis.filler_word_count
            ) || 0;


        const fillerPenalty =
            Math.min(
                fillerCount * 2,
                20
            );


        let paceScore = 100;

        if (
            speechRate > 0 &&
            (
                speechRate < 80 ||
                speechRate > 180
            )
        ) {

            paceScore = 60;

        }
        else if (
            speechRate > 0 &&
            (
                speechRate < 100 ||
                speechRate > 160
            )
        ) {

            paceScore = 80;

        }


        const communicationScore =
            Math.round(
                (
                    grammarScore +
                    (100 - fillerPenalty) +
                    paceScore
                ) / 3
            );


        // ==========================================
        // RETURN COMPLETE ANALYSIS
        // ==========================================

        return {

            ...analysis,

            word_count:
                wordCount,

            speech_rate:
                speechRate,

            speech_rate_category:
                speechRateCategory,

            pronunciation_score:
                0,

            communication_score:
                communicationScore

        };

    }
    catch (error) {

        console.error(
            "Communication Analysis Error:",
            error
        );

        throw error;

    }

};
// ==========================================
// Module 7 - Technical Relevance Analysis
// ==========================================

export const analyzeTechnicalRelevanceWithAI = async (
    question,
    answer
) => {

    const prompt = `
You are an expert technical interview evaluator.

Evaluate the candidate's answer to the technical interview question.

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations outside JSON.

Evaluate:

1. Technical correctness
2. Relevance to the question
3. Understanding of the concept
4. Completeness of the answer
5. Problem-solving / reasoning quality

Return exactly this JSON structure:

{
    "technical_score": 0,
    "technical_feedback": "",
    "strengths": [],
    "weaknesses": []
}

Rules:

- technical_score must be between 0 and 100.
- Give a high score only when the answer is technically correct and relevant.
- Give a low score when the answer is incorrect, vague, or unrelated.
- Do not judge grammar or communication style.
- Evaluate only the provided question and answer.
- Do not invent information that is not present in the candidate's answer.

Interview Question:
${question}

Candidate Answer:
${answer}
`;

    try {

        const response =
            await ai.models.generateContent({

                model: "gemini-3.5-flash-lite",

                contents: prompt

            });

        const text =
            response.candidates[0]
                .content.parts[0]
                .text;

        const cleanedText =
            text
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

        const analysis =
            JSON.parse(cleanedText);

        return {

            technical_score:
                Math.min(
                    Math.max(
                        Number(
                            analysis.technical_score
                        ) || 0,
                        0
                    ),
                    100
                ),

            technical_feedback:
                analysis.technical_feedback || "",

            strengths:
                Array.isArray(
                    analysis.strengths
                )
                    ? analysis.strengths
                    : [],

            weaknesses:
                Array.isArray(
                    analysis.weaknesses
                )
                    ? analysis.weaknesses
                    : []

        };

    }
    catch (error) {

        console.error(
            "Technical Relevance Analysis Error:",
            error
        );

        throw error;

    }

};
// ==========================================
// Module 8 - Skill Classification
// ==========================================

export const classifyInterviewSkillWithAI = async (
    question
) => {

    const prompt = `
You are an expert interview skill classifier.

Identify the primary skill or competency being tested by the interview question.

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations outside JSON.

Return exactly this JSON structure:

{
    "skill": "",
    "category": ""
}

Rules:

- "skill" must contain the main skill being tested.
- "category" must be one of:
  "Technical",
  "Problem Solving",
  "Communication",
  "Leadership",
  "Behavioral",
  "General"
- Keep the skill name short and clear.
- Examples of skills:
  Java, Python, SQL, C++, MERN Stack, AI/ML,
  Data Structures, Algorithms, Problem Solving,
  Communication, Leadership, Teamwork.
- Choose the most relevant primary skill.
- Do not invent a specific technology unless the question clearly indicates it.
- Analyze only the provided interview question.

Interview Question:
${question}
`;

    try {

        const response =
            await ai.models.generateContent({

                model: "gemini-3.5-flash-lite",

                contents: prompt

            });

        const text =
            response.candidates[0]
                .content.parts[0]
                .text;

        const cleanedText =
            text
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

        const analysis =
            JSON.parse(cleanedText);

        return {

            skill:
                analysis.skill || "General",

            category:
                analysis.category || "General"

        };

    }
    catch (error) {

        console.error(
            "Skill Classification Error:",
            error
        );

        return {
            skill: "General",
            category: "General"
        };

    }

};