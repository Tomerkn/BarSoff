import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache');

// מוודא שתיקיית הקאש קיימת
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// התחברות ל-API של גוגל ג'מיני
// במידה ואין מפתח, המערכת תזרוק שגיאה ברורה
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing! אנא הוסף מפתח התחברות כדי שברבור יוכל לפעול.');
  }
  return {
    genAI: new GoogleGenerativeAI(apiKey),
    fileManager: new GoogleAIFileManager(apiKey)
  };
};

/**
 * העלאת מסמך לג'מיני ושמירת המזהה (URI) שלו בזיכרון המקומי
 */
export const ingestDocument = async (projectId, filePath) => {
  try {
    const { fileManager } = getGeminiClients();
    
    console.log(`Uploading ${filePath} to Gemini File API...`);
    // העלאת הקובץ לשרתים של גוגל - הם יודעים להתמודד עם שרטוטים, טבלאות ו-PDF ענקיים בקלות
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: "application/pdf",
      displayName: `Project ${projectId} Document`
    });

    console.log(`Upload complete. Gemini URI: ${uploadResponse.file.uri}`);

    // שמירת הנתונים בקובץ קאש פשוט, כדי שנדע באילו קבצים להשתמש כשהמשתמש שואל שאלה
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    let files = [];
    if (fs.existsSync(cachePath)) {
      files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
    
    files.push({
      name: uploadResponse.file.name,
      uri: uploadResponse.file.uri,
      mimeType: uploadResponse.file.mimeType,
      localPath: filePath,
      uploadTime: Date.now()
    });

    fs.writeFileSync(cachePath, JSON.stringify(files, null, 2));
    return true;
  } catch (error) {
    console.error('Error ingesting document via Gemini:', error);
    throw error;
  }
};

/**
 * שאלת שאלה על סמך כל המסמכים שהועלו לפרויקט
 */
export const askQuestion = async (projectId, question) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    
    if (!fs.existsSync(cachePath)) {
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה. אנא העלה מסמכים תחילה.";
    }

    let files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    if (files.length === 0) {
      return "הפרויקט ריק ממסמכים.";
    }

    // המודל המתקדם והמהיר של גוגל
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // יצירת מערך שכולל את כל הקבצים וגם את ההוראה + השאלה
    const promptParts = [
      { text: "אתה עוזר בינה מלאכותית למנהל פרויקטים בבנייה ששמו 'ברבור 🦢'. המשתמש יצרף מסמכים (כמו תוכניות חשמל, קבלות, חשבוניות וכו'). עליך לענות לו באופן מדויק על השאלה על סמך המסמכים המצורפים. הקפד לקרוא היטב טבלאות ושרטוטים. ענה בעברית בלבד ובטון חברי ועוזר. אם אינך מוצא את התשובה במסמכים, אמור פשוט שאין לך מידע כזה שם. הנה השאלה:\n\n" + question }
    ];

    // הוספת כל המסמכים של הפרויקט להקשר של המודל
    for (const file of files) {
      promptParts.unshift({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      });
    }

    console.log(`Asking Gemini question across ${files.length} documents...`);
    const result = await model.generateContent(promptParts);
    return result.response.text();
  } catch (error) {
    console.error('Error asking question via Gemini:', error);
    throw error;
  }
};
