require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY_1,
});

const models = [
  "gemini-flash-latest",
];

async function run() {
  for (const model of models) {
    console.log("\n==============================");
    console.log("Testing:", model);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Reply with OK only."
      });

      console.log("SUCCESS");
      console.log(response.text);
    } catch (err) {
      console.log("FAILED");
      console.log(err.message);
    }
  }
}

run();