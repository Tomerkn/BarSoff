import React, { useEffect, useState, useRef } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, ClipboardCheck, CloudSun, Users, Calendar, Image as ImageIcon } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת דיווח

export function DailyLogs() { // דף יומני עבודה יומיים
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [logs, setLogs] = useState([]); // רשימת היומנים שנשמרת כאן
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת
  
  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת דיווח פתוחה
  const [formData, setFormData] = useState({ // הנתונים שהמשתמש ממלא בטופס הדיווח
    project_id: projectId, 
    date: new Date().toISOString().split('T')[0], // תאריך היום כברירת מחדל
    manager_name: '', 
    weather: 'בהיר', 
    workers_count: '', 
    notes: '' 
  });
  
  const [selectedFile, setSelectedFile] = useState(null); // תמונה שהמשתמש בחר להעלות
  const [isSubmitting, setIsSubmitting] = useState(false); // האם אנחנו באמצע שמירת הדיווח
  const fileInputRef = useRef(null); // התייחסות לשדה בחירת הקובץ

  const fetchLogs = async () => { // פונקציה שמביאה את כל יומני העבודה מהשרת
    try {
      const res = await fetch(`/api/daily-logs?projectId=${projectId}`); // בקשה לשרת
      const data = await res.json(); // המרת התשובה למידע מסודר
      setLogs(data); // שמירת היומנים במערכת
    } catch (error) {
      console.error(error); // רישום שגיאה אם הייתה
    } finally {
      setLoading(false); // הפסקת מצב טעינה
    }
  };

  useEffect(() => { // הבאת היומנים ברגע שהדף עולה
    fetchLogs();
  }, [projectId]);

  const handleSubmit = async (e) => { // שמירת הדיווח החדש
    e.preventDefault(); // מניעת רענון הדף
    setIsSubmitting(true); // מצב שמירה
    
    try {
      let imageUrl = null;
      if (selectedFile) { // אם צירפו תמונה, מעלים אותה קודם לשרת
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('folder', 'יומני_עבודה');
        const uploadRes = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          body: uploadData
        });
        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url; // שומרים את הקישור לתמונה
      }
      
      const payload = { // מכינים את כל נתוני הדיווח לשליחה
        ...formData,
        project_id: projectId,
        image_url: imageUrl
      };
      
      await fetch('/api/daily-logs', { // שולחים את הדיווח המלא לשרת
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setIsModalOpen(false); // סוגרים את החלונית
      setFormData({ // מנקים את הטופס
        project_id: projectId, 
        date: new Date().toISOString().split('T')[0], 
        manager_name: '', 
        weather: 'בהיר', 
        workers_count: '', 
        notes: '' 
      });
      setSelectedFile(null); // מנקים את בחירת הקובץ
      await fetchLogs(); // מרעננים את רשימת היומנים על המסך
    } catch (error) {
      console.error('Failed to create daily log:', error); // אם נכשל
      alert('שגיאה ביצירת יומן העבודה');
    } finally {
      setIsSubmitting(false); // סיום מצב שמירה
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* כותרת הדף */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[var(--color-brand)]" />
            יומן עבודה יומי
          </h1>
          <p className="text-text-secondary text-sm mt-1">תיעוד, פיקוח ומעקב שוטף מהשטח</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          דיווח חדש
        </button>
      </div>

      {/* בדיקה אם יש יומנים או שצריך להציג הודעה שהרשימה ריקה */}
      {logs.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">אין דיווחים עדיין</h3>
          <p className="text-text-secondary mt-1">לחץ על "דיווח חדש" כדי להזין את פיקוח העבודה הראשון שלך לפרויקט זה.</p>
        </div>
      ) : (
        <div className="space-y-6"> {/* רשימת היומנים */}
          {logs.map(log => (
            <div key={log.id} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-4 text-xs">
                  <div className="bg-surface-hover px-3 py-1.5 rounded-lg border border-border flex items-center gap-2 font-medium text-text-primary">
                    <Calendar className="w-4 h-4 text-[var(--color-brand)]" />
                    {new Date(log.date).toLocaleDateString('he-IL')}
                  </div>
                  <div className="bg-surface-hover px-3 py-1.5 rounded-lg border border-border flex items-center gap-2 font-medium text-text-primary">
                    <CloudSun className="w-4 h-4 text-orange-500" />
                    {log.weather}
                  </div>
                  <div className="bg-surface-hover px-3 py-1.5 rounded-lg border border-border flex items-center gap-2 font-medium text-text-primary">
                    <Users className="w-4 h-4 text-blue-500" />
                    {log.workers_count} פועלים
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-text-secondary mb-1">פיקוח ע"י: {log.manager_name}</h3>
                <p className="text-text-primary whitespace-pre-wrap">{log.notes}</p>
              </div>
              
              {/* הצגת תמונה מהשטח אם קיימת */}
              {log.image_url && (
                <div className="md:w-64 h-48 md:h-auto border-t md:border-t-0 md:border-r border-border relative">
                  <img src={log.image_url} alt="Log Attachment" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* חלונית להוספת דיווח חדש */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת דיווח עבודה יומי">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">שם המפקח/מנהל העבודה</label>
              <input 
                type="text" required placeholder="למשל: יוסי כהן"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">מזג אוויר</label>
              <select 
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})}
              >
                <option value="בהיר">בהיר ☀️</option>
                <option value="מעונן">מעונן ☁️</option>
                <option value="גשום">גשום 🌧️</option>
                <option value="שרב">שרב 🏜️</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">כמות פועלים בשטח</label>
              <input 
                type="number" required min="0" placeholder="0"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.workers_count} onChange={e => setFormData({...formData, workers_count: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">הערות ותיאור העבודה שבוצעה</label>
            <textarea 
              required rows={4} placeholder="פרט את העבודות שבוצעו היום, בעיות שעלו, ועיכובים..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] resize-none"
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          {/* שדה להעלאת תמונה */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תמונה מהשטח (אופציונלי)</label>
            <input 
              type="file" accept="image/*" className="hidden" ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-hover transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-text-muted mb-2" />
              <span className="text-sm font-medium text-[var(--color-brand)]">
                {selectedFile ? selectedFile.name : 'בחר תמונה או גרור לכאן'}
              </span>
            </div>
          </div>

          {/* כפתורי שמירה וביטול */}
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור דיווח'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
