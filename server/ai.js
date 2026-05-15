import fs from 'fs'; // כלי לקריאה וכתיבה של קבצים
import path from 'path'; // כלי לניהול נתיבי תיקיות
import { GoogleGenerativeAI } from '@google/generative-ai'; // החיבור למוח של גוגל (Gemini)
import { GoogleAIFileManager } from '@google-cloud/generative-ai/server'; // ניהול קבצים מול גוגל
import Anthropic from '@anthropic-ai/sdk'; // הגיבוי שלנו - Claude
import db from './db.js'; // חיבור למסד הנתונים של בארסוף
import pdf from 'pdf-parse'; // קריאת טקסט מקבצי PDF
import { VectorStorage } from 'vector-storage'; // מסד נתונים וקטורי לחיפוש סמנטי (משמעות)

// איפה שומרים את הזיכרון הזמני של ה-AI
const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// פונקציית עזר לעדכון סטטוס חי במסד הנתונים - כדי שהמשתמש יראה מה ברבור עושה עכשיו
const updateLiveStatus = (tenderId, statusMsg) => {
  try {
    if (tenderId) {
      db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run(statusMsg, tenderId);
      console.log(`[LIVE STATUS] Tender ${tenderId}: ${statusMsg}`);
    }
  } catch (e) { console.error('Failed to update live status:', e); }
};

// התחברות לגוגל
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('חסר מפתח GEMINI_API_KEY!');
  return {
    genAI: new GoogleGenerativeAI(apiKey),
    fileManager: new GoogleAIFileManager(apiKey)
  };
};

// התחברות לקלוד (גיבוי)
const getClaudeClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new Anthropic({ apiKey }) : null;
};

// זיכרון וקטורי לחיפוש סמנטי
const vectorStore = new VectorStorage({
  storagePath: path.join(CACHE_DIR, 'vector_db.json')
});

// הפיכת טקסט ל"וקטור משמעות"
async function getEmbeddings(text) {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) { return null; }
}

// לימוד מסמך והכנסתו לזיכרון
export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients();
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: projectId === 'global' ? `Global` : `Project ${projectId}`
    });

    // שמירה באינדקס הסמנטי לחיפוש עתידי
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const chunks = data.text.match(/[\s\S]{1,1000}/g) || [];
      for (const chunk of chunks) {
        const embedding = await getEmbeddings(chunk);
        if (embedding) await vectorStore.addText(chunk, embedding, { projectId, filePath });
      }
    }
    return true;
  } catch (error) { throw error; }
};

// ניתוח מכרז חכם עם דיווח חי
export const analyzeTender = async (filePath, tenderId) => {
  try {
    updateLiveStatus(tenderId, "מעלה את המכרז לסריקה...");
    const { genAI, fileManager } = getGeminiClients();
    const uploadResponse = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "Tender" });
    
    updateLiveStatus(tenderId, "ברבור קורא את האותיות הקטנות...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `נתח את המכרז לעומק. ציין תקציר, תנאי סף, לו"ז, וסיכונים. השתמש ב-[THOUGHT] ו-[CONFIDENCE]. ענה בעברית.`;
    const result = await model.generateContent([
      { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
      { text: prompt }
    ]);

    updateLiveStatus(tenderId, "מסיים את הניתוח...");
    return result.response.text();
  } catch (error) { 
    updateLiveStatus(tenderId, "שגיאה בניתוח המכרז.");
    throw error; 
  }
};

// הפקת הצעת מחיר אוטומטית עם דיווח חי
export const generateProposal = async (filePath, tenderId) => {
  try {
    updateLiveStatus(tenderId, "סורק את כתב הכמויות...");
    const { genAI } = getGeminiClients();
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    
    updateLiveStatus(tenderId, "מחפש מחירים היסטוריים במאגר...");
    const priceQueryEmbedding = await getEmbeddings("מחירי יחידה, הצעת מחיר, בטון, שלד, עבודות עפר");
    const historicalMatches = await vectorStore.search(priceQueryEmbedding, 20);
    const pricingContext = historicalMatches.map(r => r.text).join('\n---\n');

    updateLiveStatus(tenderId, "ברבור מחשב ומעריך עלויות...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `בנה הצעת מחיר מקצועית על בסיס המכרז וההיסטוריה: ${pricingContext}. לכל סעיף ציין מחיר ורמת וודאות. בלי חרטוטים!`;

    const result = await model.generateContent(prompt);
    updateLiveStatus(tenderId, "הצעה מוכנה!");
    return result.response.text();
  } catch (error) { 
    updateLiveStatus(tenderId, "שגיאה בהפקת הצעה.");
    throw error; 
  }
};

// שאלות ותשובות (צ'אט)
export const askQuestion = async (projectId, question) => {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // חיפוש סמנטי מהיר לפני התשובה
    const queryEmbedding = await getEmbeddings(question);
    const semanticResults = await vectorStore.search(queryEmbedding, 5);
    const context = semanticResults.map(r => r.text).join('\n---\n');

    const prompt = `ענה על השאלה: ${question}. הקשר: ${context}. השתמש ב-[THOUGHT] ו-[CONFIDENCE].`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) { return "משהו השתבש, נסה שוב."; }
};

// ניתוח קבלות OCR
export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    const uploadResponse = await fileManager.uploadFile(filePath, { mimeType, displayName: "Receipt" });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `חלץ נתוני קבלה ל-JSON: סכום, ספק, תאריך.`;
    const result = await model.generateContent([{ fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } }, { text: prompt }]);
    let text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) { return null; }
};
