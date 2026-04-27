import Database from 'better-sqlite3'; // מביאים את הכלי שעובד עם מסדי נתונים מסוג SQLite
import { fileURLToPath } from 'url'; // כלי שעוזר למצוא איפה הקוד רץ
import { dirname, join } from 'path'; // כלי לחיבור נתיבי תיקיות וקבצים
import fs from 'fs'; // כלי לעבודה עם הקבצים במערכת

const __dirname = dirname(fileURLToPath(import.meta.url)); // מוצאים את התיקייה הנוכחית
const dataDir = join(__dirname, 'data'); // מגדירים תיקייה בשם data לשמירת המידע
if (!fs.existsSync(dataDir)) { // אם התיקייה לא קיימת
  fs.mkdirSync(dataDir, { recursive: true }); // יוצרים אותה
}
const dbPath = join(dataDir, 'barsuf.db'); // נתיב לקובץ מסד הנתונים עצמו

const db = new Database(dbPath); // מתחברים למסד הנתונים

// פונקציה שיוצרת את כל הטבלאות במחסן המידע שלנו
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects ( -- טבלת פרויקטים
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- מספר זיהוי רץ
      name TEXT NOT NULL, -- שם הפרויקט
      location TEXT, -- מיקום
      end_date TEXT, -- תאריך סיום משוער
      status TEXT -- מצב הפרויקט (בבנייה, תקין וכו')
    );

    CREATE TABLE IF NOT EXISTS project_media ( -- טבלת גלריית תמונות ומסמכים
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER, -- משויך לפרויקט מסוים
      filename TEXT NOT NULL, -- שם הקובץ במערכת
      original_name TEXT NOT NULL, -- שם הקובץ המקורי
      url TEXT NOT NULL, -- כתובת לצפייה בענן
      mime_type TEXT, -- סוג הקובץ (תמונה, PDF)
      folder TEXT DEFAULT 'כללי', -- תיקייה בתוך הגלריה
      upload_date TEXT, -- מתי הועלה
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS files ( -- טבלת מסמכים לניתוח בינה מלאכותית
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      upload_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS contractors ( -- טבלת קבלנים
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, -- שם הקבלן
      specialization TEXT, -- תחום התמחות
      phone TEXT, -- טלפון
      email TEXT -- אימייל
    );

    CREATE TABLE IF NOT EXISTS budgets ( -- טבלת תקציבים
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      category TEXT NOT NULL, -- קטגוריה (שלד, חשמל וכו')
      total_amount REAL NOT NULL, -- סכום מאושר
      approved_date TEXT, -- תאריך אישור
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS expenses ( -- טבלת הוצאות
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      budget_id INTEGER, -- משויך לסעיף תקציב
      contractor_id INTEGER, -- משויך לקבלן
      amount REAL NOT NULL, -- סכום ההוצאה
      date TEXT, -- תאריך
      description TEXT, -- פירוט מה קנינו/שילמנו
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (budget_id) REFERENCES budgets(id),
      FOREIGN KEY (contractor_id) REFERENCES contractors(id)
    );

    CREATE TABLE IF NOT EXISTS orders ( -- טבלת הזמנות רכש
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      supplier_name TEXT NOT NULL, -- שם הספק
      item_description TEXT NOT NULL, -- מה הוזמן
      amount REAL NOT NULL, -- סכום
      order_date TEXT, -- תאריך הזמנה
      status TEXT, -- מצב (הוזמן, הגיע וכו')
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS tasks ( -- טבלת משימות (גאנט)
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL, -- שם המשימה
      start_date TEXT NOT NULL, -- תאריך התחלה
      end_date TEXT NOT NULL, -- תאריך סיום
      progress INTEGER DEFAULT 0, -- אחוז התקדמות
      status TEXT DEFAULT 'pending', -- מצב המשימה
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS incomes ( -- טבלת הכנסות
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      description TEXT NOT NULL, -- תיאור התשלום שהתקבל
      amount REAL NOT NULL, -- סכום
      date TEXT, -- תאריך
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS daily_logs ( -- טבלת יומני עבודה
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- תאריך היום
      manager_name TEXT, -- מנהל עבודה בשטח
      weather TEXT, -- מזג אוויר
      workers_count INTEGER, -- כמה פועלים היו
      notes TEXT, -- הערות מה קרה היום
      image_url TEXT, -- תמונה מהשטח
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS warranty_tickets ( -- טבלת שנת בדק (קריאות שירות)
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      customer_name TEXT, -- שם הלקוח שמתלונן
      issue_description TEXT, -- מה הבעיה
      contractor_id INTEGER, -- מי הקבלן שצריך לתקן
      status TEXT DEFAULT 'פתוח', -- מצב הקריאה
      open_date TEXT, -- תאריך פתיחה
      close_date TEXT, -- תאריך סגירה
      notes TEXT, -- הערות נוספות
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (contractor_id) REFERENCES contractors(id)
    );
  `);
  
  // עדכון מבנה הטבלה במידה וחסרה עמודת תיקיות
  try {
    db.exec("ALTER TABLE project_media ADD COLUMN folder TEXT DEFAULT 'כללי'");
  } catch (err) {
    // אם העמודה כבר קיימת - הכל בסדר, לא עושים כלום
  }
  
  console.log('Database initialized.'); // רושמים שהכל מוכן
}

initDB(); // מפעילים את היצירה

export default db; // מוציאים את החיבור לשימוש בשאר חלקי השרת
