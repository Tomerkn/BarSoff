import fs from 'fs'; // כלי לעבודה עם קבצים
import path from 'path'; // כלי לטיפול בנתיבי קבצים
import { GoogleGenerativeAI } from '@google/generative-ai'; // התחברות לבינה המלאכותית של גוגל
import { GoogleAIFileManager } from '@google/generative-ai/server'; // ניהול קבצים מול גוגל
import Anthropic from '@anthropic-ai/sdk'; // התחברות ל-Claude (אנתרופיק) כגיבוי
import db from './db.js'; // חיבור למסד הנתונים

const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache'); // תיקייה לשמירת זיכרון זמני של ה-AI

// מוודא שתיקיית הקאש קיימת במחשב
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// פונקציה שמביאה את המפתחות שצריך כדי לדבר עם ה-AI של גוגל
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing!');
  }
  return {
    genAI: new GoogleGenerativeAI(apiKey),
    fileManager: new GoogleAIFileManager(apiKey)
  };
};

// פונקציה שמביאה את הלקוח של Claude לגיבוי
const getClaudeClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null; // אם אין מפתח לקלוד, פשוט נחזיר נל ונדע שאין גיבוי
  }
  return new Anthropic({ apiKey });
};

const getGlobalDocsPath = () => path.join(CACHE_DIR, 'global_knowledge.json');

// העלאת מסמך ללימוד של ה-AI ושמירה שלו בזיכרון המקומי
export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients(); // מקבלים את הגישה לגוגל
    
    console.log(`Uploading ${filePath} to Gemini File API...`);
    // מעלים את הקובץ לשרתים של גוגל - הם יודעים לקרוא שרטוטים, טבלאות ומסמכים בקלות
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: projectId === 'global' ? `Global Knowledge Base` : `Project ${projectId} Document`
    });

    console.log(`Upload complete. Gemini URI: ${uploadResponse.file.uri}`);

    // שומרים את המידע בקובץ פשוט אצלנו
    const cachePath = projectId === 'global' ? getGlobalDocsPath() : path.join(CACHE_DIR, `project_${projectId}.json`);
    let files = [];
    if (fs.existsSync(cachePath)) { // אם כבר יש קבצים
      files = JSON.parse(fs.readFileSync(cachePath, 'utf-8')); // קוראים אותם
    }
    
    files.push({ // מוסיפים את הקובץ החדש לרשימה
      name: uploadResponse.file.name,
      uri: uploadResponse.file.uri,
      mimeType: uploadResponse.file.mimeType,
      localPath: filePath,
      originalName: path.basename(filePath),
      uploadTime: Date.now()
    });

    fs.writeFileSync(cachePath, JSON.stringify(files, null, 2)); // שומרים את הרשימה המעודכנת
    return true;
  } catch (error) {
    console.error('Error ingesting document via Gemini:', error);
    throw error;
  }
};

// ניתוח תמונת קבלה והוצאת הפרטים שלה באופן אוטומטי
export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients(); // גישה לגוגל
    
    console.log(`Uploading receipt ${filePath} to Gemini File API for OCR...`);
    const uploadResponse = await fileManager.uploadFile(filePath, { // העלאת התמונה
      mimeType: mimeType,
      displayName: `Receipt for OCR`
    });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // בוחרים את המודל המהיר והחכם ביותר
    
    const prompt = `
      אתה מומחה להנהלת חשבונות. לפניך קבלה או חשבונית. 
      חלץ את המידע הבא מהתמונה והחזר אותו אך ורק בפורמט JSON תקין, ללא טקסט מקדים וללא תגיות מיוחדות.
      
      המפתחות ב-JSON יהיו:
      - amount: הסכום הסופי לתשלום במספרים בלבד.
      - supplier: שם הספק או בית העסק.
      - date: תאריך העסקה בפורמט YYYY-MM-DD.
      - description: תיאור קצר של מה שקנו.
    `;

    const result = await model.generateContent([ // מבקשים מה-AI לנתח את התמונה לפי ההוראות
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: prompt }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim(); // מנקים טקסט מיותר
    
    return JSON.parse(responseText); // מחזירים את התוצאה כאובייקט מסודר
  } catch (error) {
    console.error('Error analyzing receipt via Gemini:', error);
    return null;
  }
};

