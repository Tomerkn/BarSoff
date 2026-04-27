const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'; // קובעים אם אנחנו עובדים מול השרת באינטרנט או במחשב המקומי

export const api = { // יצירת השליח שמדבר עם השרת
  baseUrl: API_BASE_URL, // הכתובת הבסיסית של השרת
  getProjects: async () => { // בקשה לקבלת כל הפרויקטים
    const response = await fetch(`${API_BASE_URL}/projects`); // מבקשים מהשרת את הרשימה
    if (!response.ok) throw new Error('Failed to fetch projects'); // אם יש תקלה, מודיעים למערכת
    return response.json(); // מחזירים את התוצאה כמידע מסודר
  },
  createProject: async (data) => { // בקשה ליצירת פרויקט חדש
    const response = await fetch(`${API_BASE_URL}/projects`, { // שולחים את פרטי הפרויקט לשרת
      method: 'POST', // פעולה של הוספה
      headers: { 'Content-Type': 'application/json' }, // אומרים לשרת שזה מידע מסוג JSON
      body: JSON.stringify(data), // הופכים את המידע לטקסט שהשרת מבין
    });
    if (!response.ok) throw new Error('Failed to create project'); // אם נכשל
    return response.json(); // מחזירים את הפרויקט שנוצר
  },
  getProjectAnalytics: async (projectId) => { // בקשה לקבלת הנתונים הכספיים של פרויקט
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analytics`); // מבקשים מהשרת ניתוח של פרויקט ספציפי
    if (!response.ok) throw new Error('Failed to fetch analytics'); // אם נכשל
    return response.json(); // מחזירים את הנתונים והגרפים
  },
  getExpenses: async (projectId = '') => { // בקשה לקבלת כל ההוצאות
    const url = projectId ? `${API_BASE_URL}/expenses?projectId=${projectId}` : `${API_BASE_URL}/expenses`; // בונים את הכתובת לפי הפרויקט
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch expenses'); // אם נכשל
    return response.json(); // מחזירים רשימת הוצאות
  },
  getIncomes: async (projectId = '') => { // בקשה לקבלת כל ההכנסות
    const url = projectId ? `${API_BASE_URL}/incomes?projectId=${projectId}` : `${API_BASE_URL}/incomes`; // בונים את הכתובת
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch incomes'); // אם נכשל
    return response.json(); // מחזירים רשימת הכנסות
  },
  createIncome: async (data) => { // תיעוד הכנסה חדשה
    const response = await fetch(`${API_BASE_URL}/incomes`, { // שולחים פרטים לשרת
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create income'); // אם נכשל
    return response.json(); // מחזירים את ההכנסה שנוצרה
  },
  getContractors: async () => { // קבלת רשימת קבלנים
    const response = await fetch(`${API_BASE_URL}/contractors`); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch contractors'); // אם נכשל
    return response.json(); // מחזירים את הקבלנים
  },
  createContractor: async (data) => { // הוספת קבלן חדש
    const response = await fetch(`${API_BASE_URL}/contractors`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create contractor'); // אם נכשל
    return response.json(); // מחזירים את הקבלן החדש
  },
  getOrders: async () => { // קבלת כל ההזמנות
    const response = await fetch(`${API_BASE_URL}/orders`); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch orders'); // אם נכשל
    return response.json(); // מחזירים רשימת הזמנות
  },
  createOrder: async (data) => { // יצירת הזמנה חדשה
    const response = await fetch(`${API_BASE_URL}/orders`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create order'); // אם נכשל
    return response.json(); // מחזירים את ההזמנה שנוצרה
  },
  getBudgets: async (projectId) => { // קבלת סעיפי התקציב
    const url = projectId ? `${API_BASE_URL}/budgets?projectId=${projectId}` : `${API_BASE_URL}/budgets`; // בונים כתובת
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch budgets'); // אם נכשל
    return response.json(); // מחזירים רשימת תקציבים
  },
  createBudget: async (data) => { // הוספת סעיף תקציב
    const response = await fetch(`${API_BASE_URL}/budgets`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create budget'); // אם נכשל
    return response.json(); // מחזירים את התקציב החדש
  },
  createExpense: async (data) => { // הוספת הוצאה כספית
    const response = await fetch(`${API_BASE_URL}/expenses`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create expense'); // אם נכשל
    return response.json(); // מחזירים את ההוצאה שנוצרה
  },
  updateResource: async (resourceType, id, data) => { // עדכון מידע קיים (תקציב, הוצאה וכו')
    const response = await fetch(`${API_BASE_URL}/${resourceType}/${id}`, { // שולחים עדכון לכתובת המתאימה
      method: 'PUT', // פעולה של עדכון
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error(`Failed to update ${resourceType}`); // אם נכשל
    return response.json(); // מחזירים אישור הצלחה
  },
  deleteResource: async (resourceType, id) => { // מחיקת מידע מהמערכת
    const response = await fetch(`${API_BASE_URL}/${resourceType}/${id}`, { // מבקשים מחיקה מהכתובת המתאימה
      method: 'DELETE' // פעולה של מחיקה
    });
    if (!response.ok) throw new Error(`Failed to delete ${resourceType}`); // אם נכשל
    return response.json(); // מחזירים אישור הצלחה
  }
};
