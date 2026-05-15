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
  updateLiveStatus(tenderId, "סורק מכרז...");
  const { genAI, fileManager } = getGeminiClients();
  const upload = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "Tender" });
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const result = await model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: "נתח את המכרז לעומק בעברית." }]);
  updateLiveStatus(tenderId, "ניתוח הושלם");
  return result.response.text();
};

export const generateProposal = async (filePath, tenderId) => {
  updateLiveStatus(tenderId, "מכין הצעה...");
  const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה");
  const matches = await vectorStore.search(queryEmbedding, 10);
  const context = matches.map(m => m.text).join('\n---\n');
  const { genAI } = getGeminiClients();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const result = await model.generateContent(`הכן הצעת מחיר על בסיס ההיסטוריה: ${context}. ענה בעברית.`);
  updateLiveStatus(tenderId, "הצעה מוכנה");
  return result.response.text();
};

export const askQuestion = async (projectId, question) => {
  const queryEmbedding = await getEmbeddings(question);
  const matches = await vectorStore.search(queryEmbedding, 5);
  const context = matches.map(m => m.text).join('\n---\n');
  const { genAI } = getGeminiClients();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(`ענה על: ${question}. הקשר: ${context}. ענה בעברית.`);
  return result.response.text();
};

export const analyzeReceipt = async (filePath, mimeType) => {
  const { fileManager, genAI } = getGeminiClients();
  const upload = await fileManager.uploadFile(filePath, { mimeType, displayName: "Receipt" });
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: "חלץ נתוני קבלה ל-JSON." }]);
  return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
};
