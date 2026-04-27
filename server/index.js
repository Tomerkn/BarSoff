import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import db from './db.js';
import './seed.js'; // Ensure database is seeded
import { ingestDocument, askQuestion, analyzeReceipt } from './ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Setup uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Initialize Google Cloud Storage
const storageClient = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'barsuf-media-storage-1777314059';

app.use(cors());
app.use(express.json());

// Projects API
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const { name, location, end_date, status } = req.body;
  const insert = db.prepare('INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)');
  const result = insert.run(name, location, end_date, status);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Budgets API
app.get('/api/budgets', (req, res) => {
  const { projectId } = req.query;
  let query = 'SELECT * FROM budgets';
  let params = [];
  if (projectId) {
    query += ' WHERE project_id = ?';
    params.push(projectId);
  }
  const budgets = db.prepare(query).all(params);
  res.json(budgets);
});

app.post('/api/budgets', (req, res) => {
  const { project_id, category, total_amount, approved_date } = req.body;
  const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
  const result = insert.run(project_id, category, total_amount, approved_date);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/budgets/:id', (req, res) => {
  const { category, total_amount, approved_date } = req.body;
  const update = db.prepare('UPDATE budgets SET category = ?, total_amount = ?, approved_date = ? WHERE id = ?');
  update.run(category, total_amount, approved_date, req.params.id);
  res.json({ success: true });
});

