#!/usr/bin/env node
/**
 * Brand image generation via Nano Banana Pro (Gemini 3 Pro Image).
 * Leger des Heils rooster-demo (Paraat). Warme documentaire beelden.
 *
 * Usage:
 *   npm run generate:images
 *   npm run generate:images -- --force
 *   npm run generate:images -- --only=<name>
 *
 * Requires GEMINI_API_KEY (in ~/.zshrc shell-env of lokale .env).
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "images", "ldh", "generated");

if (!process.env.GEMINI_API_KEY) {
  console.error("\x1b[31m✗ GEMINI_API_KEY is not set.\x1b[0m  Add to ~/.zshrc: export GEMINI_API_KEY=AIza...");
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * BRAND: warme documentaire signatuur. Mensen candid, geen geposeerde gezichten.
 * Geen logo's of merktekens (de LdH-vlag/het schild nooit door AI laten verzinnen).
 */
const BRAND = [
  "Photorealistic warm documentary photography of community and volunteer work, in the spirit of a Dutch social-care charity.",
  "Visual language: candid, human, hopeful, unposed and natural; soft window light or warm indoor light;",
  "muted warm tones with occasional deep red accents in details such as aprons.",
  "People are shown candidly, mostly from the side or behind, with hands and gestures over posed faces.",
  "Social-impact reportage finish.",
  "No text, no logos, no watermarks, no brand marks, no flags, no signage.",
  "Shot on a 35mm documentary lens, natural depth of field. Aspect ratio 16:9 (wide landscape).",
].join(" ");

const IMAGES = [
  {
    name: "hero-home",
    prompt:
      "Wide cinematic documentary frame, low-key and warm. Inside a welcoming community hall during a shared meal: a couple of volunteers in deep red aprons serving soup and bread at a long wooden table while people gather warmly. " +
      "Seen slightly from behind and to the side so faces stay soft and candid, never posed. Warm late-afternoon light through tall windows, gentle shadows, deliberately darker tones toward the edges and foreground to leave room for a text overlay. " +
      "Muted warm palette with deep red apron accents. Hopeful, human, unstaged.",
  },
  {
    name: "sfeer-helpen",
    prompt:
      "Wide documentary frame. A close, warm shot of careful hands sorting and folding donated clothing into neat stacks on a wooden table at a community clothing bank. " +
      "Soft natural side light, a few deep red garments among muted warm tones. Candid, no faces in view, the focus on the hands and the sense of order being made. Quiet, dignified, hopeful.",
  },
  {
    name: "sfeer-samen",
    prompt:
      "Wide documentary frame. Two people sharing coffee and a quiet conversation at a small table in a neighbourhood drop-in room, seen from the side in soft focus so faces are not the subject. " +
      "Warm window light, a thermos and simple ceramic mugs on the table, a deep red detail blurred in the background. Calm, human, welcoming and unposed.",
  },
];

const filtered = ONLY ? IMAGES.filter((i) => i.name === ONLY) : IMAGES;
if (ONLY && filtered.length === 0) {
  console.error(`\x1b[31m✗ No image named "${ONLY}".\x1b[0m`);
  IMAGES.forEach((i) => console.error(`    ${i.name}`));
  process.exit(1);
}

async function generateOne({ name, prompt }) {
  const outPath = path.join(OUTPUT_DIR, `${name}.png`);
  if (fs.existsSync(outPath) && !FORCE) { console.log(`\x1b[90m✓ skip (exists): ${name}.png\x1b[0m`); return { name, status: "skip" }; }
  console.log(`\x1b[36m→ generating: ${name}\x1b[0m`);
  const t0 = Date.now();
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-pro-image-preview", contents: `${BRAND}\n\n${prompt}` });
    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) { console.warn(`\x1b[33m  ! no image data for ${name}\x1b[0m`); return { name, status: "empty" }; }
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync(outPath, buffer);
    console.log(`\x1b[32m✓ saved: ${name}.png  (${(buffer.length/1024).toFixed(0)} KB, ${((Date.now()-t0)/1000).toFixed(1)}s)\x1b[0m`);
    return { name, status: "ok" };
  } catch (err) {
    console.error(`\x1b[31m✗ failed: ${name}  →  ${err.message}\x1b[0m`);
    return { name, status: "error" };
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`\nGenerating ${filtered.length} image(s) into ${path.relative(PROJECT_ROOT, OUTPUT_DIR)}/\n`);
  const results = [];
  for (const img of filtered) results.push(await generateOne(img));
  const ok = results.filter((r) => r.status === "ok").length;
  const fail = results.filter((r) => r.status !== "ok" && r.status !== "skip").length;
  console.log(`\n\x1b[1mDone:\x1b[0m ${ok} generated, ${fail} failed.\n`);
  if (fail > 0) process.exit(1);
}

main();
