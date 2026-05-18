import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import db from './db.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const parsePDFText = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (pdfParse && pdfParse.PDFParse) {
    const uint8 = new Uint8Array(buffer);
    const parser = new pdfParse.PDFParse(uint8);
    const result = await parser.getText();
    return result.text || "";
  }
  if (typeof pdfParse === 'function') {
    const result = await pdfParse(buffer);
    return result.text || "";
  }
  if (pdfParse && typeof pdfParse.default === 'function') {
    const result = await pdfParse.default(buffer);
    return result.text || "";
  }
  throw new Error("Unable to determine PDF parsing library interface");
};

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

const GEMINI_FLASH_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
const GEMINI_PRO_CHAIN = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

const generateContentWithFallback = async (genAI, modelChain, promptOrContent, timeoutMs = 45000) => {
  let lastError = null;
  for (const modelName of modelChain) {
    try {
      console.log(`🤖 Attempting Gemini model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const callPromise = model.generateContent(promptOrContent);
      const result = await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), timeoutMs))
      ]);
      
      console.log(`✅ Success with Gemini model: ${modelName}`);
      return result;
    } catch (err) {
      console.warn(`⚠️ Gemini model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו: ${lastError?.message}`);
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
  console.log(`🔍 Ingesting document: ${filePath} for project ${projectId}`);
  try {
    const { fileManager } = getGeminiClients();
    // העלאה למנהל הקבצים (לצרכי חיפוש עתידיים ב-Gemini)
    try {
      await fileManager.uploadFile(filePath, { mimeType, displayName: `Doc ${path.basename(filePath)}` });
    } catch (e) { console.warn('GCS Upload in ingest failed, continuing with local embedding:', e.message); }

    if (mimeType === 'application/pdf') {
      const pdfText = await parsePDFText(filePath);
      const chunks = pdfText.match(/[\s\S]{1,1500}/g) || []; // צ'אנקים גדולים יותר כדי להקטין כמות קריאות
      console.log(`📄 PDF parsed into ${chunks.length} chunks. Starting embedding...`);
      
      // איסוף כל ה-embeddings בצורה יעילה יותר
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length < 50) continue; // סעיפים קצרים מדי לא מעניינים
        
        const embedding = await getEmbeddings(chunk);
        if (embedding) {
          vectorStore.data.push({ text: chunk, embedding, metadata: { projectId, date: new Date().toISOString() } });
        }
        
        // כתיבה לדיסק רק כל 10 צ'אנקים או בסוף
        if (i % 10 === 0) fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(vectorStore.data));
      }
      fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(vectorStore.data));
    }
    console.log(`✅ Ingestion complete for ${projectId}`);
    return true;
  } catch (e) { 
    console.error('❌ Ingest failed critical error:', e.message); 
    return false; 
  }
};

export const analyzeTender = async (filePath, tenderId, onPhaseOneComplete) => {
  updateLiveStatus(tenderId, "קורא את מסמך המכרז...");
  
  let pdfText;
  try {
    pdfText = await parsePDFText(filePath);
  } catch (e) {
    throw new Error(`Failed to read PDF: ${e.message}`);
  }
  
  const shortText = pdfText.slice(0, 4000);  // לשלב 1 - רק 4K תווים
  const fullText = pdfText.slice(0, 15000);  // לשלב 2 - 15K תווים

  // --- גוגל ג'מיני כספק ראשי (Primary Engine) ---
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    try {
      const { genAI } = getGeminiClients();

      // --- שלב 1: ניתוח מהיר עם שרשרת גיבוי של גוגל ג'מיני ---
      updateLiveStatus(tenderId, "שלב 1/2: ניתוח מהיר של נקודות מפתח (ג'מיני)...");
      let quickAnalysis = null;
      try {
        const quickPrompt = `נתח בקצרה את המכרז הבא - תנאי סף, לוחות זמנים, קנסות עיקריים, ושלבי ביצוע מרכזיים. 3-5 נקודות קצרות וברורות בלבד שיוצגו ללקוח. ענה בעברית.
[CONFIDENCE]70[/CONFIDENCE]

מסמך:
${shortText}`;
        const quickResult = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, quickPrompt, 15000);
        quickAnalysis = quickResult.response.text();
        if (onPhaseOneComplete) onPhaseOneComplete(quickAnalysis);
        updateLiveStatus(tenderId, "שלב 2/2: ניתוח מעמיק ומפורט (ג'מיני)...");
      } catch (e) {
        console.warn('Gemini Phase 1 quick analysis failed:', e.message);
        updateLiveStatus(tenderId, "מנתח את המכרז (ג'מיני)...");
      }

      // --- שלב 2: ניתוח עמוק + חילוץ כתב כמויות ראשוני ---
      try {
        const geminiPrompt = `נתח את מסמך המכרז הבא לעומק בעברית. התייחס ל: תנאי סף, לוחות זמנים, קנסות, ערבויות, ודרישות ביטוח.
חובה לכלול פרק מיוחד ומורחב בשם "שלבי הביצוע להנגשה ללקוח" המתרגם את המכרז לשלבי עבודה פשוטים, ברורים ומסודרים שיוצגו ישירות ללקוח הקצה.
חובה לסיים את התשובה עם תגית ביטחון: [CONFIDENCE]XX[/CONFIDENCE] (מספר מ-1 עד 100).

בנוסף, חובה לכלול בלוק JSON של אומדן כתב כמויות ראשוני לפי המכרז (מחירי שוק סבירים בישראל):
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\`

מסמך המכרז:
${fullText}`;

        const deepResult = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, geminiPrompt, 45000);
        const rawText = deepResult.response.text();

        let boq_json = null;
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1].trim());
            boq_json = jsonMatch[1].trim();
          } catch (e) { console.warn('BoQ JSON parse failed in Gemini analysis:', e.message); }
        }
        const analysis = rawText.replace(jsonMatch?.[0] || '', '').trim();

        updateLiveStatus(tenderId, "ניתוח הושלם");
        return { analysis, boq_json };
      } catch (geminiDeepErr) {
        console.warn('Gemini Phase 2 deep analysis failed, returning phase 1 result:', geminiDeepErr.message);
        if (quickAnalysis) {
          updateLiveStatus(tenderId, "ניתוח הושלם (מהיר)");
          return { analysis: quickAnalysis, boq_json: null };
        }
        throw geminiDeepErr;
      }
    } catch (geminiGeneralErr) {
      console.warn('Gemini analysis failed completely:', geminiGeneralErr.message);
      throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו בניתוח המסמך: ${geminiGeneralErr.message}`);
    }
  } else {
    throw new Error(`כל שירותי הבינה המלאכותית נכשלו בניתוח המסמך: Missing GEMINI_API_KEY`);
  }
};

export const generateProposal = async (filePath, tenderId) => {
  updateLiveStatus(tenderId, "מחלץ נתוני מכרז...");
  
  let pdfText;
  try {
    pdfText = await parsePDFText(filePath);
  } catch (e) {
    throw new Error(`Failed to read PDF: ${e.message}`);
  }
  const truncatedText = pdfText.slice(0, 12000);

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    try {
      updateLiveStatus(tenderId, "מתחבר למאגר המחירים ההיסטורי (ג'מיני)...");
      const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה, כתב כמויות");
      const matches = await vectorStore.search(queryEmbedding, 10);
      const context = matches.map(m => m.text).join('\n---\n');

      updateLiveStatus(tenderId, "בונה כתב כמויות ומחשב מחיר מטרה (ג'מיני)...");
      const fallbackPrompt = `הכן הצעת מחיר מבוססת על המכרז והיסטוריית מחירים בעברית.
      
היסטוריית מחירים:
${context}

מסמך המכרז:
${truncatedText}

דרישות:
1. הכן כתב כמויות (BoQ) מפורט
2. השתמש במחירי יחידה מהיסטוריית המחירים שלנו
3. חובה לכלול פרק מיוחד ומסודר בשם "שלבי ביצוע להצגה ללקוח" המפרט בצורה מונגשת, פשוטה וברורה לקורא הלא-מקצועי את שלבי העבודה השונים, כדי שנוכל להציג לו את זה בבהירות.
4. חובה לסיים עם [CONFIDENCE]XX[/CONFIDENCE]
5. חובה לכלול בלוק JSON במבנה הזה:
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\``;

      const { genAI } = getGeminiClients();
      const result = await generateContentWithFallback(genAI, GEMINI_PRO_CHAIN, fallbackPrompt, 45000);

      updateLiveStatus(tenderId, "הצעה מוכנה");
      const text = result.response.text();
      let boq_json = null;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try { boq_json = jsonMatch[1].trim(); } catch (e) {}
      }
      return { proposal: text.replace(jsonMatch?.[0] || '', '').trim(), boq_json };
    } catch (geminiErr) {
      console.warn("Gemini failed for generateProposal:", geminiErr.message);
      throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו ביצירת ההצעה: ${geminiErr.message}`);
    }
  } else {
    throw new Error("Missing GEMINI_API_KEY");
  }
};

export const askQuestion = async (projectId, question) => {
  const queryEmbedding = await getEmbeddings(question);
  const matches = await vectorStore.search(queryEmbedding, 5);
  const context = matches.map(m => m.text).join('\n---\n');
  
  try {
    const { genAI } = getGeminiClients();
    const prompt = `ענה על: ${question}. הקשר: ${context}. ענה בעברית. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE] המייצגת את רמת הוודאות שלך בתשובה (מ-1 עד 100).`;
    const result = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, prompt, 20000);
    return result.response.text();
  } catch (err) {
    console.error("Gemini failed for askQuestion:", err);
    throw err;
  }
};

export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    const upload = await fileManager.uploadFile(filePath, { mimeType, displayName: "Receipt" });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: "חלץ נתוני קבלה ל-JSON. חובה לכלול בשדה 'confidence' מספר מ-1 עד 100." }]);
    return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("Receipt analysis failed:", e);
    return { error: "Failed to analyze receipt" };
  }
};
