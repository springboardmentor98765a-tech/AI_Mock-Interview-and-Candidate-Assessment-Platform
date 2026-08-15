require("dotenv").config();

const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const MODEL = "gemini-3.1-flash-tts-preview";

function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const dataSize = pcmBuffer.length;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function main() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY_1
  });

  console.log("Testing:", MODEL);

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{
      role: "user",
      parts: [{
        text: "Hello Hemanth. Welcome to HireAI."
      }]
    }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore"
          }
        }
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];

  if (!part?.inlineData?.data) {
    throw new Error("No audio returned");
  }

  const mime = part.inlineData.mimeType;

  console.log("Mime:", mime);

  const rate =
    Number(mime.match(/rate=(\d+)/)?.[1] || 24000);

  const pcm = Buffer.from(part.inlineData.data, "base64");

  const wav = pcmToWav(
    pcm,
    rate,
    1,
    16
  );

  fs.writeFileSync("output.wav", wav);

  console.log("SUCCESS");
}

main().catch(err => {
  console.error(err);
});