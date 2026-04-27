import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { Ollama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import vision from '@google-cloud/vision';
import { fromPath } from 'pdf2pic';

// Initialize Google Cloud Vision Client
const visionClient = new vision.ImageAnnotatorClient();

const VECTOR_STORE_DIR = path.join(process.cwd(), 'server', 'data', 'vectorstores');

// Ensure directory exists
if (!fs.existsSync(VECTOR_STORE_DIR)) {
  fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Initialize Ollama embeddings and LLM
// כאן אנחנו משתמשים במודל nomic-embed-text שהוא מודל קטן ומהיר במיוחד (רק בשביל קריאת המסמכים)
// זה יקצר את זמן ההעלאה ב-90%!
const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
  baseUrl: OLLAMA_BASE_URL,
});

const model = new Ollama({
  model: 'llama3',
  temperature: 0.1,
  baseUrl: OLLAMA_BASE_URL,
});

export const ingestDocument = async (projectId, filePath) => {
  try {
    // 1. Load PDF
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();

    // 2. Split text
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    let docs = await textSplitter.splitDocuments(rawDocs);

    // חקירת כמות הטקסט הטבעי שחולץ מהמסמך
    const totalChars = docs.reduce((acc, doc) => acc + (doc.pageContent ? doc.pageContent.length : 0), 0);
    
    // בדיקה אם המסמך ריק או שאין בו מספיק טקסט קריא (מסמך סרוק, שרטוט, או חשבונית עם מעט טקסט)
    // קריאת PDF רגילה נוטה להרוס טבלאות ושורות תחתונות. ה-OCR של גוגל הרבה יותר חכם.
    if (!docs || docs.length === 0 || totalChars < 3000) {
      console.log(`Native text extraction yielded ${totalChars} chars. Triggering Google Cloud Vision OCR for better accuracy...`);
      const ocrText = await performOCR(filePath);
      
      if (!ocrText || ocrText.trim() === '') {
        throw new Error("לא נמצא טקסט קריא במסמך גם לאחר סריקת OCR מתקדמת. ייתכן שהמסמך ריק לגמרי.");
      }
      
      // יצירת מסמך LangChain חדש מהטקסט שחולץ ב-OCR
      const ocrDoc = {
        pageContent: ocrText,
        metadata: { source: filePath, isOCR: true }
      };
      
      docs = await textSplitter.splitDocuments([ocrDoc]);
    }

    // 3. Create or load vector store
    const storePath = path.join(VECTOR_STORE_DIR, `project_${projectId}`);
    let vectorStore;
    
    if (fs.existsSync(path.join(storePath, 'args.json'))) {
      // אם כבר יש לנו זיכרון לפרויקט הזה (כלומר קובץ ההגדרות קיים), נטען אותו ונוסיף אליו
      vectorStore = await HNSWLib.load(storePath, embeddings);
      await vectorStore.addDocuments(docs);
    } else {
      // אם אין עדיין זיכרון, נייצר אחד חדש מאפס
      vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    }
    
    // 4. Save vector store
    await vectorStore.save(storePath);
    
    return true;
  } catch (error) {
    console.error('Error ingesting document:', error);
    throw error;
  }
};

export const askQuestion = async (projectId, question) => {
  try {
    const storePath = path.join(VECTOR_STORE_DIR, `project_${projectId}`);
    
    if (!fs.existsSync(path.join(storePath, 'args.json'))) {
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה. אנא העלה מסמכים תחילה.";
    }

    // טוען את הזיכרון הקיים של הפרויקט
    const vectorStore = await HNSWLib.load(storePath, embeddings);
    const retriever = vectorStore.asRetriever(4); // Get top 4 most relevant chunks
    
    const relevantDocs = await retriever.invoke(question);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    const prompt = PromptTemplate.fromTemplate(`
      You are an AI assistant for a construction project management system.
      Answer the user's question in Hebrew based ONLY on the following context.
      If you don't know the answer based on the context, say "אין לי מידע לגבי זה במסמכים שהועלו".
      
      Context:
      {context}
      
      Question: {question}
      
      Answer in Hebrew:
    `);

    const chain = RunnableSequence.from([
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      context,
      question,
    });

    return response;
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};

/**
 * מפעיל סריקת תמונה (OCR) על קובץ PDF
 * ממיר את ה-PDF לתמונות ושולח ל-Google Cloud Vision API
 */
async function performOCR(filePath) {
  let fullText = '';
  
  try {
    // הגדרות להמרת PDF לתמונות
    const options = {
      density: 300,           // איכות גבוהה לשרטוטים
      saveFilename: "ocr_page",
      savePath: "/tmp",
      format: "png",
      width: 2550,            // רוחב מתאים לשרטוטים ואותיות קטנות
      height: 3300
    };
    
    const convert = fromPath(filePath, options);
    
    // המרת כל הדפים (-1) במכה אחת וקבלת התמונות בתור באפר
    const pages = await convert.bulk(-1, { responseType: "buffer" });
    
    console.log(`PDF converted to ${pages.length} images for OCR.`);

    // סריקת כל דף דרך Vision API
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!page || !page.buffer) continue;
      
      console.log(`Processing page ${i + 1} with Google Vision API...`);
      const [result] = await visionClient.documentTextDetection({
        image: { content: page.buffer }
      });
      
      if (result.fullTextAnnotation && result.fullTextAnnotation.text) {
        fullText += `--- Page ${i + 1} ---\n`;
        fullText += result.fullTextAnnotation.text + "\n\n";
      }
    }
    
    return fullText;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('שגיאה בתהליך ה-OCR: ' + error.message);
  }
}
