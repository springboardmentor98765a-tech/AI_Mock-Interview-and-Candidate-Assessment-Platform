// backend\utils\geminiKeyManager.js

const { keys, MODEL_CONFIGS, getModelThreshold } = require('../config/geminiKeys');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const COUNTERS_FILE = path.join(DATA_DIR, 'gemini_counters.json');

let activeKeyIndex = {};
let requestCounters = {};
let exhaustedKeys = {};
let lastResetDate = '';

function getExhaustedSet(modelName) {
  if (!exhaustedKeys[modelName]) {
    exhaustedKeys[modelName] = new Set();
  }
  return exhaustedKeys[modelName];
}

function saveStateToDisk() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const payload = JSON.stringify({
    activeKeyIndex,
    requestCounters,
    lastResetDate
  }, null, 2);
  fs.writeFileSync(COUNTERS_FILE, payload, 'utf8');
}

function loadStateFromDisk() {
  const today = new Date().toISOString().split('T')[0];
  if (fs.existsSync(COUNTERS_FILE)) {
    try {
      const raw = fs.readFileSync(COUNTERS_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.lastResetDate !== today) {
        requestCounters = {};
        lastResetDate = today;
        activeKeyIndex = {};
        exhaustedKeys = {};
        saveStateToDisk();
      } else {
        activeKeyIndex = data.activeKeyIndex || {};
        requestCounters = data.requestCounters || {};
        lastResetDate = data.lastResetDate || today;
      }
    } catch (e) {
      requestCounters = {};
      lastResetDate = today;
      activeKeyIndex = {};
      exhaustedKeys = {};
      saveStateToDisk();
    }
  } else {
    requestCounters = {};
    lastResetDate = today;
    activeKeyIndex = {};
    exhaustedKeys = {};
    saveStateToDisk();
  }
}

loadStateFromDisk();

function getActiveKeyIndex(modelName) {
  if (activeKeyIndex[modelName] === undefined || activeKeyIndex[modelName] === null) {
    activeKeyIndex[modelName] = 0;
  }
  return activeKeyIndex[modelName];
}

function rotateKey(modelName, reason) {
  const oldIndex = getActiveKeyIndex(modelName);
  const exhausted = getExhaustedSet(modelName);
  let newIndex = oldIndex;
  for (let i = 1; i <= keys.length; i++) {
    const nextIdx = (oldIndex + i) % keys.length;
    if (!exhausted.has(nextIdx)) {
      newIndex = nextIdx;
      break;
    }
  }
  if (newIndex === oldIndex && keys.length > 1) {
    newIndex = (oldIndex + 1) % keys.length;
  }
  activeKeyIndex[modelName] = newIndex;
  saveStateToDisk();
  console.log(`[Gemini] Threshold/Quota reached for ${modelName} on Key #${oldIndex + 1}. Switching to Key #${newIndex + 1} (${reason})`);
  return newIndex;
}

function incrementRequestCount(keyIndex, modelName) {
  if (!requestCounters[keyIndex]) {
    requestCounters[keyIndex] = {};
  }
  const current = (requestCounters[keyIndex][modelName] || 0) + 1;
  requestCounters[keyIndex][modelName] = current;
  saveStateToDisk();
  const threshold = getModelThreshold(modelName);
  if (current >= threshold) {
    rotateKey(modelName, 'threshold_reached');
  }
  return current;
}

function getRequestCounters() {
  return requestCounters;
}

async function executeGeminiCall(modelName, callFn) {
  let lastError;

  for (let keyAttempt = 0; keyAttempt < keys.length; keyAttempt++) {
    const keyIndex = getActiveKeyIndex(modelName);
    let keyExhausted = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const client = new GoogleGenAI({
          apiKey: keys[keyIndex]
        });

        console.log("\n====================");
        console.log("Key Index :", keyIndex + 1);
        console.log("API Key   :", keys[keyIndex].substring(0, 20) + "...");
        console.log("Model     :", modelName);
        console.log("SDK       :", "@google/genai");
        console.log("====================\n");

        const result = await callFn(client);

        const requestCount = incrementRequestCount(keyIndex, modelName);
        const threshold = getModelThreshold(modelName);

        console.log(
          `[Gemini] Using Key #${keyIndex + 1} for ${modelName} (${requestCount}/${threshold} threshold)`
        );

        return result;

      } catch (err) {

        lastError = err;

        const message = String(err.message || "").toLowerCase();

        const is429 =
          err.status === 429 ||
          err.statusCode === 429 ||
          err.response?.status === 429 ||
          message.includes("429") ||
          message.includes("resource_exhausted") ||
          message.includes("quota");

        if (is429) {
          console.log("[Gemini] 429 quota exceeded.");

          getExhaustedSet(modelName).add(keyIndex);
          rotateKey(modelName, "429_quota_exhausted");

          keyExhausted = true;
          break;
        }

        const is503 =
          err.status === 503 ||
          err.statusCode === 503 ||
          err.response?.status === 503 ||
          message.includes("503") ||
          message.includes("unavailable") ||
          message.includes("high demand");

        if (is503) {
                
          console.log(
            "[Gemini] 503 High Demand. Rotating immediately..."
          );
        
          rotateKey(modelName, "503_high_demand");
        
          keyExhausted = true;
          break;
        }

        const isNetworkError =
          err.code === "UND_ERR_CONNECT_TIMEOUT" ||
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNRESET" ||
          err.code === "ECONNREFUSED" ||
          err.code === "ENOTFOUND" ||
          err.code === "EAI_AGAIN" ||
          message.includes("fetch failed") ||
          message.includes("timeout") ||
          message.includes("connect") ||
          message.includes("wsarecv") ||
          message.includes("tcp") ||
          err.name === "FetchError";

        if (isNetworkError) {

          console.log("\n========== NETWORK ERROR ==========");
          console.log("Code    :", err.code);
          console.log("Name    :", err.name);
          console.log("Status  :", err.status);
          console.log("Message :", err.message);
          console.log("Cause   :", err.cause);
          console.log("Stack   :");
          console.log(err.stack);
          console.log("===================================\n");
                
          if (attempt < 2) {
          
            console.log(
              `[Gemini] Network error. Retry ${attempt + 1}/3...`
            );
          
            await new Promise(resolve => setTimeout(resolve, 1000));
          
            continue;
          }
        
          console.log(
            "[Gemini] Network retries exhausted. Rotating key..."
          );
        
          rotateKey(modelName, "network_error");
        
          keyExhausted = true;
          break;
        }

        throw err;
      }
    }

    if (!keyExhausted) {
      break;
    }
  }

  throw (
    lastError ||
    new Error(`All Gemini API keys exhausted for ${modelName}`)
  );
}

module.exports = {
  executeGeminiCall,
  getActiveKeyIndex,
  getRequestCounters
};
