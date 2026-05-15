import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

// נתיב למסד הנתונים - משתמשים ב-/tmp כשטח עבודה מהיר
const DB_DIR = '/tmp/barsuf_data';
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const dbPath = path.join(DB_DIR, 'barsuf.db');

// סנכרון מהענן - מורידים את מסד הנתונים לפני הפעלה
const storage = new Storage();
const BUCKET_NAME = 'barsuf-media-storage-1777314059';
try {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file('barsuf.db');
  if ((await file.exists())[0]) {
    await file.download({ destination: dbPath });
    console.log('☁️ Database downloaded from Cloud Storage');
  }
} catch (e) {
  console.log('☁️ Starting fresh local DB (No Cloud Backup found or missing permissions)');
}

const db = new Database(dbPath);

// גיבוי אוטומטי לענן בכל שינוי
db.backupToCloud = async () => {
  try {
    await storage.bucket(BUCKET_NAME).upload(dbPath, { destination: 'barsuf.db' });
  } catch (e) { console.error('Cloud backup failed:', e); }
};

// הגדרות ביצועים של SQLite
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// יצירת מבנה הנתונים המלא של בארסוף
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
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    filename TEXT,
    original_name TEXT,
    upload_date TEXT
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

  CREATE TABLE IF NOT EXISTS contractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    specialization TEXT,
    phone TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    amount REAL,
    date TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    supplier_name TEXT,
    item_description TEXT,
    amount REAL,
    order_date TEXT,
    status TEXT
  );
`);

console.log('✅ Database Ready at:', dbPath);
export default db;
