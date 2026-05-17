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
  console.log(`🔍 Ingesting document: ${filePath} for project ${projectId}`);
  try {
    const { fileManager } = getGeminiClients();
    // העלאה למנהל הקבצים (לצרכי חיפוש עתידיים ב-Gemini)
    try {
      await fileManager.uploadFile(filePath, { mimeType, displayName: `Doc ${path.basename(filePath)}` });
    } catch (e) { console.warn('GCS Upload in ingest failed, continuing with local embedding:', e.message); }

    if (mimeType === 'application/pdf') {
      const data = await pdfParse(fs.readFileSync(filePath));
      const chunks = data.text.match(/[\s\S]{1,1500}/g) || []; // צ'אנקים גדולים יותר כדי להקטין כמות קריאות
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

// ניתוח דו-שלבי: שלב 1 מהיר (Haiku ~4 שניות) → שלב 2 עמוק (Sonnet ~15 שניות)
// המשתמש רואה תוצאה ראשונית מהר, ואז התוצאה מתעדכנת לעומק
export const analyzeTender = async (filePath, tenderId, onPhaseOneComplete) => {
  updateLiveStatus(tenderId, "קורא את מסמך המכרז...");
  
  let pdfText;
  try {
    pdfText = (await pdfParse(fs.readFileSync(filePath))).text;
  } catch (e) {
    throw new Error(`Failed to read PDF: ${e.message}`);
  }
  
  const shortText = pdfText.slice(0, 4000);  // לשלב 1 - רק 4K תווים
  const fullText = pdfText.slice(0, 15000);  // לשלב 2 - 15K תווים

  // נבדוק האם יש מפתח של Claude. אם אין או שהוא ריק, נדלג ישר לגוגל ג'מיני.
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== "") {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // --- שלב 1: ניתוח מהיר עם claude-haiku (3-5 שניות) ---
      updateLiveStatus(tenderId, "שלב 1/2: ניתוח מהיר של נקודות מפתח...");
      let quickAnalysis = null;
      try {
        const quickResponse = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 800,
          messages: [{ role: "user", content: `נתח בקצרה את המכרז הבא - תנאי סף, לוחות זמנים, קנסות עיקריים. 3-5 נקודות קצרות בלבד. ענה בעברית.
[CONFIDENCE]70[/CONFIDENCE]

מסמך:
${shortText}` }]
        });
        quickAnalysis = quickResponse.content[0].text;
        // מחזירים את הניתוח המהיר כבר עכשיו כדי שהמשתמש יראה משהו
        if (onPhaseOneComplete) onPhaseOneComplete(quickAnalysis);
        updateLiveStatus(tenderId, "שלב 2/2: ניתוח מעמיק ומפורט...");
      } catch (e) {
        console.warn('Phase 1 quick analysis failed:', e.message);
        updateLiveStatus(tenderId, "מנתח את המכרז...");
      }

      // --- שלב 2: ניתוח עמוק + חילוץ כתב כמויות ראשוני ---
      try {
        const deepResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 3500,
          messages: [{ role: "user", content: `נתח את מסמך המכרז הבא לעומק בעברית. התייחס ל: תנאי סף, לוחות זמנים, קנסות, ערבויות, ודרישות ביטוח.
חובה לסיים את התשובה עם תגית ביטחון: [CONFIDENCE]XX[/CONFIDENCE] (מספר מ-1 עד 100).

בנוסף, חובה לכלול בלוק JSON של אומדן כתב כמויות ראשוני לפי המכרז (מחירי שוק סבירים בישראל):
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\`

מסמך המכרז:
${fullText}` }]
        });
        
        const rawText = deepResponse.content[0].text;
        // מפריד את בלוק ה-JSON מתוך הניתוח
        let boq_json = null;
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1].trim()); // בדיקה שה-JSON תקין
            boq_json = jsonMatch[1].trim();
          } catch (e) { console.warn('BoQ JSON parse failed in analysis:', e.message); }
        }
        const analysis = rawText.replace(jsonMatch?.[0] || '', '').trim();
        
        updateLiveStatus(tenderId, "ניתוח הושלם");
        return { analysis, boq_json };
      } catch (sonnetErr) {
        console.warn('Phase 2 deep analysis failed, returning phase 1 result:', sonnetErr.message);
        if (quickAnalysis) {
          updateLiveStatus(tenderId, "ניתוח הושלם (מהיר)");
          return { analysis: quickAnalysis, boq_json: null };
        }
        throw sonnetErr;
      }
    } catch (claudeGeneralErr) {
      console.warn('Claude analysis failed completely, falling back to Gemini:', claudeGeneralErr.message);
    }
  } else {
    console.log('ANTHROPIC_API_KEY is not defined, skipping to Gemini fallback.');
  }

  // --- גוגל ג'מיני כגיבוי מלא וחזק (Gemini 1.5 Pro/Flash) ---
  updateLiveStatus(tenderId, "מנתח באמצעות גוגל ג'מיני...");
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const geminiPrompt = `נתח את מסמך המכרז הבא לעומק בעברית. התייחס ל: תנאי סף, לוחות זמנים, קנסות, ערבויות, ודרישות ביטוח.
חובה לסיים את התשובה עם תגית ביטחון: [CONFIDENCE]XX[/CONFIDENCE] (מספר מ-1 עד 100).

בנוסף, חובה לכלול בלוק JSON של אומדן כתב כמויות ראשוני לפי המכרז (מחירי שוק סבירים בישראל):
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\`

מסמך המכרז:
${fullText}`;

    const result = await model.generateContent(geminiPrompt);
    const rawText = result.response.text();
    
    let boq_json = null;
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[1].trim());
        boq_json = jsonMatch[1].trim();
      } catch (e) { console.warn('BoQ JSON parse failed in Gemini:', e.message); }
    }
    const analysis = rawText.replace(jsonMatch?.[0] || '', '').trim();
    
    updateLiveStatus(tenderId, "ניתוח הושלם (ג'מיני)");
    // אם הוגדר callback לשלב 1, נעדכן אותו עם התוצאה המלאה של ג'מיני כדי שהפרונט יציג אותה
    if (onPhaseOneComplete) onPhaseOneComplete(analysis);
    return { analysis, boq_json };
  } catch (geminiErr) {
    console.error('Both Claude and Gemini failed to analyze tender:', geminiErr);
    throw new Error(`כל שירותי הבינה המלאכותית נכשלו בניתוח המסמך: ${geminiErr.message}`);
  }
};

