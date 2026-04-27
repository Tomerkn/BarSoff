import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, ReceiptText, Pencil, Trash2 } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים
import { AIExcelUpload } from '../components/ui/AIExcelUpload'; // כלי להעלאת נתונים מאקסל בעזרת הבינה

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Expenses() { // דף ניהול הוצאות וחשבוניות
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [expenses, setExpenses] = useState([]); // רשימת ההוצאות שנשמרת כאן
  const [projects, setProjects] = useState([]); // רשימת הפרויקטים (לצורך בחירה אם צריך)
  const [budgets, setBudgets] = useState([]); // רשימת סעיפי התקציב
  const [contractors, setContractors] = useState([]); // רשימת הקבלנים
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת

  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת הוצאה פתוחה
  const [formData, setFormData] = useState({ // הנתונים שהמשתמש ממלא בטופס ההוצאה
    project_id: projectId, 
    budget_id: '', 
    contractor_id: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    description: '' 
  });
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים הוצאה קיימת, כאן נשמר המספר שלה

  const fetchExpenses = async () => { // פונקציה שמביאה את כל ההוצאות מהשרת
    try {
      const data = await api.getExpenses(); // מבקשים את רשימת ההוצאות
      const projectExpenses = data.filter(e => e.project_id === Number(projectId)); // מסננים רק את ההוצאות של הפרויקט הנוכחי
      setExpenses(projectExpenses); // מעדכנים את הרשימה על המסך
    } catch (error) {
      console.error(error); // רישום שגיאה
    } finally {
      setLoading(false); // הפסקת מצב טעינה
    }
  };

  const fetchDependencies = async () => { // מביאים נתונים נוספים שצריך בשביל הטופס
    try {
      const [p, b, c] = await Promise.all([
        api.getProjects(),
        api.getBudgets(),
        api.getContractors()
      ]);
      setProjects(p);
      setBudgets(b);
      setContractors(c);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { // הבאת כל הנתונים ברגע שהדף עולה
    fetchExpenses();
    fetchDependencies();
  }, []);

  const handleSubmit = async (e) => { // שמירת הוצאה חדשה או עריכת קיימת
    e.preventDefault(); // מניעת רענון הדף
    setSubmitting(true); // מצב שמירה
    try {
      if (editingId) { // אם אנחנו בעריכה
        await api.updateResource('expenses', editingId, {
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      } else { // אם אנחנו ביצירת הוצאה חדשה
        await api.createExpense({
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      }
      setIsModalOpen(false); // סגירת החלונית
      setEditingId(null); // איפוס עריכה
      setFormData({ project_id: projectId, budget_id: '', contractor_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' }); // ניקוי טופס
      await fetchExpenses(); // רענון הרשימה
    } catch (error) {
      console.error('Failed to save expense:', error); // במקרה של תקלה
    } finally {
      setSubmitting(false); // סיום מצב שמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת הוצאה מהמערכת
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הוצאה זו?')) return; // בקשת אישור
    try {
      await api.deleteResource('expenses', id); // מחיקה בשרת
      await fetchExpenses(); // רענון הרשימה
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEdit = (expense) => { // הכנת הטופס לעריכה עם נתונים קיימים
    setEditingId(expense.id);
    setFormData({
      project_id: expense.project_id,
      budget_id: expense.budget_id || '',
      contractor_id: expense.contractor_id || '',
      amount: expense.amount,
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: expense.description
    });
    setIsModalOpen(true);
  };

  const availableBudgets = budgets.filter(b => b.project_id.toString() === projectId); // מסננים רק את סעיפי התקציב ששייכים לפרויקט הזה

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הוצאות וחשבוניות</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">מעקב אחר כלל ההוצאות בפרויקטים</p>
        </div>
        <div className="flex items-center gap-4">
          <AIExcelUpload projectId={projectId} targetTable="expenses" onSuccess={fetchExpenses} /> {/* העלאת אקסל חכמה */}
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ project_id: projectId, budget_id: '', contractor_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
              setIsModalOpen(true);
            }}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוצאה חדשה
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת ההוצאות */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">קבלן/ספק</th>
              <th className="px-6 py-4 font-medium">סעיף תקציבי</th>
              <th className="px-6 py-4 font-medium">תאריך</th>
              <th className="px-6 py-4 font-medium">סכום</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{e.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">{e.contractor_name}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  <span className="bg-surface-hover px-2 py-1 rounded text-xs">{e.budget_category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(e.date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-text-primary">{formatCurrency(e.amount)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => handleEdit(e)} className="p-1 text-text-muted hover:text-blue-500 transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* אם אין הוצאות עדיין */}
            {expenses.length === 0 && (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-text-muted">אין הוצאות במערכת. כדאי להוסיף או להעלות חשבוניות.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספה או עריכה של הוצאה */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת הוצאה" : "הוספת הוצאה חדשה"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">סעיף תקציבי</label>
            <select 
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.budget_id} onChange={e => setFormData({...formData, budget_id: e.target.value})}
            >
              <option value="" disabled>בחר סעיף</option>
              {availableBudgets.map(b => <option key={b.id} value={b.id}>{b.category}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">קבלן / ספק</label>
            <select 
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.contractor_id} onChange={e => setFormData({...formData, contractor_id: e.target.value})}
            >
              <option value="" disabled>בחר קבלן מתוך המאגר</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך הוצאה</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור הוצאה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
