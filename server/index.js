import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import db from './db.js';
import './seed.js'; // Ensure database is seeded
import { ingestDocument, askQuestion } from './ai.js';

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
    const errorMessage = error.message || 'Failed to process file with Gemini AI.';
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
    const insert = db.prepare('INSERT INTO project_media (project_id, filename, original_name, url, mime_type, upload_date) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run(projectId, req.file.filename, originalName, publicUrl, mimeType, new Date().toISOString());
    
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
    res.status(500).json({ error: 'Failed to get answer from AI engine.' });
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
