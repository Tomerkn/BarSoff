import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { api } from '../services/api'; // מביאים את השליח שמדבר עם השרת
import { Loader2, Plus, Briefcase, Pencil, Trash2 } from 'lucide-react'; // מביאים אייקונים יפים
import { Link } from 'react-router-dom'; // כלי למעבר בין דפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת/עריכת פרויקט

export function Projects() { // דף ניהול הפרויקטים הראשי
  const [projects, setProjects] = useState([]); // רשימת הפרויקטים שנשמרת כאן
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת
  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת פרויקט פתוחה
  const [formData, setFormData] = useState({ name: '', location: '', end_date: '', status: 'תקין' }); // הנתונים שהמשתמש ממלא בטופס
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים פרויקט קיים, כאן נשמר המספר שלו

  const fetchProjects = async () => { // פונקציה שמביאה את כל הפרויקטים מהשרת
    try {
      const data = await api.getProjects(); // מבקשים את הרשימה
      setProjects(data); // מעדכנים את הדף עם הרשימה החדשה
    } catch (error) {
      console.error(error); // אם הייתה שגיאה, רושמים אותה
    } finally {
      setLoading(false); // בכל מקרה מפסיקים להראות את סמל הטעינה
    }
  };

  useEffect(() => { // מפעילים את הבאת הפרויקטים ברגע שהדף עולה
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => { // מה קורה כשהמשתמש לוחץ על "שמור" בטופס
    e.preventDefault(); // מונע מהדף להתרענן
    setSubmitting(true); // מראה שאנחנו בטעינה
    try {
      if (editingId) { // אם יש לנו מספר פרויקט, סימן שאנחנו מעדכנים קיים
        await api.updateResource('projects', editingId, formData);
      } else { // אם אין מספר, סימן שאנחנו יוצרים פרויקט חדש לגמרי
        await api.createProject(formData);
      }
      setIsModalOpen(false); // סוגרים את החלונית
      setEditingId(null); // מאפסים את מצב העריכה
      setFormData({ name: '', location: '', end_date: '', status: 'תקין' }); // מנקים את הטופס
      await fetchProjects(); // מרעננים את הרשימה על המסך
    } catch (error) {
      console.error('Failed to save project:', error); // אם נכשל
    } finally {
      setSubmitting(false); // מפסיקים את מצב השמירה
    }
  };

  const handleDelete = async (id, e) => { // מחיקת פרויקט מהמערכת
    e.preventDefault(); // מונע מעבר דף בטעות
    e.stopPropagation(); // עוצר את הלחיצה מלהפעיל דברים אחרים
    if (!window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה? פעולה זו תמחק גם את כל הנתונים המקושרים אליו!')) return; // בקשת אישור מהמשתמש
    try {
      await api.deleteResource('projects', id); // מבקשים מהשרת למחוק
      await fetchProjects(); // מרעננים את הרשימה
    } catch (error) {
      console.error('Failed to delete:', error); // אם נכשל
    }
  };

  const handleEdit = (project, e) => { // פתיחת טופס העריכה עם הנתונים הקיימים
    e.preventDefault();
    e.stopPropagation();
    setEditingId(project.id); // זוכרים איזה פרויקט אנחנו עורכים
    setFormData({
      name: project.name,
      location: project.location || '',
      end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: project.status || 'תקין'
    });
    setIsModalOpen(true); // פותחים את החלונית
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // מראה סמל טעינה אם המידע עוד לא הגיע

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">פרויקטים</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">ניהול כל הפרויקטים הפעילים בחברה</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null); // מאפסים עריכה כדי ליצור חדש
            setFormData({ name: '', location: '', end_date: '', status: 'תקין' }); // טופס נקי
            setIsModalOpen(true); // פתיחת החלונית
          }}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          פרויקט חדש
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* רשת הפרויקטים */}
        {projects.map(project => (
          <Link to={`/projects/${project.id}`} key={project.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[var(--color-brand)] transition-all cursor-pointer block">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${project.status === 'תקין' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-red-500/10 text-red-600'}`}>
                  {project.status} {/* תגית סטטוס (תקין/חריגה) */}
                </span>
                <button onClick={(e) => handleEdit(project, e)} className="p-1 text-text-muted hover:text-[var(--color-brand)] transition-colors" title="ערוך">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleDelete(project.id, e)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">{project.name}</h3>
            <p className="text-sm text-text-secondary mb-4">{project.location}</p>
            
            <div className="border-t border-border pt-4 mt-4 text-sm text-text-secondary flex justify-between">
              <span>תאריך יעד:</span>
              <span className="font-medium text-text-primary">{new Date(project.end_date).toLocaleDateString('he-IL')}</span>
            </div>
          </Link>
        ))}
      </div>
      
      {/* החלונית שקופצת לעדכון פרטי פרויקט */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת פרויקט" : "הוספת פרויקט חדש"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הפרויקט</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">מיקום</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תאריך סיום משוער</label>
            <input 
              type="date" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">סטטוס</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="תקין">תקין</option>
              <option value="עיכוב בלוחות זמנים">עיכוב בלוחות זמנים</option>
              <option value="חריגה תקציבית">חריגה תקציבית</option>
            </select>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור פרויקט'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
