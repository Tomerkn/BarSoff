import db from './db.js';

function seed() {
  const projectsCount = db.prepare("SELECT count(*) as count FROM projects").get().count;
  
  if (projectsCount > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database...');

  // Seed Projects
  const insertProject = db.prepare("INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)");
  const proj1 = insertProject.run("מגדל השחר - שלב ב'", "תל אביב", "2026-12-31", "חריגה תקציבית");
  const proj2 = insertProject.run("פארק ההייטק החדש", "הרצליה", "2027-06-30", "תקין");

  // Seed Contractors
  const insertContractor = db.prepare("INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)");
  const cont1 = insertContractor.run("א.א שלד ובנייה בע\"מ", "שלד", "050-1234567", "info@aa-sheled.com");
  const cont2 = insertContractor.run("ישראל חשמל ושות'", "חשמל ותקשורת", "054-7654321", "israel@hashmal.co.il");
  const cont3 = insertContractor.run("צנרת פלוס", "אינסטלציה", "052-1112233", "contact@tza.co.il");

  // Seed Budgets
  const insertBudget = db.prepare("INSERT INTO budgets (project_id, category, total_amount, approved_date) VALUES (?, ?, ?, ?)");
  const bud1 = insertBudget.run(proj1.lastInsertRowid, "עבודות שלד", 1000000, "2025-01-01");
  const bud2 = insertBudget.run(proj1.lastInsertRowid, "חשמל ותקשורת", 500000, "2025-01-01");
  const bud3 = insertBudget.run(proj1.lastInsertRowid, "אינסטלציה", 300000, "2025-01-01");

  // Seed Expenses
  const insertExpense = db.prepare("INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)");
  insertExpense.run(proj1.lastInsertRowid, bud1.lastInsertRowid, cont1.lastInsertRowid, 1000000, "2025-06-15", "גמר עבודות שלד עד קומה 10");
  insertExpense.run(proj1.lastInsertRowid, bud2.lastInsertRowid, cont2.lastInsertRowid, 425000, "2025-08-20", "הנחת תשתית ראשית");
  insertExpense.run(proj1.lastInsertRowid, bud3.lastInsertRowid, cont3.lastInsertRowid, 330000, "2025-09-10", "צנרת ראשית (חריגה מול מתוכנן)");

  // Seed Orders
  const insertOrder = db.prepare("INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)");
  insertOrder.run(proj1.lastInsertRowid, "חברת החשמל", "חיבור חשמל זמני לאתר", 15000, "2025-01-10", "מאושר");
  insertOrder.run(proj1.lastInsertRowid, "אבן קיסר", "משטחי שיש למטבחים", 45000, "2025-10-01", "פתוח");

  console.log('Seeding complete.');
}

seed();
