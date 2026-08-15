require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const MODEL = "gemini-flash-latest";

const keys = [
  process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
];

async function testKey(index, apiKey) {
  if (!apiKey) {
    console.log(`Key ${index + 1}: NOT CONFIGURED\n`);
    return;
  }

  process.stdout.write(`Testing Key ${index + 1}... `);

  try {
    const ai = new GoogleGenAI({ apiKey });

    await ai.models.generateContent({
      model: MODEL,
      contents: "Reply with exactly OK"
    });

    console.log("✅ WORKING");
  } catch (err) {

    const status = err.status || err.statusCode || "Unknown";
    const message = String(err.message || "");

    if (status === 429) {
      console.log("🟡 429 QUOTA EXCEEDED");
    }
    else if (status === 503) {
      console.log("🟠 503 HIGH DEMAND");
    }
    else if (status === 403) {
      console.log("🔴 403 PERMISSION DENIED");
    }
    else if (status === 404) {
      console.log("🔴 404 MODEL NOT FOUND");
    }
    else {
      console.log(`⚪ ${status} ${message}`);
    }
  }
}

async function main() {

  console.log("\n======================================");
  console.log(" GEMINI API KEY HEALTH CHECK");
  console.log("======================================\n");

  for (let i = 0; i < keys.length; i++) {
    await testKey(i, keys[i]);
  }

  console.log("\n======================================");
  console.log("Done.");
  console.log("======================================");
}

main();