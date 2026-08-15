require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const keys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7
];

async function listModelsForKey(index, apiKey) {
  console.log("\n======================================================");
  console.log(`API KEY ${index + 1}`);
  console.log("======================================================");

  if (!apiKey) {
    console.log("❌ Not configured.");
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const pager = await ai.models.list();

    let foundFlashLatest = false;
    let foundStableTTS = false;
    let foundPreviewTTS = false;

    const ttsModels = [];

    for await (const model of pager) {
      const name = model.name;

      if (name.includes("gemini-flash-latest")) {
        foundFlashLatest = true;
      }

      if (name.includes("gemini-3.1-flash-tts")) {
        foundStableTTS = true;
      }

      if (name.includes("gemini-3.1-flash-tts-preview")) {
        foundPreviewTTS = true;
      }

      if (name.toLowerCase().includes("tts")) {
        ttsModels.push(name);
      }
    }

    console.log("\nAvailable TTS Models:");

    if (ttsModels.length === 0) {
      console.log("  None");
    } else {
      ttsModels.forEach(model => {
        console.log("  • " + model);
      });
    }

    console.log("\n---------------- SUMMARY ----------------");
    console.log(
      "gemini-flash-latest            :",
      foundFlashLatest ? "✅ AVAILABLE" : "❌ NOT FOUND"
    );

    console.log(
      "gemini-3.1-flash-tts           :",
      foundStableTTS ? "✅ AVAILABLE" : "❌ NOT FOUND"
    );

    console.log(
      "gemini-3.1-flash-tts-preview   :",
      foundPreviewTTS ? "✅ AVAILABLE" : "❌ NOT FOUND"
    );

  } catch (err) {
    console.log("❌ FAILED");
    console.log(err.message);
  }
}

async function main() {
  console.log("\n");
  console.log("======================================================");
  console.log("        GEMINI MODEL AVAILABILITY CHECK");
  console.log("======================================================");

  for (let i = 0; i < keys.length; i++) {
    await listModelsForKey(i, keys[i]);
  }

  console.log("\n======================================================");
  console.log("Completed.");
  console.log("======================================================");
}

main();