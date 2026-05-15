import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// נתיב אבסולוטי למסד הנתונים כדי למנוע בעיות בענן
const DB_DIR = path.join(process.cwd(), 'server', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const dbPath = path.join(DB_DIR, 'barsuf.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// יצירת טבלאות אם הן לא קיימות
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'תקין'
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT,
    total_amount REAL,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    budget_id INTEGER,
    contractor_id INTEGER,
    amount REAL,
    date TEXT,
    description TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(budget_id) REFERENCES budgets(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    filename TEXT,
    original_name TEXT,
    upload_date TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS tenders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    filename TEXT,
    upload_date TEXT,
    status TEXT,
    analysis TEXT,
    proposal TEXT
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    amount REAL,
    date TEXT,
    description TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );
`);

console.log('Database initialized at:', dbPath);
export default db;