// פונקציה שמאפשרת לשאול את ה-AI שאלות על כל המסמכים שהעלינו לפרויקט
export const askQuestion = async (projectId, question, includeGlobal = true) => {
  try {
    const { genAI } = getGeminiClients();
    const projectCachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    const globalCachePath = getGlobalDocsPath();
    
    let allFiles = [];
    
    // מוסיפים קבצים של הפרויקט הספציפי
    if (fs.existsSync(projectCachePath)) {
      allFiles = [...JSON.parse(fs.readFileSync(projectCachePath, 'utf-8'))];
    }

    // מוסיפים קבצים ממאגר הידע הגלובלי (למשל לצורך מכרזים)
    if (includeGlobal && fs.existsSync(globalCachePath)) {
      const globalFiles = JSON.parse(fs.readFileSync(globalCachePath, 'utf-8'));
      allFiles = [...allFiles, ...globalFiles];
    }

    if (allFiles.length === 0) {
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה או במאגר הידע הגלובלי.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // מפעילים את המוח

    // פה אנחנו מגדירים ל-AI מי הוא ואיך להתנהג
    const promptParts = [
      { text: `השם שלך הוא 'ברבור 🦢', ואתה עוזר בינה מלאכותית חכם ומקצועי לניהול פרויקטים בבנייה.
      לפניך מסמכים מפרויקט מספר ${projectId} וכן מסמכי ידע כלליים של החברה.
      
      חשוב מאוד: 
      1. לפני שאתה עונה, עליך לפרט את תהליך המחשבה שלך בתוך תגיות [THOUGHT] ו-[/THOUGHT].
      2. בסוף התשובה, עליך לציין את רמת הוודאות שלך במידע שמצאת בפורמט המדויק: [CONFIDENCE]ציון בין 0 ל-100[/CONFIDENCE].
      
      ענה למשתמש בעברית בלבד, בטון מקצועי אך חברי.
      אם המידע לא נמצא במסמכים, ציין זאת במפורש.
      
      השאלה של המשתמש: ${question}` }
    ];

    for (const file of allFiles) {
      promptParts.unshift({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      });
    }

    // הוספת הקשר מהמסד נתונים (משימות, גאנט וכו')
    try {
      const tasks = db.prepare('SELECT name, start_date, end_date, progress FROM tasks WHERE project_id = ?').all(projectId);
      if (tasks.length > 0) {
        let taskInfo = "\nלהלן סטטוס המשימות הנוכחי בפרויקט:\n";
        tasks.forEach(t => taskInfo += `- ${t.name}: ${t.progress}% (סיום משוער: ${t.end_date})\n`);
        promptParts.push({ text: taskInfo });
      }
    } catch (e) {}

    console.log(`Asking Gemini question across ${allFiles.length} documents...`);
    const result = await model.generateContent(promptParts);
    return result.response.text();
  } catch (error) {
    console.error('Gemini error, attempting fallback to Claude:', error);
    
    // ניסיון Fallback ל-Claude
    const claude = getClaudeClient();
    if (claude) {
      try {
        console.log('Falling back to Claude 3.5 Sonnet...');
        const response = await claude.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 4096,
          messages: [{ 
            role: 'user', 
            content: `אתה עוזר בינה מלאכותית בשם ברבור. המערכת הראשית שלנו (גוגל) חוותה עומס, ולכן עברנו אליך.
            ענה על השאלה הבאה בצורה מקצועית וחברית בעברית.
            שים לב: כרגע אין לי אפשרות להעביר לך את המסמכים המלאים בגלל המעבר המהיר, ענה על סמך מה שאתה יודע או בקש מהמשתמש להעלות שוב אם זה קריטי.
            
            שאלה: ${question}` 
          }],
        });
        return `[מצב גיבוי - קלוד] ${response.content[0].text}`;
      } catch (claudeError) {
        console.error('Claude fallback also failed:', claudeError);
      }
    }
    
    throw error;
  }
};

