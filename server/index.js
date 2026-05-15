import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import db from './db.js';
import './seed.js';
import { ingestDocument, askQuestion, analyzeReceipt, analyzeTender, generateProposal } from './ai.js';

const app = express();
const PORT = process.env.PORT || 8080;
const root = process.cwd();

// שימוש ב-/tmp לכתיבה בענן (Cloud Run)
const UPLOADS_DIR = '/tmp/barsuf_data/uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// הגשת קבצי האתר (Frontend)
const distPath = path.join(root, 'dist');
app.use(express.static(distPath));

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', root }));

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const { name, location, end_date, status } = req.body;
  const insert = db.prepare('INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)');
  const info = insert.run(name, location, end_date, status || 'תקין');
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  const { name, location, end_date, status } = req.body;
  db.prepare('UPDATE projects SET name = ?, location = ?, end_date = ?, status = ? WHERE id = ?')
    .run(name, location, end_date, status, pid);
  res.json({ success: true });
});

app.delete('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(pid);
  db.prepare('DELETE FROM budgets WHERE project_id = ?').run(pid);
  db.prepare('DELETE FROM expenses WHERE project_id = ?').run(pid);
  res.json({ success: true });
});

app.get('/api/projects/:id/analytics', (req, res) => {
  const pid = Number(req.params.id);
  console.log(`🔍 Fetching analytics for project ID: ${pid}`);
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
    if (!project) {
      console.error(`❌ Project ${pid} not found in DB`);
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = db.prepare(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM budgets WHERE project_id = ?) as totalBudget,
        (SELECT IFNULL(SUM(amount), 0) FROM expenses WHERE project_id = ?) as actualExecution,
        (SELECT IFNULL(SUM(amount), 0) FROM incomes WHERE project_id = ?) as totalIncomes
    `).get(pid, pid, pid);
    
    // שאר הקוד נשאר זהה...

    const breakdown = db.prepare(`
      SELECT 
        b.id, b.category, b.total_amount as budget,
        IFNULL((SELECT SUM(amount) FROM expenses WHERE budget_id = b.id), 0) as actual
      FROM budgets b
      WHERE b.project_id = ?
    `).all(pid);

    const profitLoss = stats.totalIncomes - stats.actualExecution;
    const utilization = stats.totalBudget > 0 ? (stats.actualExecution / stats.totalBudget) * 100 : 0;

    res.json({
      project,
      ...stats,
      breakdown,
      profitLoss,
      utilization,
      variance: stats.actualExecution - stats.totalBudget
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

app.get('/api/tenders', (req, res) => {
  const tenders = db.prepare('SELECT * FROM tenders ORDER BY upload_date DESC').all();
  res.json(tenders);
});

app.post('/api/tenders', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const insert = db.prepare('INSERT INTO tenders (name, filename, upload_date, status) VALUES (?, ?, ?, ?)');
  const info = insert.run(req.file.originalname, req.file.filename, new Date().toISOString(), 'מעלה...');
  const tenderId = info.lastInsertRowid;
  
  analyzeTender(req.file.path, tenderId).then(analysis => {
    db.prepare('UPDATE tenders SET analysis = ?, status = ? WHERE id = ?').run(analysis, 'נותח', tenderId);
    ingestDocument('global', req.file.path);
  }).catch(e => db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה', tenderId));

  res.status(201).json({ id: tenderId });
});

app.post('/api/tenders/:id/proposal', async (req, res) => {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
  generateProposal(path.join(UPLOADS_DIR, tender.filename), req.params.id).then(proposal => {
    db.prepare('UPDATE tenders SET proposal = ?, status = ? WHERE id = ?').run(proposal, 'מוכן', req.params.id);
  }).catch(e => db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה', req.params.id));
  res.json({ success: true });
});

// --- AI Aliases from old API ---
app.post('/api/analyze-tender', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const insert = db.prepare('INSERT INTO tenders (name, filename, upload_date, status) VALUES (?, ?, ?, ?)');
  const info = insert.run(req.file.originalname, req.file.filename, new Date().toISOString(), 'מעלה...');
  const tenderId = info.lastInsertRowid;
  
  analyzeTender(req.file.path, tenderId).then(analysis => {
    db.prepare('UPDATE tenders SET analysis = ?, status = ? WHERE id = ?').run(analysis, 'נותח', tenderId);
    ingestDocument('global', req.file.path);
  }).catch(e => db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה', tenderId));

  res.status(201).json({ id: tenderId });
});

app.post('/api/global-knowledge', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  try {
    await ingestDocument('global', req.file.path);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to ingest document' });
  }
});

// --- Other Financial Entities ---
app.get('/api/expenses', (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses').all();
  res.json(expenses);
});
app.get('/api/incomes', (req, res) => res.json(db.prepare('SELECT * FROM incomes').all()));
app.get('/api/contractors', (req, res) => res.json(db.prepare('SELECT * FROM contractors').all()));
app.get('/api/orders', (req, res) => res.json(db.prepare('SELECT * FROM orders').all()));
app.get('/api/budgets', (req, res) => res.json(db.prepare('SELECT * FROM budgets').all()));

app.post('/api/expenses', (req, res) => {
  const { project_id, budget_id, contractor_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const info = insert.run(project_id, budget_id, contractor_id, amount, date, description);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/incomes', (req, res) => {
  const { project_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO incomes (project_id, amount, date, description) VALUES (?, ?, ?, ?)');
  const info = insert.run(project_id, amount, date, description);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/contractors', (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const insert = db.prepare('INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)');
  const info = insert.run(name, specialization, phone, email);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/orders', (req, res) => {
  const { project_id, supplier_name, item_description, amount, order_date, status } = req.body;
  const insert = db.prepare('INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)');
  const info = insert.run(project_id, supplier_name, item_description, amount, order_date, status);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/budgets', (req, res) => {
  const { project_id, category, total_amount } = req.body;
  const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount) VALUES (?, ?, ?)');
  const info = insert.run(project_id, category, total_amount);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/:resourceType/:id', (req, res) => {
  // Generic fallback for PUT (simplified for safety, normally explicitly defined)
  res.json({ success: true, warning: 'Generic update placeholder' });
});

app.delete('/api/:resourceType/:id', (req, res) => {
  const { resourceType, id } = req.params;
  const pid = Number(id);
  const allowedTables = ['projects', 'expenses', 'incomes', 'budgets', 'orders', 'contractors', 'tenders'];
  if (allowedTables.includes(resourceType)) {
    db.prepare(`DELETE FROM ${resourceType} WHERE id = ?`).run(pid);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid resource type' });
  }
});

app.post('/api/projects/:id/chat', async (req, res) => {
  try {
    const answer = await askQuestion(req.params.id, req.body.question);
    res.json({ answer });
  } catch (e) { res.status(500).json({ error: 'AI error' }); }
});

app.get('/api/analytics/global', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM budgets) as totalBudget,
        (SELECT IFNULL(SUM(amount), 0) FROM expenses) as totalExpenses,
        (SELECT IFNULL(SUM(amount), 0) FROM incomes) as totalIncomes,
        (SELECT COUNT(*) FROM projects) as totalProjects,
        (SELECT COUNT(*) FROM projects WHERE status = 'תקין') as activeProjects,
        (SELECT COUNT(*) FROM tenders WHERE status != 'נותח') as openTenders,
        0 as openWarrantyTickets
    `).get();
    res.json({
      ...data,
      openWarrantyTickets: data.openWarrantyTickets || 0
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch global analytics' });
  }
});

// Wildcard routing for SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// Triggering automated deployment pipeline check
// Re-triggering pipeline with correct secret name
