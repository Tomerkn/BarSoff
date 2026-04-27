import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת בדפדפן
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים
import { AIExcelUpload } from '../components/ui/AIExcelUpload'; // כלי להעלאת נתונים מקובץ אקסל בעזרת הבינה

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function ProjectIncomes() { // דף ניהול הכנסות הפרויקט
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [incomes, setIncomes] = useState([]); // רשימת ההכנסות שנשמרת כאן
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת

  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת הכנסה פתוחה
  const [formData, setFormData] = useState({ // הנתונים שהמשתמש ממלא בטופס ההכנסה
    project_id: projectId, 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים הכנסה קיימת, כאן נשמר המספר שלה

  const fetchIncomes = async () => { // פונקציה שמביאה את כל ההכנסות של הפרויקט מהשרת
    try {
      const data = await api.getIncomes(projectId); // מבקשים מהשרת את רשימת ההכנסות
      const projectIncomes = data.filter(i => i.project_id === Number(projectId)); // מוודאים שאנחנו רואים רק את ההכנסות של הפרויקט הנוכחי
      setIncomes(projectIncomes); // מעדכנים את הרשימה על המסך
    } catch (error) {
      console.error(error); // רישום שגיאה במידה והייתה תקלה
    } finally {
      setLoading(false); // מפסיקים להראות טעינה בכל מקרה
    }
  };

  useEffect(() => { // מפעילים את הבאת הנתונים ברגע שהדף עולה
    fetchIncomes();
  }, [projectId]);

  const handleSubmit = async (e) => { // מה קורה כשהמשתמש שומר הכנסה חדשה או עורכת קיימת
    e.preventDefault(); // מונע מהדף להתרענן
    setSubmitting(true); // מראה שאנחנו בטעינה
    try {
      if (editingId) { // אם אנחנו במצב עריכה
        await api.updateResource('incomes', editingId, {
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      } else { // אם אנחנו מוסיפים הכנסה חדשה
        await api.createIncome({
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      }
      setIsModalOpen(false); // סוגרים את החלונית
      setEditingId(null); // מאפסים את מצב העריכה
      setFormData({ project_id: projectId, description: '', amount: '', date: new Date().toISOString().split('T')[0] }); // מנקים את הטופס
      await fetchIncomes(); // מרעננים את הרשימה על המסך
    } catch (error) {
      console.error('Failed to save income:', error); // אם נכשל
    } finally {
      setSubmitting(false); // סיום מצב השמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת הכנסה מהמערכת
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הכנסה זו?')) return; // בקשת אישור מהמשתמש
    try {
      await api.deleteResource('incomes', id); // מבקשים מהשרת למחוק
      await fetchIncomes(); // מרעננים את הרשימה
    } catch (error) {
      console.error('Failed to delete:', error); // אם נכשל
    }
  };

  const handleEdit = (inc) => { // פתיחת טופס העריכה עם הנתונים הקיימים
    setEditingId(inc.id); // זוכרים איזה הכנסה אנחנו עורכים
    setFormData({
      project_id: inc.project_id,
      description: inc.description,
      amount: inc.amount,
      date: inc.date ? new Date(inc.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true); // פותחים את החלונית
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הכנסות פרויקט</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">מעקב אחר הכנסות ותשלומים נכנסים (P&L)</p>
        </div>
        <div className="flex items-center gap-4">
          <AIExcelUpload projectId={projectId} targetTable="incomes" onSuccess={fetchIncomes} /> {/* כפתור העלאת אקסל חכמה */}
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ project_id: projectId, description: '', amount: '', date: new Date().toISOString().split('T')[0] });
              setIsModalOpen(true);
            }}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף הכנסה
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת הכנסות */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">תאריך קבלה</th>
              <th className="px-6 py-4 font-medium">סכום הכנסה</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {incomes.map(inc => (
              <tr key={inc.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{inc.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(inc.date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-[#10b981]">{formatCurrency(inc.amount)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => handleEdit(inc)} className="p-1 text-text-muted hover:text-blue-500 transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(inc.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* הודעה אם אין הכנסות */}
            {incomes.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <ArrowUpRight className="w-8 h-8 opacity-50 text-[#10b981]" />
                    <span>לא נמצאו הכנסות בפרויקט זה. מומלץ להוסיף הכנסה או להעלות קובץ נתונים.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספת או עריכת הכנסה */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת הכנסה" : "הוספת הכנסה חדשה"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור העסקה / הכנסה</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="לדוגמה: תשלום שלב א' מהלקוח"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום הכנסה (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור הכנסה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
