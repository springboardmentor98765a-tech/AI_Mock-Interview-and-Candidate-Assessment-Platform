/**
 * Copy MediaPipe's WASM runtime out of node_modules and into public/.
 *
 * MediaPipe resolves its WASM from a base URL at runtime, and that URL has to
 * be a real directory this app serves. Pointing it at a CDN would mean the app
 * stops working offline and a third party sees a request every time a
 * candidate turns their camera on.
 *
 * ONNX Runtime (the expression model) deliberately does NOT go through here —
 * the bundler owns its runtime. See the note in vite.config.js.
 *
 * Copied rather than committed: ~35MB of binary has no business in the
 * repository when `npm install` reproduces it exactly. public/models/wasm is
 * gitignored for that reason; the model files beside it ARE committed, because
 * nothing can regenerate those.
 *
 * Runs automatically before `npm run dev` and `npm run build`.
 */

import { access, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

async function present(path, label) {
  try {
    await access(path);
    return true;
  } catch {
    console.error(`[${label}] ${path} is missing — run \`npm install\` first.`);
    process.exit(1);
  }
}

// --- MediaPipe: the whole wasm directory ---
const mediapipe = resolve(here, '../node_modules/@mediapipe/tasks-vision/wasm');
const mediapipeOut = resolve(here, '../public/models/wasm');
await present(mediapipe, 'mediapipe');
await mkdir(mediapipeOut, { recursive: true });
await cp(mediapipe, mediapipeOut, { recursive: true });
console.log('[mediapipe] wasm runtime copied to public/models/wasm');
