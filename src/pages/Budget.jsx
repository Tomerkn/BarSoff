import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, Wallet, Pencil, Trash2 } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים
import { AIExcelUpload } from '../components/ui/AIExcelUpload'; // העלאת אקסל חכמה

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Budget() { // דף ניהול תקציב הפרויקט
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [budgets, setBudgets] = useState([]); // רשימת סעיפי התקציב שנשמרת כאן
  const [projects, setProjects] = useState([]); // רשימת הפרויקטים
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת

  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת סעיף פתוחה
  const [formData, setFormData] = useState({ project_id: projectId, category: '', total_amount: '', approved_date: new Date().toISOString().split('T')[0] }); // הנתונים שהמשתמש ממלא בטופס
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים סעיף קיים

  const fetchData = async () => { // פונקציה שמביאה את כל נתוני התקציב והפרויקטים מהשרת
    try {
      const [budgetsData, projectsData] = await Promise.all([
        api.getBudgets(),
        api.getProjects()
      ]);
      
      const projectBudgets = budgetsData.filter(b => b.project_id === Number(projectId)); // מסננים רק את סעיפי התקציב של הפרויקט הנוכחי
      
      const budgetsWithProjects = projectBudgets.map(b => ({ // מוסיפים את שם הפרויקט לכל סעיף
        ...b,
        project_name: projectsData.find(p => p.id === b.project_id)?.name || 'לא ידוע'
      }));
      
      setBudgets(budgetsWithProjects);
      setProjects(projectsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false); // סיום מצב טעינה
    }
  };

  useEffect(() => { // הבאת הנתונים ברגע שהדף עולה
    fetchData();
  }, []);

  const handleSubmit = async (e) => { // שמירת סעיף תקציב חדש או עריכת קיים
    e.preventDefault(); // מניעת רענון הדף
    setSubmitting(true); // מצב שמירה
    try {
      if (editingId) { // עריכת סעיף
        await api.updateResource('budgets', editingId, {
          ...formData,
          project_id: projectId,
          total_amount: Number(formData.total_amount)
        });
      } else { // יצירת סעיף חדש
        await api.createBudget({
          ...formData,
          project_id: projectId,
          total_amount: Number(formData.total_amount)
        });
      }
      setIsModalOpen(false); // סגירת החלונית
      setEditingId(null); // איפוס עריכה
      setFormData({ project_id: projectId, category: '', total_amount: '', approved_date: new Date().toISOString().split('T')[0] }); // ניקוי טופס
      await fetchData(); // רענון הרשימה
    } catch (error) {
      console.error('Failed to save budget:', error);
    } finally {
      setSubmitting(false); // סיום מצב שמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת סעיף מהתקציב
    if (!window.confirm('האם אתה בטוח שברצונך למחוק שורה זו?')) return;
    try {
      await api.deleteResource('budgets', id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEdit = (budget) => { // הכנת הטופס לעריכה
    setEditingId(budget.id);
    setFormData({
      project_id: budget.project_id,
      category: budget.category,
      total_amount: budget.total_amount,
      approved_date: new Date(budget.approved_date).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול תקציב</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">ניהול ומעקב אחר מסגרות התקציב לפרויקטים</p>
        </div>
        <div className="flex items-center gap-4">
          <AIExcelUpload projectId={projectId} targetTable="budgets" onSuccess={fetchData} /> {/* העלאת אקסל חכמה */}
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ project_id: projectId, category: '', total_amount: '', approved_date: new Date().toISOString().split('T')[0] });
              setIsModalOpen(true);
            }}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף סעיף תקציבי
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת התקציב */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">סעיף/קטגוריה</th>
              <th className="px-6 py-4 font-medium">תאריך אישור</th>
              <th className="px-6 py-4 font-medium">סכום מאושר</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {budgets.map(b => (
              <tr key={b.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-text-muted" />
                    <span className="font-medium text-text-primary">{b.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(b.approved_date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-[#10b981]">{formatCurrency(b.total_amount)}</td>
                <td className="px-6 py-4 text-xs">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(b)} className="p-1 text-text-muted hover:text-blue-500 transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* הודעה אם אין סעיפים */}
            {budgets.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-text-muted">לא נמצאו סעיפי תקציב במערכת. כדאי להוסיף סעיפים או להעלות אקסל.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספה או עריכה של סעיף תקציב */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת סעיף תקציבי" : "הוספת סעיף תקציבי חדש"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הסעיף (קטגוריה)</label>
            <input 
              type="text" required placeholder="למשל: עבודות שלד, חשמל..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום מאושר (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך אישור</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.approved_date} onChange={e => setFormData({...formData, approved_date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור תקציב'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