export const generateProposal = async (filePath, tenderId) => {
  // Claude קודם - מהיר ויציב
  updateLiveStatus(tenderId, "מחלץ נתוני מכרז...");
  
  try {
    const pdfText = (await pdfParse(fs.readFileSync(filePath))).text;
    const truncatedText = pdfText.slice(0, 12000);
    
    updateLiveStatus(tenderId, "מתחבר למאגר המחירים ההיסטורי...");
    const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה, כתב כמויות");
    const matches = await vectorStore.search(queryEmbedding, 8);
    const context = matches.length > 0 ? matches.map(m => m.text).join('\n---\n') : "אין היסטוריית מחירים זמינה";
    
    updateLiveStatus(tenderId, "בונה כתב כמויות ומחשב מחיר מטרה...");
    const prompt = `בהתבסס על מסמך המכרז ועל היסטוריית המחירים שלנו, הכן הצעת מחיר מפורטת בעברית.
    
היסטוריית מחירים:
${context}

מסמך המכרז:
${truncatedText}

דרישות:
1. הכן כתב כמויות (BoQ) מפורט
2. השתמש במחירי יחידה מהיסטוריית המחירים שלנו
3. חובה לסיים עם [CONFIDENCE]XX[/CONFIDENCE]
4. חובה לכלול בלוק JSON במבנה הזה:
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\``;

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === "") {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    });
    
    updateLiveStatus(tenderId, "הצעה מוכנה");
    const text = response.content[0].text;
    let boq_json = null;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try { boq_json = jsonMatch[1].trim(); } catch (e) {}
    }
    return { proposal: text.replace(jsonMatch?.[0] || '', '').trim(), boq_json };
    
  } catch (claudeErr) {
    console.warn("Claude failed for generateProposal, trying Gemini:", claudeErr.message);
    try {
      updateLiveStatus(tenderId, "מנסה שיטת גיבוי...");
      const { genAI, fileManager } = getGeminiClients();
      const upload = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "TenderForProposal" });
      let file = await fileManager.getFile(upload.file.name);
      let waitCount = 0;
      while (file.state === "PROCESSING" && waitCount < 10) {
        await new Promise(r => setTimeout(r, 2000));
        file = await fileManager.getFile(upload.file.name);
        waitCount++;
      }
      const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה");
      const matches = await vectorStore.search(queryEmbedding, 10);
      const context = matches.map(m => m.text).join('\n---\n');
      const fallbackPrompt = `הכן הצעת מחיר מבוססת על המכרז המצורף והיסטוריה: ${context}. ענה בעברית. סיים עם [CONFIDENCE]XX[/CONFIDENCE] ובלוק JSON של BoQ.`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await Promise.race([
        model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: fallbackPrompt }]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 30000))
      ]);
      updateLiveStatus(tenderId, "הצעה מוכנה");
      const text = result.response.text();
      let boq_json = null;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) { try { boq_json = jsonMatch[1].trim(); } catch (e) {} }
      return { proposal: text.replace(jsonMatch?.[0] || '', '').trim(), boq_json };
    } catch (geminiErr) {
      console.error("Both Claude and Gemini failed for proposal:", geminiErr.message);
      throw geminiErr;
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
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === "") {
        throw new Error("Missing ANTHROPIC_API_KEY");
      }
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
