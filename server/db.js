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
  `);
  
  console.log('Database initialized.');
}

initDB();

export default db;
