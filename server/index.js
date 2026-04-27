import express from 'express'; // מביאים את אקספרס לבניית השרת
import cors from 'cors'; // מאפשרים לאתר לדבר עם השרת בלי בעיות אבטחה
import multer from 'multer'; // כלי לטיפול בהעלאת קבצים
import path from 'path'; // כלי לטיפול בנתיבי קבצים
import fs from 'fs'; // כלי לעבודה עם מערכת הקבצים של המחשב
import { Storage } from '@google-cloud/storage'; // התחברות לאחסון הענן של גוגל
import db from './db.js'; // מביאים את החיבור למסד הנתונים שלנו
import './seed.js'; // מוודאים שיש נתונים ראשוניים בבסיס הנתונים
import { ingestDocument, askQuestion, analyzeReceipt } from './ai.js'; // מביאים את המוח של הבינה המלאכותית

const app = express(); // יוצרים את האפליקציה של השרת
const PORT = process.env.PORT || 3001; // קובעים על איזה פורט השרת ירוץ

// הגדרת תיקיית העלאות
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'data', 'uploads'); // נתיב לתיקיית הקבצים
if (!fs.existsSync(UPLOADS_DIR)) { // אם התיקייה לא קיימת
  fs.mkdirSync(UPLOADS_DIR, { recursive: true }); // יוצרים אותה
}

// הגדרות להעלאת קבצים (מולטר)
const storage = multer.diskStorage({ // קובעים איפה ואיך לשמור את הקבצים הזמניים
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // שומרים בתיקיית ההעלאות
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // מוסיפים תאריך לשם הקובץ כדי שלא יהיו כפילויות
  }
});
const upload = multer({ storage }); // מפעילים את המנגנון

// חיבור לאחסון של גוגל
const storageClient = new Storage(); // יוצרים לקוח ענן
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'barsuf-media-storage-1777314059'; // שם הדלי בענן

app.use(cors()); // מפעילים קורס
app.use(express.json()); // מאפשרים לשרת לקרוא מידע בפורמט JSON

// --- פרויקטים ---
app.get('/api/projects', (req, res) => { // קבלת כל הפרויקטים
  const projects = db.prepare('SELECT * FROM projects').all(); // מושכים מהדאטהבייס
  res.json(projects); // מחזירים למשתמש
});

app.get('/api/projects/:id', (req, res) => { // קבלת פרויקט ספציפי
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id); // מחפשים לפי תעודת זהות
  if (!project) return res.status(404).json({ error: 'Project not found' }); // אם לא נמצא
  res.json(project); // מחזירים את הפרויקט
});

app.post('/api/projects', (req, res) => { // הוספת פרויקט חדש
  const { name, location, end_date, status } = req.body; // מקבלים את הפרטים
  const insert = db.prepare('INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)'); // מכינים פקודת הוספה
  const result = insert.run(name, location, end_date, status); // מריצים
  res.status(201).json({ id: result.lastInsertRowid }); // מחזירים את המספר של הפרויקט החדש
});

// --- תקציבים ---
app.get('/api/budgets', (req, res) => { // קבלת תקציבים
  const { projectId } = req.query; // בודקים אם ביקשו פרויקט מסוים
  let query = 'SELECT * FROM budgets'; // שאילתא בסיסית
  let params = [];
  if (projectId) {
    query += ' WHERE project_id = ?'; // סינון לפי פרויקט
    params.push(projectId);
  }
  const budgets = db.prepare(query).all(params); // מריצים
  res.json(budgets); // מחזירים
});

app.post('/api/budgets', (req, res) => { // הוספת סעיף תקציב
  const { project_id, category, total_amount, approved_date } = req.body;
  const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
  const result = insert.run(project_id, category, total_amount, approved_date);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/budgets/:id', (req, res) => { // עדכון סעיף תקציב
  const { category, total_amount, approved_date } = req.body;
  const update = db.prepare('UPDATE budgets SET category = ?, total_amount = ?, approved_date = ? WHERE id = ?');
  update.run(category, total_amount, approved_date, req.params.id);
  res.json({ success: true });
});

