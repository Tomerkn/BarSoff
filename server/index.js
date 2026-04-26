import express from 'express';
import cors from 'cors';
import db from './db.js';
import './seed.js'; // Ensure database is seeded

const app = express();
const PORT = process.env.PORT || 3001;

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

// Orders API
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT orders.*, projects.name as project_name FROM orders LEFT JOIN projects ON orders.project_id = projects.id ORDER BY orders.order_date DESC').all();
  res.json(orders);
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
