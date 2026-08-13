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