app.delete('/api/budgets/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM budgets WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Expenses API
app.get('/api/expenses', (req, res) => {
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

app.post('/api/expenses', (req, res) => {
  const { project_id, budget_id, contractor_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, budget_id, contractor_id, amount, date, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/expenses/:id', (req, res) => {
  const { budget_id, contractor_id, amount, date, description } = req.body;
  const update = db.prepare('UPDATE expenses SET budget_id = ?, contractor_id = ?, amount = ?, date = ?, description = ? WHERE id = ?');
  update.run(budget_id, contractor_id, amount, date, description, req.params.id);
  res.json({ success: true });
});

app.delete('/api/expenses/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Contractors API
app.get('/api/contractors', (req, res) => {
  const contractors = db.prepare('SELECT * FROM contractors').all();
  res.json(contractors);
});

app.post('/api/contractors', (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const insert = db.prepare('INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)');
  const result = insert.run(name, specialization, phone, email);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/contractors/:id', (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const update = db.prepare('UPDATE contractors SET name = ?, specialization = ?, phone = ?, email = ? WHERE id = ?');
  update.run(name, specialization, phone, email, req.params.id);
  res.json({ success: true });
});

app.delete('/api/contractors/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM contractors WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Orders API
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT orders.*, projects.name as project_name FROM orders LEFT JOIN projects ON orders.project_id = projects.id ORDER BY orders.order_date DESC').all();
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { project_id, supplier_name, item_description, amount, order_date, status } = req.body;
  const insert = db.prepare('INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, supplier_name, item_description, amount, order_date, status);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/orders/:id', (req, res) => {
  const { supplier_name, item_description, amount, order_date, status } = req.body;
  const update = db.prepare('UPDATE orders SET supplier_name = ?, item_description = ?, amount = ?, order_date = ?, status = ? WHERE id = ?');
  update.run(supplier_name, item_description, amount, order_date, status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Incomes API
app.get('/api/incomes', (req, res) => {
  const incomes = db.prepare('SELECT incomes.*, projects.name as project_name FROM incomes LEFT JOIN projects ON incomes.project_id = projects.id ORDER BY incomes.date DESC').all();
  res.json(incomes);
});

app.post('/api/incomes', (req, res) => {
  const { project_id, description, amount, date } = req.body;
  const insert = db.prepare('INSERT INTO incomes (project_id, description, amount, date) VALUES (?, ?, ?, ?)');
  const result = insert.run(project_id, description, amount, date || new Date().toISOString().split('T')[0]);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/incomes/:id', (req, res) => {
  const { description, amount, date } = req.body;
  const update = db.prepare('UPDATE incomes SET description = ?, amount = ?, date = ? WHERE id = ?');
  update.run(description, amount, date, req.params.id);
  res.json({ success: true });
});

app.delete('/api/incomes/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM incomes WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Daily Logs API
app.get('/api/daily-logs', (req, res) => {
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

app.post('/api/daily-logs', (req, res) => {
  const { project_id, date, manager_name, weather, workers_count, notes, image_url } = req.body;
  const insert = db.prepare('INSERT INTO daily_logs (project_id, date, manager_name, weather, workers_count, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, date, manager_name, weather, workers_count, notes, image_url);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/daily-logs/:id', (req, res) => {
  const { date, manager_name, weather, workers_count, notes, image_url } = req.body;
  const update = db.prepare('UPDATE daily_logs SET date = ?, manager_name = ?, weather = ?, workers_count = ?, notes = ?, image_url = ? WHERE id = ?');
  update.run(date, manager_name, weather, workers_count, notes, image_url, req.params.id);
  res.json({ success: true });
});

app.delete('/api/daily-logs/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM daily_logs WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Warranty Tickets API
app.get('/api/warranty-tickets', (req, res) => {
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

app.post('/api/warranty-tickets', (req, res) => {
  const { project_id, customer_name, issue_description, contractor_id, status, open_date, close_date, notes } = req.body;
  const insert = db.prepare('INSERT INTO warranty_tickets (project_id, customer_name, issue_description, contractor_id, status, open_date, close_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const result = insert.run(project_id, customer_name, issue_description, contractor_id, status || 'פתוח', open_date, close_date, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/warranty-tickets/:id', (req, res) => {
  const { customer_name, issue_description, contractor_id, status, open_date, close_date, notes } = req.body;
  const update = db.prepare('UPDATE warranty_tickets SET customer_name = ?, issue_description = ?, contractor_id = ?, status = ?, open_date = ?, close_date = ?, notes = ? WHERE id = ?');
  update.run(customer_name, issue_description, contractor_id, status, open_date, close_date, notes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/warranty-tickets/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM warranty_tickets WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Global Analytics API
app.get('/api/analytics/global', (req, res) => {
  const totalBudgetRow = db.prepare('SELECT SUM(total_amount) as total FROM budgets').get();
  const totalExpensesRow = db.prepare('SELECT SUM(amount) as total FROM expenses').get();
  const totalIncomesRow = db.prepare('SELECT SUM(amount) as total FROM incomes').get();
  
  const openWarrantyRow = db.prepare("SELECT COUNT(*) as count FROM warranty_tickets WHERE status != 'סגור'").get();
  const projectsRow = db.prepare("SELECT COUNT(*) as count FROM projects").get();
  const activeProjectsRow = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'תקין'").get();

  res.json({
    totalBudget: totalBudgetRow.total || 0,
    totalExpenses: totalExpensesRow.total || 0,
    totalIncomes: totalIncomesRow.total || 0,
    openWarrantyTickets: openWarrantyRow.count || 0,
    totalProjects: projectsRow.count || 0,
    activeProjects: activeProjectsRow.count || 0,
  });
});

// Dashboard Analytics API
app.get('/api/projects/:id/analytics', (req, res) => {
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

  // Breakdown by budget
  const breakdown = db.prepare(`
    SELECT b.id, b.category, b.total_amount as budget, SUM(e.amount) as actual 
    FROM budgets b 
    LEFT JOIN expenses e ON b.id = e.budget_id 
    WHERE b.project_id = ? 
    GROUP BY b.id
  `).all(projectId);

  res.json({
    project,
    totalBudget,
    actualExecution,
    totalIncomes,
    profitLoss,
    variance,
    utilization,
    breakdown
  });
});

// Files & AI API
app.get('/api/projects/:id/files', (req, res) => {
  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id);
  res.json(files);
});

app.post('/api/projects/:id/files', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const projectId = req.params.id;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  
  try {
    // 1. Save to DB
    const insert = db.prepare('INSERT INTO files (project_id, filename, original_name, upload_date) VALUES (?, ?, ?, ?)');
    insert.run(projectId, filename, originalName, new Date().toISOString());
    
    // 2. Ingest into AI Vector Store (Background process)
    // We await it here so the user gets confirmation it's ready
    await ingestDocument(projectId, filePath);
    
    res.status(201).json({ success: true, message: 'File uploaded and processed' });
  } catch (error) {
    console.error('Upload error:', error);
    if (error.status === 503 || (error.message && error.message.includes('503'))) {
      return res.status(503).json({ error: 'השרתים של גוגל עמוסים כרגע. אנא נסה להעלות את הקובץ שוב בעוד כמה דקות.' });
    }
    const errorMessage = error.message || 'שגיאה בעיבוד הקובץ מול ה-AI.';
    res.status(500).json({ error: errorMessage });
  }
});

// Project Media (Gallery) API
app.get('/api/projects/:id/media', (req, res) => {
  const media = db.prepare('SELECT * FROM project_media WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id);
  res.json(media);
});

app.post('/api/projects/:id/media', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const projectId = req.params.id;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const folder = req.body.folder || 'כללי';
  
  // To avoid special characters in GCS URL, encode filename safely or use a simple timestamp
  const safeFilename = encodeURIComponent(originalName.replace(/\s+/g, '-'));
  const destination = `projects/${projectId}/${Date.now()}-${safeFilename}`;
  
  try {
    // Upload to GCS
    await storageClient.bucket(BUCKET_NAME).upload(filePath, {
      destination: destination,
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      }
    });
    
    // The bucket is public, so we can generate the public URL directly
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    
    // Save to DB
    const insert = db.prepare('INSERT INTO project_media (project_id, filename, original_name, url, mime_type, folder, upload_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run(projectId, req.file.filename, originalName, publicUrl, mimeType, folder, new Date().toISOString());
    
    // AI Processing
    try {
      // 1. Always ingest into AI knowledge base for "Consult with AI"
      await ingestDocument(projectId, filePath, mimeType);
      
      // 2. If it's a receipt, auto-extract expense
      if (folder === 'קבלות') {
        const receiptData = await analyzeReceipt(filePath, mimeType);
        if (receiptData && receiptData.amount) {
          // Find or create a "כללי" (General) budget for this project
          let budget = db.prepare('SELECT id FROM budgets WHERE project_id = ? AND category = ?').get(projectId, 'כללי');
          if (!budget) {
            const insertBudget = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
            const info = insertBudget.run(projectId, 'כללי', 0, new Date().toISOString());
            budget = { id: info.lastInsertRowid };
          }

          // Insert expense
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
    
    // Clean up local file since it's uploaded to cloud
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(201).json({ success: true, url: publicUrl, message: 'Media uploaded successfully' });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Failed to upload media to cloud storage' });
  }
});

app.post('/api/projects/:id/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });
  
  try {
    const answer = await askQuestion(req.params.id, question);
    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.status === 503 || (error.message && error.message.includes('503'))) {
      return res.status(503).json({ error: 'ברבור חווה עומס זמני בשרתי גוגל כרגע. קח נשימה, ספור עד עשר, ונסה לשאול שוב! 🦢' });
    }
    res.status(500).json({ error: 'התגלתה שגיאה בתקשורת עם מנוע הבינה. אנא נסה שוב מאוחר יותר.' });
  }
});

// AI Excel Import API
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
    const { extractDataFromExcel } = require('./ai.js');
    const extractedItems = await extractDataFromExcel(filePath, mimeType, targetTable);
    
    if (!extractedItems || !Array.isArray(extractedItems) || extractedItems.length === 0) {
      throw new Error('No valid data extracted from the file');
    }

    let insertedCount = 0;
    
    for (const item of extractedItems) {
      if (targetTable === 'budgets') {
        const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)');
        insert.run(projectId, item.category || 'כללי', item.total_amount || 0, item.approved_date || new Date().toISOString().split('T')[0]);
        insertedCount++;
      } else if (targetTable === 'expenses') {
        // Find or create contractor if name exists
        let contractorId = null;
        if (item.contractor_name) {
          const c = db.prepare('SELECT id FROM contractors WHERE name LIKE ?').get(`%${item.contractor_name}%`);
          if (c) contractorId = c.id;
          else {
            const ci = db.prepare('INSERT INTO contractors (name) VALUES (?)').run(item.contractor_name);
            contractorId = ci.lastInsertRowid;
          }
        }
        
        // Find or create budget if category exists
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

    // Clean up local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, count: insertedCount, message: `Successfully imported ${insertedCount} rows.` });
  } catch (error) {
    console.error('Excel Import error:', error);
    // Clean up local file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: error.message || 'Failed to import data via AI' });
  }
});

// Tasks (Gantt) API
app.get('/api/projects/:id/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(req.params.id);
    res.json(tasks);
  } catch (error) {
    console.error('Failed to get tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/projects/:id/tasks', (req, res) => {
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

app.put('/api/tasks/:id', (req, res) => {
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

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

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
    
    // Clear existing tasks for this project
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress, status) VALUES (?, ?, ?, ?, ?, ?)');
    
    // Process items
    const today = new Date();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let startDateStr = '';
      let endDateStr = '';
      let progress = 0;
      let status = 'pending';
      
      // Look for date or timeline columns in monday
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
      
      // Default dates if not found (stagger them to make a nice gantt)
      if (!startDateStr) {
         const s = new Date(today);
         s.setDate(s.getDate() + (i * 3)); // Stagger by 3 days
         startDateStr = s.toISOString().split('T')[0];
         
         const e = new Date(s);
         e.setDate(e.getDate() + 7); // 1 week duration
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

// Serve frontend static files in production
const DIST_DIR = path.join(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
