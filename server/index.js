import express from 'express'; // הלב של השרת - מאפשר לנו להגדיר כתובות (נתיבים) ולקבל בקשות
import cors from 'cors'; // שומר עלינו מהדפדפן - מאפשר לאתר לדבר עם השרת בלי שהאבטחה תחסום אותו
import multer from 'multer'; // האיש שאחראי על הדואר - הוא מקבל את הקבצים שאתה מעלה ושומר אותם בתיקייה הנכונה
import path from 'path'; // עוזר לנו לחבר נתיבי תיקיות בלי להתבלבל בין ווינדוס למק
import fs from 'fs'; // מאפשר לנו לקרוא ולכתוב קבצים אמיתיים על הדיסק של השרת
import { Storage } from '@google-cloud/storage'; // החיבור הישיר למחסן הקבצים של גוגל בענן
import db from './db.js'; // החיבור שלנו למסד הנתונים שזוכר הכל (פרויקטים, כסף, משימות)
import './seed.js'; // קוד קטן שדואג שיהיו לנו נתונים התחלתיים אם הכל ריק
import { ingestDocument, askQuestion, analyzeReceipt, analyzeTender, generateProposal } from './ai.js'; // כל הקסמים של ברבור

const app = express(); // יוצרים את המכונה של השרת
const PORT = process.env.PORT || 3001; // קובעים על איזה "פורט" הוא יקשיב (3001 בדרך כלל)

// מוודאים שיש לנו מקום לשמור קבצים שמעלים למערכת
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// הגדרות למנוע העלאת הקבצים - אנחנו שומרים אותם עם תאריך כדי שלא ידרסו אחד את השני
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// הגדרות לעבודה מול הענן של גוגל (Storage)
let storageClient = null;
const getStorageClient = () => {
  if (!storageClient) {
    try { storageClient = new Storage(); } catch (err) { return null; }
  }
  return storageClient;
};
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'barsuf-media-storage-1777314059';

app.use(cors()); // מאשרים תקשורת חופשית
app.use(express.json()); // מאפשרים לשלוח ולקבל מידע בפורמט JSON (המפה של הנתונים)

// בדיקת "דופק" לשרת - לראות שהכל עובד ונושם
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- עולם הפרויקטים ---
app.get('/api/projects', (req, res) => { // מחזיר את רשימת כל הפרויקטים שיש לנו
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => { // מחזיר פרויקט ספציפי
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

app.post('/api/projects', (req, res) => { // יוצר פרויקט חדש לגמרי
  const { name, location, end_date, status } = req.body;
  const insert = db.prepare('INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)');
  const result = insert.run(name, location, end_date, status);
  res.status(201).json({ id: result.lastInsertRowid });
});

// --- עולם הכסף (תקציב והוצאות) ---
app.get('/api/budgets', (req, res) => { // מושך את סעיפי התקציב של פרויקט מסוים
  const { projectId } = req.query;
  const budgets = db.prepare('SELECT * FROM budgets WHERE project_id = ?').all(projectId);
  res.json(budgets);
});

app.post('/api/expenses', (req, res) => { // רושם הוצאה חדשה במערכת
  const { project_id, budget_id, contractor_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, budget_id, contractor_id, amount, date, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.get('/api/expenses', (req, res) => { // קבלת הוצאות
  const { projectId } = req.query;
  const expenses = db.prepare('SELECT * FROM expenses WHERE project_id = ?').all(projectId);
  res.json(expenses);
});

// --- עולם ה-AI וברבור ---
app.post('/api/projects/:id/chat', async (req, res) => { // זה הקישור לצ'אט עם ברבור על מסמכי הפרויקט
  const { question } = req.body;
  try {
    const answer = await askQuestion(req.params.id, question);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: 'ברבור קצת מבולבל כרגע, נסה שוב בעוד דקה.' });
  }
});

app.get('/api/projects/:id/files', (req, res) => { // קבלת רשימת קבצים של פרויקט
  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id);
  res.json(files);
});

app.post('/api/projects/:id/files', upload.single('file'), async (req, res) => { // העלאת קובץ לניתוח
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const insert = db.prepare('INSERT INTO files (project_id, filename, original_name, upload_date) VALUES (?, ?, ?, ?)');
  insert.run(req.params.id, req.file.filename, req.file.originalname, new Date().toISOString());
  await ingestDocument(req.params.id, req.file.path);
  res.json({ success: true });
});

// --- ניהול מכרזים חכם ---
app.get('/api/tenders', (req, res) => { // מביא את כל המכרזים שהועלו
  const tenders = db.prepare('SELECT * FROM tenders ORDER BY upload_date DESC').all();
  res.json(tenders);
});

app.post('/api/tenders', upload.single('file'), async (req, res) => { // מעלה מכרז חדש ומתחיל לנתח אותו
  if (!req.file) return res.status(400).send('לא העלית קובץ!');
  const insert = db.prepare('INSERT INTO tenders (name, filename, upload_date, status) VALUES (?, ?, ?, ?)');
  const info = insert.run(req.file.originalname, req.file.filename, new Date().toISOString(), 'מעלה קובץ...');
  const tenderId = info.lastInsertRowid;
  
  // הניתוח רץ ברקע עם דיווח סטטוס חי
  analyzeTender(req.file.path, tenderId).then(analysis => {
    db.prepare('UPDATE tenders SET analysis = ?, status = ? WHERE id = ?').run(analysis, 'נותח', tenderId);
    ingestDocument('global', req.file.path);
  }).catch(err => {
    db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה בניתוח', tenderId);
  });

  res.status(201).json({ id: tenderId });
});

app.post('/api/tenders/:id/proposal', async (req, res) => { // פקודה לברבור: "תכין לי הצעת מחיר"
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
  if (!tender) return res.status(404).send('מכרז לא נמצא');
  
  generateProposal(path.join(UPLOADS_DIR, tender.filename), req.params.id).then(proposal => {
    db.prepare('UPDATE tenders SET proposal = ?, status = ? WHERE id = ?').run(proposal, 'הצעה מוכנה', req.params.id);
  }).catch(err => {
    db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה בהפקת הצעה', req.params.id);
  });
  
  res.json({ success: true, message: 'הפקת ההצעה החלה' });
});

// --- דוחות וגרפים ---
app.get('/api/analytics/global', (req, res) => { // מחזיר מספרים גדולים לכל החברה (כמה כסף נכנס, כמה יצא)
  const data = db.prepare(`
    SELECT 
      (SELECT SUM(total_amount) FROM budgets) as totalBudget,
      (SELECT SUM(amount) FROM expenses) as totalExpenses,
      (SELECT SUM(amount) FROM incomes) as totalIncomes,
      (SELECT COUNT(*) FROM projects) as totalProjects,
      (SELECT COUNT(*) FROM projects WHERE status = 'תקין') as activeProjects
  `).get();
  res.json(data);
});

// מפעילים את השרת וגורמים לו להקשיב לעולם
const server = app.listen(PORT, () => {
  console.log(`🚀 השרת של בארסוף רץ על פורט ${PORT}`);
});
