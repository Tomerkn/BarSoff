import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, HardHat, Phone, Mail, Pencil, Trash2 } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים

export function Contractors() { // דף ניהול רשימת הקבלנים
  const [contractors, setContractors] = useState([]); // רשימת הקבלנים שנשמרת כאן
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת
  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת קבלן פתוחה
  const [formData, setFormData] = useState({ name: '', specialization: '', phone: '', email: '' }); // הנתונים שהמשתמש ממלא בטופס
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים קבלן קיים, כאן נשמר המספר שלו

  const fetchContractors = async () => { // פונקציה שמביאה את כל הקבלנים מהשרת
    try {
      const data = await api.getContractors(); // מבקשים את הרשימה מהשרת
      setContractors(data); // מעדכנים את הרשימה על המסך
    } catch (error) {
      console.error(error); // רישום שגיאה במידה והייתה תקלה
    } finally {
      setLoading(false); // מפסיקים להראות טעינה
    }
  };

  useEffect(() => { // מפעילים את הבאת הנתונים ברגע שהדף עולה
    fetchContractors();
  }, []);

  const handleSubmit = async (e) => { // מה קורה כשהמשתמש שומר קבלן חדש או עורך קיים
    e.preventDefault(); // מונע מהדף להתרענן
    setSubmitting(true); // מראה שאנחנו בטעינה
    try {
      if (editingId) { // אם אנחנו במצב עריכה
        await api.updateResource('contractors', editingId, formData);
      } else { // אם אנחנו מוסיפים קבלן חדש
        await api.createContractor(formData);
      }
      setIsModalOpen(false); // סוגרים את החלונית
      setEditingId(null); // מאפסים את מצב העריכה
      setFormData({ name: '', specialization: '', phone: '', email: '' }); // מנקים את הטופס
      await fetchContractors(); // מרעננים את הרשימה על המסך
    } catch (error) {
      console.error('Failed to save contractor:', error); // אם נכשל
    } finally {
      setSubmitting(false); // סיום מצב השמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת קבלן מהמערכת
    if (!window.confirm('האם אתה בטוח שברצונך למחוק קבלן זה?')) return; // בקשת אישור מהמשתמש
    try {
      await api.deleteResource('contractors', id); // מבקשים מהשרת למחוק
      await fetchContractors(); // מרעננים את הרשימה
    } catch (error) {
      console.error('Failed to delete:', error); // אם נכשל
    }
  };

  const handleEdit = (contractor) => { // פתיחת טופס העריכה עם הנתונים הקיימים
    setEditingId(contractor.id); // זוכרים איזה קבלן אנחנו עורכים
    setFormData({
      name: contractor.name,
      specialization: contractor.specialization || '',
      phone: contractor.phone || '',
      email: contractor.email || ''
    });
    setIsModalOpen(true); // פותחים את החלונית
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">קבלנים</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">מאגר קבלני ביצוע ויעוץ</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null); // מאפסים עריכה כדי ליצור חדש
            setFormData({ name: '', specialization: '', phone: '', email: '' }); // טופס נקי
            setIsModalOpen(true); // פתיחת החלונית
          }}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף קבלן
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת קבלנים */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">שם קבלן</th>
              <th className="px-6 py-4 font-medium">התמחות</th>
              <th className="px-6 py-4 font-medium">טלפון</th>
              <th className="px-6 py-4 font-medium">דוא"ל</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contractors.map(c => (
              <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{c.specialization}</td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <div className="flex items-center gap-2" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span>{c.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    {c.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => handleEdit(c)} className="p-1 text-text-muted hover:text-[var(--color-brand)] transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* הודעה אם אין קבלנים */}
            {contractors.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">לא נמצאו קבלנים במאגר.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספת או עריכת קבלן */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת קבלן" : "הוספת קבלן חדש"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הקבלן / חברה</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">התמחות</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">טלפון</label>
            <input 
              type="tel" required dir="ltr"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] text-left"
              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">דוא"ל</label>
            <input 
              type="email" required dir="ltr"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] text-left"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור קבלן'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