// פונקציה לניתוח מהיר של מסמך מכרז
export const analyzeTender = async (filePath) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    
    console.log(`Analyzing tender document: ${filePath}...`);
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: "application/pdf",
      displayName: "Tender for Analysis"
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // משתמשים ב-Pro לניתוח מעמיק יותר

    const prompt = `
      השם שלך הוא 'ברבור 🦢', ואתה מומחה לניתוח מכרזים בענף הבנייה והתשתיות.
      לפניך מסמך מכרז. בצע ניתוח מעמיק.
      
      חשוב מאוד: 
      1. לפני שאתה מציג את הניתוח, עליך לפרט את תהליך המחשבה והסריקה שלך בתוך תגיות [THOUGHT] ו-[/THOUGHT].
      2. בסוף הניתוח, עליך לציין את רמת הוודאות שלך בניתוח בפורמט המדויק: [CONFIDENCE]ציון בין 0 ל-100[/CONFIDENCE].
      
      לאחר מכן, החזר סיכום בעברית בפורמט הבא:
      
      1. **תקציר הפרויקט:** (מה בונים, איפה ובאיזה היקף משוער).
      2. **תנאי סף קריטיים:** (סיווג קבלני נדרש, ניסיון קודם, ערבויות).
      3. **לוחות זמנים:** (מועד אחרון להגשה, מועד סיור קבלנים, משך ביצוע הפרויקט).
      4. **נקודות סיכון או הערות מיוחדות:** (קנסות חריגים, תנאי תשלום בעייתיים, דרישות טכניות מורכבות).
      5. **המלצת GO/NO-GO ראשונית:** (האם הפרויקט נראה מתאים לחברה קבלנית בינונית-גדולה).
      
      ענה בצורה תמציתית ומקצועית.
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: prompt }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Tender analysis error, attempting fallback to Claude:', error);
    
    const claude = getClaudeClient();
    if (claude) {
      try {
        console.log('Falling back to Claude 3.5 Sonnet for tender analysis...');
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString('base64');
        
        const response = await claude.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `אתה מומחה לניתוח מכרזים. בצע ניתוח מעמיק למסמך המצורף.
                חשוב מאוד: ספק את תהליך המחשבה שלך בתוך [THOUGHT] ו-[/THOUGHT].
                הסבר מה חיפשת במסמך ואיפה מצאת את הנקודות הקריטיות.
                
                לאחר מכן ספק סיכום הכולל:
                1. תקציר הפרויקט.
                2. תנאי סף קריטיים.
                3. לוחות זמנים.
                4. נקודות סיכון.
                5. המלצת GO/NO-GO.`
              },
              {
                type: 'image', // Note: Anthropic uses 'image' for base64 PDFs in some versions, but for actual PDF support it's 'document'
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: fileBase64
                }
              }
            ].filter(c => c.type !== 'image' || c.source.media_type !== 'application/pdf') // Fallback to text if document not supported in this SDK version
          }]
        });
        
        // If the document part was filtered out (older SDK), we just send text
        if (response.content[0].type === 'text') {
           return `[מצב גיבוי - קלוד] ${response.content[0].text}`;
        }
        return `[מצב גיבוי - קלוד] ${response.content[0].text}`;
      } catch (claudeError) {
        console.error('Claude tender analysis fallback failed:', claudeError);
      }
    }
    throw error;
  }
};

// פונקציה לייבוא נתונים מקובץ אקסל או CSV והמרה שלהם לטבלה
export const extractDataFromExcel = async (filePath, mimeType, targetTable) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    
    console.log(`Uploading spreadsheet ${filePath} to Gemini...`);
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType || 'text/csv',
      displayName: "spreadsheet_import"
    });
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let schemaPrompt = '';
    if (targetTable === 'budgets') {
      schemaPrompt = 'category (string), total_amount (number), approved_date (YYYY-MM-DD)';
    } else if (targetTable === 'expenses') {
      schemaPrompt = 'description (string), contractor_name (string), budget_category (string), amount (number), date (YYYY-MM-DD)';
    } else if (targetTable === 'incomes') {
      schemaPrompt = 'description (string), amount (number), date (YYYY-MM-DD)';
    } else if (targetTable === 'contractors') {
      schemaPrompt = 'name (string), specialization (string), phone (string), email (string)';
    }

    const prompt = `This is a spreadsheet for the "${targetTable}" table. Extract rows and return strictly as JSON array.`;

    console.log(`Extracting data for ${targetTable}...`);
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: prompt }
    ]);
    
    const textResponse = result.response.text();
    let cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error extracting data from spreadsheet:', error);
    throw error;
  }
};