app.delete('/api/budgets/:id', (req, res) => { // מחיקת סעיף תקציב
  const stmt = db.prepare('DELETE FROM budgets WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- הוצאות ---
app.get('/api/expenses', (req, res) => { // קבלת הוצאות
  const { projectId } = req.query;
  let query = 'SELECT expenses.*, contractors.name as contractor_name, budgets.category as budget_category FROM expenses LEFT JOIN contractors ON expenses.contractor_id = contractors.id LEFT JOIN budgets ON expenses.budget_id = budgets.id';
  let params = [];
  if (projectId) {
    query += ' WHERE expenses.project_id = ?';
    params.push(projectId);
  }
  query += ' ORDER BY expenses.date DESC';
  const expenses = db.prepare(query).all(params);
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => { // הוספת הוצאה
  const { project_id, budget_id, contractor_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, budget_id, contractor_id, amount, date, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/expenses/:id', (req, res) => { // עדכון הוצאה
  const { budget_id, contractor_id, amount, date, description } = req.body;
  const update = db.prepare('UPDATE expenses SET budget_id = ?, contractor_id = ?, amount = ?, date = ?, description = ? WHERE id = ?');
  update.run(budget_id, contractor_id, amount, date, description, req.params.id);
  res.json({ success: true });
});

app.delete('/api/expenses/:id', (req, res) => { // מחיקת הוצאה
  const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- קבלנים ---
app.get('/api/contractors', (req, res) => { // קבלת רשימת קבלנים
  const contractors = db.prepare('SELECT * FROM contractors').all();
  res.json(contractors);
});

app.post('/api/contractors', (req, res) => { // הוספת קבלן
  const { name, specialization, phone, email } = req.body;
  const insert = db.prepare('INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)');
  const result = insert.run(name, specialization, phone, email);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/contractors/:id', (req, res) => { // עדכון קבלן
  const { name, specialization, phone, email } = req.body;
  const update = db.prepare('UPDATE contractors SET name = ?, specialization = ?, phone = ?, email = ? WHERE id = ?');
  update.run(name, specialization, phone, email, req.params.id);
  res.json({ success: true });
});

app.delete('/api/contractors/:id', (req, res) => { // מחיקת קבלן
  const stmt = db.prepare('DELETE FROM contractors WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- הזמנות ---
app.get('/api/orders', (req, res) => { // קבלת כל ההזמנות
  const orders = db.prepare('SELECT orders.*, projects.name as project_name FROM orders LEFT JOIN projects ON orders.project_id = projects.id ORDER BY orders.order_date DESC').all();
  res.json(orders);
});

app.post('/api/orders', (req, res) => { // יצירת הזמנה
  const { project_id, supplier_name, item_description, amount, order_date, status } = req.body;
  const insert = db.prepare('INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, supplier_name, item_description, amount, order_date, status);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/orders/:id', (req, res) => { // עדכון הזמנה
  const { supplier_name, item_description, amount, order_date, status } = req.body;
  const update = db.prepare('UPDATE orders SET supplier_name = ?, item_description = ?, amount = ?, order_date = ?, status = ? WHERE id = ?');
  update.run(supplier_name, item_description, amount, order_date, status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => { // מחיקת הזמנה
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- הכנסות ---
app.get('/api/incomes', (req, res) => { // קבלת כל ההכנסות
  const incomes = db.prepare('SELECT incomes.*, projects.name as project_name FROM incomes LEFT JOIN projects ON incomes.project_id = projects.id ORDER BY incomes.date DESC').all();
  res.json(incomes);
});

app.post('/api/incomes', (req, res) => { // תיעוד הכנסה חדשה
  const { project_id, description, amount, date } = req.body;
  const insert = db.prepare('INSERT INTO incomes (project_id, description, amount, date) VALUES (?, ?, ?, ?)');
  const result = insert.run(project_id, description, amount, date || new Date().toISOString().split('T')[0]);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/incomes/:id', (req, res) => { // עדכון הכנסה
  const { description, amount, date } = req.body;
  const update = db.prepare('UPDATE incomes SET description = ?, amount = ?, date = ? WHERE id = ?');
  update.run(description, amount, date, req.params.id);
  res.json({ success: true });
});

app.delete('/api/incomes/:id', (req, res) => { // מחיקת הכנסה
  const stmt = db.prepare('DELETE FROM incomes WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- יומני עבודה ---
app.get('/api/daily-logs', (req, res) => { // קבלת יומני עבודה
  const { projectId } = req.query;
  let query = 'SELECT * FROM daily_logs';
  let params = [];
  if (projectId) {
    query += ' WHERE project_id = ?';
    params.push(projectId);
  }
  query += ' ORDER BY date DESC';
  const logs = db.prepare(query).all(params);
  res.json(logs);
});

app.post('/api/daily-logs', (req, res) => { // כתיבת יומן עבודה
  const { project_id, date, manager_name, weather, workers_count, notes, image_url } = req.body;
  const insert = db.prepare('INSERT INTO daily_logs (project_id, date, manager_name, weather, workers_count, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, date, manager_name, weather, workers_count, notes, image_url);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/daily-logs/:id', (req, res) => { // עדכון יומן עבודה
  const { date, manager_name, weather, workers_count, notes, image_url } = req.body;
  const update = db.prepare('UPDATE daily_logs SET date = ?, manager_name = ?, weather = ?, workers_count = ?, notes = ?, image_url = ? WHERE id = ?');
  update.run(date, manager_name, weather, workers_count, notes, image_url, req.params.id);
  res.json({ success: true });
});

app.delete('/api/daily-logs/:id', (req, res) => { // מחיקת יומן
  const stmt = db.prepare('DELETE FROM daily_logs WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- שנת בדק ---
app.get('/api/warranty-tickets', (req, res) => { // קבלת קריאות שנת בדק
  const { projectId } = req.query;
  let query = 'SELECT w.*, c.name as contractor_name FROM warranty_tickets w LEFT JOIN contractors c ON w.contractor_id = c.id';
  let params = [];
  if (projectId) {
    query += ' WHERE w.project_id = ?';
    params.push(projectId);
  }
  query += ' ORDER BY w.id DESC';
  const tickets = db.prepare(query).all(params);
  res.json(tickets);
});

app.post('/api/warranty-tickets', (req, res) => { // פתיחת קריאת שירות
  const { project_id, customer_name, issue_description, contractor_id, status, open_date, close_date, notes } = req.body;
  const insert = db.prepare('INSERT INTO warranty_tickets (project_id, customer_name, issue_description, contractor_id, status, open_date, close_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, customer_name, issue_description, contractor_id, status || 'פתוח', open_date, close_date, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/warranty-tickets/:id', (req, res) => { // עדכון קריאת שירות
  const { customer_name, issue_description, contractor_id, status, open_date, close_date, notes } = req.body;
  const update = db.prepare('UPDATE warranty_tickets SET customer_name = ?, issue_description = ?, contractor_id = ?, status = ?, open_date = ?, close_date = ?, notes = ? WHERE id = ?');
  update.run(customer_name, issue_description, contractor_id, status, open_date, close_date, notes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/warranty-tickets/:id', (req, res) => { // מחיקת קריאה
  const stmt = db.prepare('DELETE FROM warranty_tickets WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// --- נתונים כלליים (דאשבורד ראשי) ---
app.get('/api/analytics/global', (req, res) => { // קבלת נתונים מכל הארגון
  const totalBudgetRow = db.prepare('SELECT SUM(total_amount) as total FROM budgets').get();
  const totalExpensesRow = db.prepare('SELECT SUM(amount) as total FROM expenses').get();
  const totalIncomesRow = db.prepare('SELECT SUM(amount) as total FROM incomes').get();
  
  const openWarrantyRow = db.prepare("SELECT COUNT(*) as count FROM warranty_tickets WHERE status != 'סגור'").get();
  const projectsRow = db.prepare("SELECT COUNT(*) as count FROM projects").get();
  const activeProjectsRow = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'תקין'").get();

  res.json({ // מחזירים סיכום של הכל
    totalBudget: totalBudgetRow.total || 0,
    totalExpenses: totalExpensesRow.total || 0,
    totalIncomes: totalIncomesRow.total || 0,
    openWarrantyTickets: openWarrantyRow.count || 0,
    totalProjects: projectsRow.count || 0,
    activeProjects: activeProjectsRow.count || 0,
  });
});

// --- נתונים לפרויקט ספציפי ---
app.get('/api/projects/:id/analytics', (req, res) => { // דוח כספי לפרויקט
  const projectId = req.params.id;
  
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const totalBudgetRow = db.prepare('SELECT SUM(total_amount) as total FROM budgets WHERE project_id = ?').get(projectId);
  const totalBudget = totalBudgetRow.total || 0;

  const actualExecutionRow = db.prepare('SELECT SUM(amount) as total FROM expenses WHERE project_id = ?').get(projectId);
  const actualExecution = actualExecutionRow.total || 0;

  const variance = actualExecution - totalBudget;
  const utilization = totalBudget > 0 ? (actualExecution / totalBudget) * 100 : 0;

  const totalIncomesRow = db.prepare('SELECT SUM(amount) as total FROM incomes WHERE project_id = ?').get(projectId);
  const totalIncomes = totalIncomesRow.total || 0;

  const profitLoss = totalIncomes - actualExecution;

  const breakdown = db.prepare(`
    SELECT b.id, b.category, b.total_amount as budget, SUM(e.amount) as actual 
    FROM budgets b 
    LEFT JOIN expenses e ON b.id = e.budget_id 
    WHERE b.project_id = ? 
    GROUP BY b.id
  `).all(projectId);

  res.json({ // החזרת נתונים לפרויקט
    project, // פרטי הפרויקט
    totalBudget, // תקציב כולל
    actualExecution, // ביצוע כולל
    totalIncomes, // הכנסות
    profitLoss, // רווח
    variance, // סטייה
    utilization, // אחוז ניצול
    breakdown // פירוט
  });
});

// --- ניהול קבצים ובינה מלאכותית ---
app.get('/api/projects/:id/files', (req, res) => { // קבלת רשימת קבצים של פרויקט
  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id); // שליפת קבצים
  res.json(files); // החזרת הרשימה
});

app.post('/api/projects/:id/files', upload.single('file'), async (req, res) => { // העלאת קובץ לניתוח בינה מלאכותית
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' }); // בדיקה שיש קובץ
  const projectId = req.params.id; // מזהה פרויקט
  const filename = req.file.filename; // שם קובץ שמור
  const originalName = req.file.originalname; // שם מקורי
  const filePath = req.file.path; // נתיב קובץ
  
  try { // ניסיון לביצוע הפעולה
    const insert = db.prepare('INSERT INTO files (project_id, filename, original_name, upload_date) VALUES (?, ?, ?, ?)'); // הכנת השאילתה
    insert.run(projectId, filename, originalName, new Date().toISOString()); // רישום במסד נתונים
    
    await ingestDocument(projectId, filePath); // שולחים את הקובץ למוח של ה-AI שילמד אותו
    
    res.json({ success: true, filename: originalName }); // הצלחה
  } catch (error) { // במקרה של שגיאה
    console.error('File ingest error:', error);
    if (error.status === 503 || (error.message && error.message.includes('503'))) {
      return res.status(503).json({ error: 'השרתים של גוגל עמוסים כרגע. אנא נסה להעלות את הקובץ שוב בעוד כמה דקות.' });
    }
    const errorMessage = error.message || 'שגיאה בעיבוד הקובץ מול ה-AI.';
    res.status(500).json({ error: errorMessage });
  }
});

// --- גלריית פרויקט ---
app.get('/api/projects/:id/media', (req, res) => { // קבלת תמונות וסרטונים
  const media = db.prepare('SELECT * FROM project_media WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id);
  res.json(media);
});

app.post('/api/projects/:id/media', upload.single('file'), async (req, res) => { // העלאת מדיה לענן
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const projectId = req.params.id;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const folder = req.body.folder || 'כללי';
  
  const safeFilename = encodeURIComponent(originalName.replace(/\s+/g, '-'));
  const destination = `projects/${projectId}/${Date.now()}-${safeFilename}`;
  
  try {
    await storageClient.bucket(BUCKET_NAME).upload(filePath, { // מעלים לענן של גוגל
      destination: destination,
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      }
    });
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`; // מקבלים כתובת אינטרנט לתמונה
    
    const insert = db.prepare('INSERT INTO project_media (project_id, filename, original_name, url, mime_type, folder, upload_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run(projectId, req.file.filename, originalName, publicUrl, mimeType, folder, new Date().toISOString());
    
    try {
      await ingestDocument(projectId, filePath, mimeType); // נותנים ל-AI ללמוד גם את המדיה הזו
      
      if (folder === 'קבלות') { // אם זו קבלה, מבקשים מה-AI להוציא ממנה נתונים כספיים באופן אוטומטי
        const receiptData = await analyzeReceipt(filePath, mimeType);
        if (receiptData && receiptData.amount) {
          let budget = db.prepare('SELECT id FROM budgets WHERE project_id = ? AND category = ?').get(projectId, 'כללי');
          if (!budget) {
            const insertBudget = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
            const info = insertBudget.run(projectId, 'כללי', 0, new Date().toISOString());
            budget = { id: info.lastInsertRowid };
          }

          const insertExpense = db.prepare('INSERT INTO expenses (project_id, budget_id, amount, date, description) VALUES (?, ?, ?, ?, ?)');
          insertExpense.run(
            projectId, 
            budget.id, 
            receiptData.amount, 
            receiptData.date || new Date().toISOString().split('T')[0], 
            receiptData.description || `קבלה: ${receiptData.supplier || 'ספק כללי'}`
          );
        }
      }
    } catch (aiError) {
      console.error('AI Processing error (non-fatal):', aiError);
    }
    
    if (fs.existsSync(filePath)) { // מוחקים את הקובץ המקומי כי הוא כבר בענן
      fs.unlinkSync(filePath);
    }
    
    res.status(201).json({ success: true, url: publicUrl, message: 'Media uploaded successfully' });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Failed to upload media to cloud storage' });
  }
});

app.post('/api/projects/:id/chat', async (req, res) => { // שאלות ל-AI (ברבור)
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });
  
  try {
    const answer = await askQuestion(req.params.id, question); // מקבלים תשובה מה-AI על סמך מסמכי הפרויקט
    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.status === 503 || (error.message && error.message.includes('503'))) {
      return res.status(503).json({ error: 'ברבור חווה עומס זמני בשרתי גוגל כרגע. אנא נסה לשאול שוב מאוחר יותר.' });
    }
    res.status(500).json({ error: 'התגלתה שגיאה בתקשורת עם מנוע הבינה. אנא נסה שוב מאוחר יותר.' });
  }
});

// --- ייבוא מאקסל באמצעות AI ---
app.post('/api/projects/:id/import-excel', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const projectId = req.params.id;
  const targetTable = req.body.targetTable;
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;

  if (!['budgets', 'expenses', 'incomes', 'contractors'].includes(targetTable)) {
    return res.status(400).json({ error: 'Invalid target table' });
  }

  try {
    const { extractDataFromExcel } = await import('./ai.js'); // טעינה דינמית של המוח
    const extractedItems = await extractDataFromExcel(filePath, mimeType, targetTable); // מוציאים נתונים מהאקסל
    
    if (!extractedItems || !Array.isArray(extractedItems) || extractedItems.length === 0) {
      throw new Error('No valid data extracted from the file');
    }

    let insertedCount = 0;
    
    for (const item of extractedItems) { // מכניסים כל שורה מהאקסל לדאטהבייס
      if (targetTable === 'budgets') {
        const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
        insert.run(projectId, item.category || 'כללי', item.total_amount || 0, item.approved_date || new Date().toISOString().split('T')[0]);
        insertedCount++;
      } else if (targetTable === 'expenses') {
        let contractorId = null;
        if (item.contractor_name) {
          const c = db.prepare('SELECT id FROM contractors WHERE name LIKE ?').get(`%${item.contractor_name}%`);
          if (c) contractorId = c.id;
          else {
            const ci = db.prepare('INSERT INTO contractors (name) VALUES (?)').run(item.contractor_name);
            contractorId = ci.lastInsertRowid;
          }
        }
        
        let budgetId = null;
        if (item.budget_category) {
          const b = db.prepare('SELECT id FROM budgets WHERE project_id = ? AND category LIKE ?').get(projectId, `%${item.budget_category}%`);
          if (b) budgetId = b.id;
          else {
            const bi = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)').run(projectId, item.budget_category, 0, new Date().toISOString().split('T')[0]);
            budgetId = bi.lastInsertRowid;
          }
        }

        const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run(projectId, budgetId, contractorId, item.amount || 0, item.date || new Date().toISOString().split('T')[0], item.description || 'הוצאה מיובאת');
        insertedCount++;
      } else if (targetTable === 'incomes') {
        const insert = db.prepare('INSERT INTO incomes (project_id, description, amount, date) VALUES (?, ?, ?, ?)');
        insert.run(projectId, item.description || 'הכנסה מיובאת', item.amount || 0, item.date || new Date().toISOString().split('T')[0]);
        insertedCount++;
      }
    }

    if (fs.existsSync(filePath)) { // מנקים קובץ זמני
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, count: insertedCount, message: `Successfully imported ${insertedCount} rows.` });
  } catch (error) {
    console.error('Excel Import error:', error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: error.message || 'Failed to import data via AI' });
  }
});

// --- משימות וגאנט ---
app.get('/api/projects/:id/tasks', (req, res) => { // קבלת לוח זמנים
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(req.params.id);
    res.json(tasks);
  } catch (error) {
    console.error('Failed to get tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/projects/:id/tasks', (req, res) => { // הוספת משימה
  const { name, start_date, end_date, progress = 0, status = 'pending' } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    const insert = db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress, status) VALUES (?, ?, ?, ?, ?, ?)');
    const info = insert.run(req.params.id, name, start_date, end_date, progress, status);
    res.status(201).json({ id: info.lastInsertRowid, project_id: req.params.id, name, start_date, end_date, progress, status });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', (req, res) => { // עדכון משימה
  const { name, start_date, end_date, progress, status } = req.body;
  try {
    const update = db.prepare('UPDATE tasks SET name = ?, start_date = ?, end_date = ?, progress = ?, status = ? WHERE id = ?');
    update.run(name, start_date, end_date, progress, status, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', (req, res) => { // מחיקת משימה
  try {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// סנכרון עם Monday (אופציונלי)
app.post('/api/projects/:id/sync-monday', async (req, res) => {
  const { token, boardId } = req.body;
  if (!token || !boardId) return res.status(400).json({ error: 'Missing Monday credentials' });
  
  try {
    const query = `query { boards (ids: [${boardId}]) { items_page (limit: 100) { items { id name column_values { id text } } } } }`;
    const response = await fetch('https://api.monday.com/v2', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) throw new Error('Monday API request failed');
    const data = await response.json();
    
    if (data.errors) throw new Error(data.errors[0].message);
    if (!data.data.boards || data.data.boards.length === 0) throw new Error('Board not found');
    
    const items = data.data.boards[0].items_page.items;
    
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress, status) VALUES (?, ?, ?, ?, ?, ?)');
    
    const today = new Date();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let startDateStr = '';
      let endDateStr = '';
      let progress = 0;
      let status = 'pending';
      
      for (const col of item.column_values) {
        if (col.id.includes('date') || col.id.includes('timeline')) {
           if (col.text && col.text.includes(' - ')) {
              const parts = col.text.split(' - ');
              startDateStr = parts[0];
              endDateStr = parts[1];
           } else if (col.text && col.text.length > 5) {
              startDateStr = col.text;
              endDateStr = col.text;
           }
        }
        if (col.id.includes('status')) {
           status = col.text || 'pending';
           if (status.toLowerCase().includes('done')) progress = 100;
           if (status.toLowerCase().includes('working')) progress = 50;
        }
        if (col.id.includes('progress') && col.text) {
           progress = parseInt(col.text) || progress;
        }
      }
      
      if (!startDateStr) {
         const s = new Date(today);
         s.setDate(s.getDate() + (i * 3));
         startDateStr = s.toISOString().split('T')[0];
         
         const e = new Date(s);
         e.setDate(e.getDate() + 7);
         endDateStr = e.toISOString().split('T')[0];
      } else if (!endDateStr) {
         endDateStr = startDateStr;
      }
      
      insert.run(req.params.id, item.name, startDateStr, endDateStr, progress, status);
    }
    
    res.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Monday sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync with Monday' });
  }
});

// הגשת האתר (פרונטנד) מהשרת
const DIST_DIR = path.join(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => { // הפעלת השרת
  console.log(`Server is running on http://localhost:${PORT}`);
});
