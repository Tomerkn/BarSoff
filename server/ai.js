import fs from 'fs'; // כלי לעבודה עם קבצים
import path from 'path'; // כלי לטיפול בנתיבי קבצים
import { GoogleGenerativeAI } from '@google/generative-ai'; // התחברות לבינה המלאכותית של גוגל
import { GoogleAIFileManager } from '@google/generative-ai/server'; // ניהול קבצים מול גוגל
import db from './db.js'; // חיבור למסד הנתונים

const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache'); // תיקייה לשמירת זיכרון זמני של ה-AI

// מוודא שתיקיית הקאש קיימת במחשב
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// פונקציה שמביאה את המפתחות שצריך כדי לדבר עם ה-AI של גוגל
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY; // לוקחים את המפתח מהגדרות המערכת
  if (!apiKey) { // אם שכחו לשים מפתח
    throw new Error('GEMINI_API_KEY is missing! אנא הוסף מפתח התחברות כדי שברבור יוכל לפעול.');
  }
  return {
    genAI: new GoogleGenerativeAI(apiKey), // יוצרים חיבור ל-AI
    fileManager: new GoogleAIFileManager(apiKey) // יוצרים חיבור לניהול קבצים
  };
};

// העלאת מסמך ללימוד של ה-AI ושמירה שלו בזיכרון המקומי
export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients(); // מקבלים את הגישה לגוגל
    
    console.log(`Uploading ${filePath} to Gemini File API...`);
    // מעלים את הקובץ לשרתים של גוגל - הם יודעים לקרוא שרטוטים, טבלאות ומסמכים בקלות
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: `Project ${projectId} Document`
    });

    console.log(`Upload complete. Gemini URI: ${uploadResponse.file.uri}`);

    // שומרים את המידע בקובץ פשוט אצלנו, כדי שנדע על אילו קבצים לענות כשישאלו אותנו שאלות
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    let files = [];
    if (fs.existsSync(cachePath)) { // אם כבר יש קבצים לפרויקט הזה
      files = JSON.parse(fs.readFileSync(cachePath, 'utf-8')); // קוראים אותם
    }
    
    files.push({ // מוסיפים את הקובץ החדש לרשימה
      name: uploadResponse.file.name,
      uri: uploadResponse.file.uri,
      mimeType: uploadResponse.file.mimeType,
      localPath: filePath,
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
export const askQuestion = async (projectId, question) => {
  try {
    const { genAI, fileManager } = getGeminiClients(); // גישה לגוגל
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    
    if (!fs.existsSync(cachePath)) { // אם אין מסמכים בכלל
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה. אנא העלה מסמכים תחילה.";
    }

    let files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    if (files.length === 0) {
      return "הפרויקט ריק ממסמכים.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // מפעילים את המוח

    // פה אנחנו מגדירים ל-AI מי הוא ואיך להתנהג
    const promptParts = [
      { text: "אתה עוזר בינה מלאכותית למנהל פרויקטים בבנייה ששמו 'ברבור 🦢'. המשתמש יצרף מסמכים (כמו תוכניות חשמל, קבלות, חשבוניות וכו'). עליך לענות לו באופן מדויק על השאלה על סמך המסמכים המצורפים. הקפד לקרוא היטב טבלאות ושרטוטים. ענה בעברית בלבד ובטון חברי ועוזר. חשוב מאוד: אל תשתמש בעיצוב Markdown (כמו כוכביות להדגשה) ואל תשתמש בסימונים מתמטיים באנגלית. כתוב את כל המספרים והחישובים כטקסט פשוט וברור בעברית. אם אינך מוצא את התשובה במסמכים, אמור פשוט שאין לך מידע כזה שם. הנה השאלה:\n\n" + question }
    ];

    let fileListText = "רשימת המסמכים המצורפים כרגע לפרויקט:\n";

    for (const file of files) { // מצרפים את כל הקבצים לשאלה כדי שה-AI יקרא אותם
      const originalName = file.localPath ? path.basename(file.localPath).split('-').slice(1).join('-') : file.name;
      fileListText += `- ${originalName || 'מסמך ללא שם'} (הועלה בתאריך: ${new Date(file.uploadTime).toLocaleDateString('he-IL')})\n`;
      
      promptParts.unshift({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      });
    }

    // מביאים גם מידע מהגלריה של הפרויקט
    try {
      let mediaFiles = [];
      try {
        mediaFiles = db.prepare('SELECT original_name, upload_date, folder FROM project_media WHERE project_id = ?').all(projectId);
      } catch (e) {
        mediaFiles = db.prepare('SELECT original_name, upload_date FROM project_media WHERE project_id = ?').all(projectId);
      }

      if (mediaFiles.length > 0) {
        fileListText += "\nבנוסף, יש בגלריה את התמונות/מסמכים הבאים:\n";
        for (const media of mediaFiles) {
          const folderText = media.folder ? `תיקייה: ${media.folder}` : '';
          fileListText += `- ${media.original_name} (${folderText} | בתאריך: ${new Date(media.upload_date).toLocaleDateString('he-IL')})\n`;
        }
      }
    } catch (e) {
      console.error("Could not fetch project media for prompt", e);
    }

    // מביאים את המשימות של הגאנט
    try {
      let tasks = [];
      try {
        tasks = db.prepare('SELECT name, start_date, end_date, progress FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(projectId);
      } catch (e) {
        // אם הטבלה עדיין לא קיימת
      }

      if (tasks.length > 0) {
        fileListText += "\n\nלהלן לוח הזמנים (Gantt) של הפרויקט:\n";
        for (const task of tasks) {
          fileListText += `- משימה: "${task.name}", תאריכים: ${task.start_date} עד ${task.end_date}, התקדמות: ${task.progress}%\n`;
        }
      }
    } catch (e) {
      console.error("Could not fetch project tasks for prompt", e);
    }

    promptParts.push({ text: `\n\n${fileListText}\n\nאם המשתמש שואל אילו קבצים יש, תסכם לו את הרשימה.` });

    console.log(`Asking Gemini question across ${files.length} documents...`);
    const result = await model.generateContent(promptParts); // מבקשים תשובה סופית
    return result.response.text(); // מחזירים את התשובה
  } catch (error) {
    console.error('Error asking question via Gemini:', error);
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
