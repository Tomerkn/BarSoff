import fs from 'fs'; // כלי בסיסי שמאפשר לקרוא ולכתוב קבצים על המחשב (כמו ה-Word של הקוד)
import path from 'path'; // עוזר לנו לנווט בין תיקיות בלי להתבלבל (כמו ה-Waze של הנתיבים)
import { GoogleGenerativeAI } from '@google-cloud/generative-ai'; // החיבור הישיר למוח של גוגל (Gemini)
import { GoogleAIFileManager } from '@google-cloud/generative-ai/server'; // כלי שמעלה קבצים לגוגל כדי שיוכלו "לראות" אותם
import Anthropic from '@anthropic-ai/sdk'; // החיבור ל-Claude, המוח החלופי שלנו למקרה שגוגל נחים
import db from './db.js'; // החיבור למחסן הנתונים הראשי של בארסוף
import pdf from 'pdf-parse'; // כלי שיודע "לקלף" טקסט מתוך קבצי PDF סגורים
import { VectorStorage } from 'vector-storage'; // מסד נתונים מיוחד שזוכר "משמעות" של מילים (הזיכרון הסמנטי)

// מגדירים איפה נשמור את כל המידע שה-AI צריך לזכור בטווח הקצר
const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache');

// אם התיקייה הזו לא קיימת, אנחנו יוצרים אותה עכשיו כדי שלא יהיו שגיאות
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// פונקציה שמארגנת את כל הגישה לגוגל במקום אחד
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY; // לוקחים את המפתח הסודי מההגדרות
  if (!apiKey) {
    throw new Error('חסר מפתח GEMINI_API_KEY בהגדרות השרת!');
  }
  return {
    genAI: new GoogleGenerativeAI(apiKey), // המנוע שיוצר תשובות
    fileManager: new GoogleAIFileManager(apiKey) // המנוע שמטפל בקבצים
  };
};

// פונקציה שמארגנת את הגישה ל-Claude (הגיבוי שלנו)
const getClaudeClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null; // אם לא הגדרנו מפתח לקלוד, פשוט נדע שאין לנו גיבוי כרגע
  }
  return new Anthropic({ apiKey });
};

// מחזיר את הנתיב למאגר הידע הכללי של החברה (מה שלא קשור לפרויקט ספציפי)
const getGlobalDocsPath = () => path.join(CACHE_DIR, 'global_knowledge.json');

// מאתחלים את המחסן הוקטורי - פה נשמר הזיכרון של "מה זה בטון" ו"כמה עלה מלט"
const vectorStore = new VectorStorage({
  storagePath: path.join(CACHE_DIR, 'vector_db.json')
});

// פונקציה שהופכת טקסט ל"וקטור" (מספרים שמיצגים משמעות) כדי שנוכל להשוות ביניהם
async function getEmbeddings(text) {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" }); // המודל הכי חדש של גוגל למשימה הזו
    const result = await model.embedContent(text);
    return result.embedding.values; // מחזיר רשימת מספרים שהם ה"משמעות" של הטקסט
  } catch (error) {
    console.error('שגיאה ביצירת וקטור משמעות:', error);
    return null;
  }
}

// פונקציה שמעלה מסמך למערכת, קוראת אותו ומכניסה אותו לזיכרון של ברבור
export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients();
    
    console.log(`מעלה את ${filePath} למוח של גוגל...`);
    // שולחים את הקובץ לגוגל כדי שיוכלו לנתח אותו מולטי-מודאלית (גם טקסט וגם תמונות)
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: projectId === 'global' ? `Global Knowledge` : `Project ${projectId}`
    });

    // שומרים רישום אצלנו שהקובץ הועלה בהצלחה
    const cachePath = projectId === 'global' ? getGlobalDocsPath() : path.join(CACHE_DIR, `project_${projectId}.json`);
    let files = [];
    if (fs.existsSync(cachePath)) {
      files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
    
    files.push({
      name: uploadResponse.file.name,
      uri: uploadResponse.file.uri,
      mimeType: uploadResponse.file.mimeType,
      localPath: filePath,
      originalName: path.basename(filePath),
      uploadTime: Date.now()
    });

    fs.writeFileSync(cachePath, JSON.stringify(files, null, 2));

    // --- החלק המעניין: בניית חיפוש סמנטי ---
    if (mimeType === 'application/pdf' && fs.existsSync(filePath)) {
      try {
        console.log(`מנתח טקסט מתוך ${filePath} לצורך חיפוש חכם...`);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer); // מוציא את המילים מה-PDF
        const text = data.text;
        
        // מפרקים את המסמך לחתיכות של 1000 תווים כדי שיהיה קל לחפש בתוכו
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        console.log(`מכניס ${chunks.length} פסקאות לאינדקס המשמעויות...`);
        
        for (const chunk of chunks) {
          const embedding = await getEmbeddings(chunk); // הופך כל פסקה לוקטור
          if (embedding) {
            // שומרים את הפסקה ב-DB הוקטורי עם המידע על הפרויקט
            await vectorStore.addText(chunk, embedding, { projectId, filePath });
          }
        }
      } catch (err) {
        console.error('שגיאה באינדוקס סמנטי (לא קריטי):', err);
      }
    }

    return true;
  } catch (error) {
    console.error('שגיאה בתהליך לימוד המסמך:', error);
    throw error;
  }
};

