import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import Anthropic from '@anthropic-ai/sdk';
import db from './db.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// משתמשים ב-/tmp לכתיבה בענן
const CACHE_DIR = '/tmp/barsuf_data/ai_cache';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const VECTOR_DB_PATH = path.join(CACHE_DIR, 'vector_db.json');

const updateLiveStatus = (tenderId, statusMsg) => {
  try {
    if (tenderId) {
      db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run(statusMsg, tenderId);
    }
  } catch (e) { console.error('Status update failed:', e); }
};

const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  return { genAI: new GoogleGenerativeAI(apiKey), fileManager: new GoogleAIFileManager(apiKey) };
};

async function getEmbeddings(text) {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (e) { return null; }
}

const vectorStore = {
  data: fs.existsSync(VECTOR_DB_PATH) ? JSON.parse(fs.readFileSync(VECTOR_DB_PATH)) : [],
  async addText(text, embedding, metadata) {
    this.data.push({ text, embedding, metadata });
    fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(this.data));
  },
  async search(queryEmbedding, limit = 5) {
    if (!queryEmbedding) return [];
    const results = this.data.map(item => {
      const dotProduct = item.embedding.reduce((sum, val, i) => sum + val * queryEmbedding[i], 0);
      const mag1 = Math.sqrt(item.embedding.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
      return { ...item, score: dotProduct / (mag1 * mag2) };
    });
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
};

export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients();
    await fileManager.uploadFile(filePath, { mimeType, displayName: `Project ${projectId}` });
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(fs.readFileSync(filePath));
      const chunks = data.text.match(/[\s\S]{1,1000}/g) || [];
      for (const chunk of chunks) {
        const embedding = await getEmbeddings(chunk);
        if (embedding) await vectorStore.addText(chunk, embedding, { projectId });
      }
    }
    return true;
  } catch (e) { console.error('Ingest failed:', e); return false; }
};

export const analyzeTender = async (filePath, tenderId) => {
  updateLiveStatus(tenderId, "מעלה קובץ לשרתי ה-AI...");
  try {
    const { genAI, fileManager } = getGeminiClients();
    const upload = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "Tender" });
    
    updateLiveStatus(tenderId, "ממתין לעיבוד המסמך...");
    let file = await fileManager.getFile(upload.file.name);
    while (file.state === "PROCESSING") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await fileManager.getFile(upload.file.name);
    }

    updateLiveStatus(tenderId, "סורק סעיפי מכרז, תנאי סף וקנסות...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent([
      { fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, 
      { text: "נתח את המכרז לעומק בעברית. כלול סעיפים של תנאי סף, לוחות זמנים, וקנסות. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE] כאשר XX הוא מספר מ-1 עד 100 המייצג את רמת הוודאות שלך בניתוח." }
    ]);
    updateLiveStatus(tenderId, "ניתוח הושלם");
    return result.response.text();
  } catch (err) {
    console.warn("Gemini failed, falling back to Claude for analyzeTender:", err);
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      updateLiveStatus(tenderId, "קורא טקסט מה-PDF (Claude fallback)...");
      const pdfText = (await pdfParse(fs.readFileSync(filePath))).text;
      updateLiveStatus(tenderId, "מנתח מכרז באמצעות Claude...");
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: `נתח את המכרז הבא לעומק בעברית. כלול סעיפים של תנאי סף, לוחות זמנים, וקנסות. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE].\n\nהמכרז:\n${pdfText}` }]
      });
      updateLiveStatus(tenderId, "ניתוח הושלם (באמצעות Claude)");
      return response.content[0].text;
    } catch (claudeErr) {
      console.error("Both Gemini and Claude failed:", claudeErr);
      throw claudeErr;
    }
  }
};

export const generateProposal = async (filePath, tenderId) => {
  updateLiveStatus(tenderId, "מתחבר למאגר המחירים ההיסטורי...");
  try {
    const { genAI, fileManager } = getGeminiClients();
    const upload = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "TenderForProposal" });
    
    updateLiveStatus(tenderId, "מנתח כמויות וסעיפים מול ההיסטוריה...");
    let file = await fileManager.getFile(upload.file.name);
    while (file.state === "PROCESSING") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await fileManager.getFile(upload.file.name);
    }

    const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה");
    const matches = await vectorStore.search(queryEmbedding, 10);
    const context = matches.map(m => m.text).join('\n---\n');
    
    updateLiveStatus(tenderId, "בונה כתב כמויות (BoQ) ומחשב מחיר מטרה...");
    const prompt = `הכן הצעת מחיר עבור המכרז המצורף על בסיס היסטוריית המחירים שלנו: ${context}. ענה בעברית. חובה לסיים את ההצעה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE]. בנוסף, חובה לכלול בלוק JSON המייצג כתב כמויות (BoQ) במבנה הבא:
\`\`\`json
[
  { "id": 1, "section": "שם סעיף", "item": "תיאור", "quantity": 100, "unit": "יחידה", "unitPrice": 150 }
]
\`\`\``;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent([
      { fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } },
      { text: prompt }
    ]);
    updateLiveStatus(tenderId, "הצעה מוכנה");
    
    const text = result.response.text();
    let boq_json = null;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try { boq_json = jsonMatch[1].trim(); } catch (e) {}
    }
    return { proposal: text.replace(jsonMatch?.[0] || '', '').trim(), boq_json };
  } catch (err) {
    console.warn("Gemini failed, falling back to Claude for generateProposal:", err);
    try {
      updateLiveStatus(tenderId, "מחלץ נתונים ל-Claude...");
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const pdfText = (await pdfParse(fs.readFileSync(filePath))).text;
      updateLiveStatus(tenderId, "מייצר הצעה באמצעות Claude...");
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: `${prompt}\n\nהמכרז:\n${pdfText}` }]
      });
      updateLiveStatus(tenderId, "הצעה מוכנה (באמצעות Claude)");
      
      const text = response.content[0].text;
      let boq_json = null;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try { boq_json = jsonMatch[1].trim(); } catch (e) {}
      }
      return { proposal: text.replace(jsonMatch?.[0] || '', '').trim(), boq_json };
    } catch (claudeErr) {
      console.error("Both Gemini and Claude failed for proposal:", claudeErr);
      throw claudeErr;
    }
  }
};

export const askQuestion = async (projectId, question) => {
  const queryEmbedding = await getEmbeddings(question);
  const matches = await vectorStore.search(queryEmbedding, 5);
  const context = matches.map(m => m.text).join('\n---\n');
  
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`ענה על: ${question}. הקשר: ${context}. ענה בעברית. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE] המייצגת את רמת הוודאות שלך בתשובה (מ-1 עד 100).`);
    return result.response.text();
  } catch (err) {
    console.warn("Gemini failed, falling back to Claude for askQuestion:", err);
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{ role: "user", content: `ענה על: ${question}. הקשר: ${context}. ענה בעברית. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE] המייצגת את רמת הוודאות שלך בתשובה (מ-1 עד 100).` }]
      });
      return response.content[0].text;
    } catch (claudeErr) {
      throw claudeErr;
    }
  }
};

export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    const upload = await fileManager.uploadFile(filePath, { mimeType, displayName: "Receipt" });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: "חלץ נתוני קבלה ל-JSON. חובה לכלול בשדה 'confidence' מספר מ-1 עד 100." }]);
    return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("Receipt analysis failed:", e);
    return { error: "Failed to analyze receipt" };
  }
};
