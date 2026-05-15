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
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

app.get('/api/projects/:id/analytics', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const stats = db.prepare(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM budgets WHERE project_id = ?) as totalBudget,
        (SELECT IFNULL(SUM(amount), 0) FROM expenses WHERE project_id = ?) as actualExecution,
        (SELECT IFNULL(SUM(amount), 0) FROM incomes WHERE project_id = ?) as totalIncomes
    `).get(req.params.id, req.params.id, req.params.id);

    const breakdown = db.prepare(`
      SELECT 
        b.id, b.category, b.total_amount as budget,
        IFNULL((SELECT SUM(amount) FROM expenses WHERE budget_id = b.id), 0) as actual
      FROM budgets b
      WHERE b.project_id = ?
    `).all(req.params.id);

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
