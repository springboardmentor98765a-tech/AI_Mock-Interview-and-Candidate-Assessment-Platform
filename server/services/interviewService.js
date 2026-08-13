import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const generateInterviewQuestions = async (
    type,
    difficulty,
    domain,
    skills
) => {

    const prompt = `
You are an expert interviewer.

Candidate Skills:
${skills}

Interview Type:
${type}

Difficulty:
${difficulty}

Domain:
${domain}

Generate exactly 10 interview questions.

Rules:

- If type = HR → Generate HR questions.
- If type = Technical → Generate technical questions related to ${domain}.
- If type = Behavioral → Generate behavioral questions.
- If type = Aptitude → Generate aptitude questions.

Return ONLY valid JSON.

{
    "questions":[
        "...",
        "...",
        "...",
        "...",
        "...",
        "...",
        "...",
        "...",
        "...",
        "..."
    ]
}
`;

    const response = await ai.models.generateContent({

        model: "gemini-3.5-flash-lite",

        contents: prompt

    });

    return response.candidates[0].content.parts[0].text;

};