// פונקציה שעושה קסמים עם קבלות - מוציאה מספרים ושמות מהתמונה באופן אוטומטי
export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    const uploadResponse = await fileManager.uploadFile(filePath, { mimeType, displayName: `Receipt OCR` });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // מודל סופר מהיר
    
    const prompt = `אתה מומחה להנהלת חשבונות. חלץ סכום, שם ספק ותאריך מהקבלה והחזר ב-JSON נקי.`;

    const result = await model.generateContent([
      { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
      { text: prompt }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(responseText); // מחזירים אובייקט מוכן למסד הנתונים
  } catch (error) {
    console.error('שגיאה בניתוח קבלה:', error);
    return null;
  }
};

// הפונקציה הראשית שמאפשרת לשאול את ברבור כל דבר על הפרויקט
export const askQuestion = async (projectId, question, includeGlobal = true) => {
  try {
    const { genAI } = getGeminiClients();
    const projectCachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    const globalCachePath = getGlobalDocsPath();
    
    let allFiles = [];
    if (fs.existsSync(projectCachePath)) { allFiles = [...JSON.parse(fs.readFileSync(projectCachePath, 'utf-8'))]; }
    if (includeGlobal && fs.existsSync(globalCachePath)) {
      const globalFiles = JSON.parse(fs.readFileSync(globalCachePath, 'utf-8'));
      allFiles = [...allFiles, ...globalFiles];
    }

    if (allFiles.length === 0) return "אין לי מסמכים לעבוד איתם כרגע.";

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- חיפוש סמנטי מהיר ---
    let semanticContext = "";
    try {
      const queryEmbedding = await getEmbeddings(question); // מבינים מה המשתמש באמת חיפש
      if (queryEmbedding) {
        const semanticResults = await vectorStore.search(queryEmbedding, 5); // מביאים את 5 הפסקאות הכי קשורות
        semanticContext = semanticResults.map(r => r.text).join('\n---\n');
      }
    } catch (err) { console.error('שגיאה בחיפוש סמנטי:', err); }

    // בונים את ההוראות לברבור
    const promptParts = [
      { text: `השם שלך הוא 'ברבור 🦢'. ענה על סמך המידע הזה: ${semanticContext}` }
    ];

    // מצרפים את כל הקבצים הרלוונטיים כדי שיוכל להסתכל עליהם בזמן אמת
    for (const file of allFiles) {
      promptParts.unshift({ fileData: { mimeType: file.mimeType, fileUri: file.uri } });
    }

    const result = await model.generateContent(promptParts);
    return result.response.text();
  } catch (error) {
    // אם גוגל נפל, מנסים להעביר את השאלה ל-Claude כגיבוי
    const claude = getClaudeClient();
    if (claude) {
      const response = await claude.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `[מצב גיבוי] ענה כמיטב יכולתך: ${question}` }],
      });
      return `[גיבוי קלוד] ${response.content[0].text}`;
    }
    throw error;
  }
};

// פונקציה לניתוח מהיר של מסמך מכרז והוצאת נקודות קריטיות
export const analyzeTender = async (filePath) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    const uploadResponse = await fileManager.uploadFile(filePath, { mimeType: "application/pdf", displayName: "Tender" });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // מודל חזק יותר לניתוח עומק

    const prompt = `השם שלך 'ברבור'. נתח את המכרז: מה בונים? תנאי סף? לו"ז? סיכונים? ציין וודאות [CONFIDENCE].`;
    const result = await model.generateContent([
      { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
      { text: prompt }
    ]);
    return result.response.text();
  } catch (error) { throw error; }
};

// המנוע האוטומטי להפקת הצעות מחיר על בסיס היסטוריה
export const generateProposal = async (filePath) => {
  try {
    const { genAI } = getGeminiClients();
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const tenderText = pdfData.text;

    // מחפשים מחירים של פרויקטים דומים בהיסטוריה של המערכת
    const priceQueryEmbedding = await getEmbeddings("מחירי יחידה, הצעת מחיר, כתב כמויות, עלות חומרים");
    const historicalMatches = await vectorStore.search(priceQueryEmbedding, 15);
    const pricingContext = historicalMatches.map(r => r.text).join('\n---\n');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      אתה ברבור 🦢, מומחה תמחור. בנה הצעת מחיר למכרז המצורף.
      השתמש בהיסטוריה הזו: ${pricingContext}
      לכל סעיף: תיאור, כמות, מחיר מוצע, וודאות (%) והסבר למה בחרת במחיר הזה.
      בלי לחרטט - אם אין מידע, רשום "נדרש תמחור ידני".
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) { throw error; }
};
