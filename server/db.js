import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, 'barsuf.db');

const db = new Database(dbPath);

// Initialize schema
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      end_date TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS project_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT,
      folder TEXT DEFAULT 'כללי',
      upload_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      upload_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialization TEXT,
      phone TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      category TEXT NOT NULL,
      total_amount REAL NOT NULL,
      approved_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      budget_id INTEGER,
      contractor_id INTEGER,
      amount REAL NOT NULL,
      date TEXT,
      description TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (budget_id) REFERENCES budgets(id),
      FOREIGN KEY (contractor_id) REFERENCES contractors(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      supplier_name TEXT NOT NULL,
      item_description TEXT NOT NULL,
      amount REAL NOT NULL,
      order_date TEXT,
      status TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      manager_name TEXT,
      weather TEXT,
      workers_count INTEGER,
      notes TEXT,
      image_url TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS warranty_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      customer_name TEXT,
      issue_description TEXT,
      contractor_id INTEGER,
      status TEXT DEFAULT 'פתוח',
      open_date TEXT,
      close_date TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES contractors(id)
    );
  `);
  
  // Migration to add 'folder' column to existing project_media table
  try {
    db.exec("ALTER TABLE project_media ADD COLUMN folder TEXT DEFAULT 'כללי'");
  } catch (err) {
    // Column already exists, ignore
  }
  
  console.log('Database initialized.');
}

initDB();

export default db;
