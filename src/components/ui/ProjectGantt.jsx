import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, PlayCircle, Loader2, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

export function ProjectGantt({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTask, setNewTask] = useState({ name: '', start_date: '', end_date: '', progress: 0 });
  
  // Monday Sync State
  const [showMondayModal, setShowMondayModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mondayToken, setMondayToken] = useState('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI');
  const [mondayBoardId, setMondayBoardId] = useState('5089388529');

  const fetchTasks = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleEditTask = (task) => {
    setEditingId(task.id);
    setNewTask({
      name: task.name,
      start_date: new Date(task.start_date).toISOString().split('T')[0],
      end_date: new Date(task.end_date).toISOString().split('T')[0],
      progress: task.progress || 0
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (!newTask.name || !newTask.start_date || !newTask.end_date) return;
    
    try {
      if (editingId) {
        await fetch(`/api/tasks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
      } else {
        await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
      }
      setNewTask({ name: '', start_date: '', end_date: '', progress: 0 });
      setIsModalOpen(false);
      setEditingId(null);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const handleMondaySync = async (e) => {
    e.preventDefault();
    if (!mondayToken || !mondayBoardId) return;
    
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sync-monday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mondayToken, boardId: mondayBoardId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to sync');
      }
      setShowMondayModal(false);
      fetchTasks();
    } catch (error) {
      alert('שגיאה בסנכרון מול מאנדיי: ' + error.message);
      console.error('Monday sync error', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  // Calculate timeline bounds
  const getBounds = () => {
    let minD = new Date();
    let maxD = new Date();
    
    if (tasks.length > 0) {
      const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
      minD = new Date(Math.min(...dates));
      maxD = new Date(Math.max(...dates));
    }
    
    // Add padding (5 days before, 15 days after)
    minD.setDate(minD.getDate() - 5);
    maxD.setDate(maxD.getDate() + 15);
    
    const totalDays = Math.max(1, Math.ceil((maxD - minD) / (1000 * 60 * 60 * 24)));
    return { minDate: minD, maxDate: maxD, totalDays };
  };

  const { minDate, maxDate, totalDays } = getBounds();

  // Generate days array
  const daysArray = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Group by month
  const months = [];
  let currentMonth = null;
  let currentMonthCount = 0;
  
  daysArray.forEach(d => {
    const monthKey = d.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
    if (monthKey !== currentMonth) {
      if (currentMonth) {
        months.push({ name: currentMonth, span: currentMonthCount });
      }
      currentMonth = monthKey;
      currentMonthCount = 1;
    } else {
      currentMonthCount++;
    }
  });
  if (currentMonth) {
    months.push({ name: currentMonth, span: currentMonthCount });
  }

  const todayOffset = Math.floor((new Date() - minDate) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
            לוחות זמנים (Gantt)
          </h2>
          <p className="text-sm text-text-secondary">תכנון ומעקב אחר שלבי הבניה במבט-על</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMondayModal(true)}
            className="bg-[#6161ff] hover:bg-[#4d4dcc] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            סנכרן מ-Monday
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewTask({ name: '', start_date: '', end_date: '', progress: 0 });
              setIsModalOpen(true);
            }}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            משימה חדשה
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface-hover">
          <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">אין משימות בלוח הזמנים</p>
          <p className="text-sm text-text-muted mt-1">הוסף משימה חדשה כדי להתחיל לעקוב אחר התקדמות הבניה</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden flex bg-surface mt-4 shadow-sm" dir="rtl">
          
          {/* Left Panel: WBS Table */}
          <div className="w-[380px] shrink-0 border-l border-border bg-surface z-10 flex flex-col">
            {/* WBS Header */}
            <div className="h-14 flex items-center bg-surface-hover/80 border-b border-border px-3 font-semibold text-sm text-text-primary shrink-0">
               <div className="flex-1 truncate pl-2">משימה / שלב</div>
               <div className="w-20 text-center">התחלה</div>
               <div className="w-20 text-center">סיום</div>
               <div className="w-12 text-center">ימים</div>
               <div className="w-16 text-center">פעולות</div>
            </div>
            
            {/* WBS Rows */}
            <div className="flex-1">
               {tasks.map(task => (
                  <div key={task.id} className="h-12 flex items-center border-b border-border px-3 text-sm hover:bg-surface-hover/30 transition-colors group">
                     <div className="flex-1 truncate pl-2 font-medium text-text-primary" title={task.name}>{task.name}</div>
                     <div className="w-20 text-center text-text-secondary text-[11px] font-mono">{new Date(task.start_date).toLocaleDateString('he-IL')}</div>
                     <div className="w-20 text-center text-text-secondary text-[11px] font-mono">{new Date(task.end_date).toLocaleDateString('he-IL')}</div>
                     <div className="w-12 text-center font-medium bg-surface-hover rounded mx-1 py-1 text-xs">{calculateDays(task.start_date, task.end_date)}</div>
                     <div className="w-16 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditTask(task)} className="text-blue-500 hover:text-blue-600" title="ערוך"><Pencil className="w-3.5 h-3.5"/></button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-600" title="מחק"><Trash2 className="w-3.5 h-3.5"/></button>
                     </div>
                  </div>
               ))}
            </div>
          </div>
          
          {/* Right Panel: Timeline Grid */}
          <div className="flex-1 overflow-x-auto bg-[#fafafa] dark:bg-[#111111] relative custom-scrollbar">
             {/* Timeline Header */}
             <div className="h-14 flex flex-col border-b border-border shrink-0 sticky top-0 z-30 bg-surface" style={{ width: `${totalDays * 32}px` }}>
                {/* Months */}
                <div className="flex h-7 border-b border-border text-xs font-bold text-text-secondary bg-surface-hover/50">
                   {months.map((m, i) => (
                      <div key={i} className="flex items-center justify-center border-l border-border shrink-0" style={{ width: `${m.span * 32}px` }}>
                         {m.name}
                      </div>
                   ))}
                </div>
                {/* Days */}
                <div className="flex h-7 text-xs text-text-muted">
                   {daysArray.map((d, i) => {
                      const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                      return (
                        <div key={i} className={`flex items-center justify-center border-l border-border shrink-0 w-[32px] ${isWeekend ? 'bg-red-500/5 text-red-500/70 font-medium' : ''}`}>
                           {d.getDate()}
                        </div>
                      );
                   })}
                </div>
             </div>
             
             {/* Timeline Body (Rows) */}
             <div className="relative" style={{ width: `${totalDays * 32}px` }}>
                {/* Background Grid */}
                <div className="absolute inset-0 flex pointer-events-none opacity-40 z-0">
                  {daysArray.map((d, i) => (
                     <div key={i} className={`h-full border-l border-border shrink-0 w-[32px] ${d.getDay() === 5 || d.getDay() === 6 ? 'bg-red-500/5' : ''}`} />
                  ))}
                </div>
                
                {/* Today Line */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div 
                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_4px_rgba(239,68,68,0.5)]" 
                    style={{ right: `${todayOffset * 32 + 15}px` }} 
                  >
                    <div className="absolute -top-1 -translate-x-1/2 right-0 w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                  </div>
                )}

                {/* Tasks */}
                {tasks.map(task => {
                   const startOffset = Math.max(0, Math.floor((new Date(task.start_date) - minDate) / (1000 * 60 * 60 * 24)));
                   const endOffset = Math.floor((new Date(task.end_date) - minDate) / (1000 * 60 * 60 * 24));
                   const durationInTimeline = Math.max(1, endOffset - startOffset + 1);
                   const isComplete = task.progress === 100;
                   
                   return (
                     <div key={task.id} className="h-12 border-b border-border relative flex items-center group hover:bg-surface-hover/10 transition-colors">
                        <div 
                          className={`absolute h-7 rounded-md shadow-sm flex items-center overflow-hidden z-10 transition-all cursor-pointer hover:ring-2 ring-white/50 ring-offset-1 ring-offset-surface ${isComplete ? 'bg-[#10b981]' : 'bg-[var(--color-brand)]'}`}
                          onClick={() => handleEditTask(task)}
                          style={{
                            right: `${startOffset * 32}px`, 
                            width: `${durationInTimeline * 32}px`,
                          }}
                          title={`${task.name} (${task.progress}%)`}
                        >
                           {/* Progress fill visual */}
                           <div className="absolute top-0 bottom-0 right-0 bg-black/10 dark:bg-white/20" style={{ width: `${task.progress}%` }} />
                           
                           <span className="relative z-10 text-[11px] text-white font-medium px-2 truncate flex items-center gap-1.5 w-full">
                              {isComplete && <CheckCircle2 className="w-3.5 h-3.5 shrink-0"/>}
                              <span className="truncate drop-shadow-sm">{task.name}</span>
                              <span className="opacity-90 shrink-0 font-mono text-[10px] drop-shadow-sm">{task.progress}%</span>
                           </span>
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת משימה" : "הוספת משימה חדשה"}>
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם המשימה/שלב</label>
            <input 
              type="text" 
              required
              placeholder="למשל: יציקת רצפה"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.name}
              onChange={e => setNewTask({...newTask, name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך התחלה</label>
              <input 
                type="date" 
                required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={newTask.start_date}
                onChange={e => setNewTask({...newTask, start_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך סיום צפוי</label>
              <input 
                type="date" 
                required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={newTask.end_date}
                onChange={e => setNewTask({...newTask, end_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-text-secondary">התקדמות ביצוע</label>
              <span className="text-sm font-bold text-[var(--color-brand)]">{newTask.progress}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={newTask.progress} 
              onChange={e => setNewTask({...newTask, progress: parseInt(e.target.value)})}
              className="w-full h-2 bg-surface-hover border border-border rounded-lg appearance-none cursor-pointer accent-[var(--color-brand)]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              {editingId ? 'שמור שינויים' : 'הוסף משימה'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Monday Modal remains unchanged */}
      {showMondayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#6161ff]" />
              סנכרון מול Monday.com
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              הזן את פרטי ההתחברות שלך כדי למשוך את המשימות מלוח ה-Monday שלך ישירות לכאן. שים לב: זה יחליף את המשימות הקיימות בפרויקט זה.
            </p>
            
            <form onSubmit={handleMondaySync} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">API Token</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#6161ff]"
                  value={mondayToken}
                  onChange={e => setMondayToken(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Board ID (מזהה לוח)</label>
                <input 
                  type="text" 
                  required
                  placeholder="למשל: 5089388529"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#6161ff]"
                  value={mondayBoardId}
                  onChange={e => setMondayBoardId(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowMondayModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  disabled={isSyncing}
                  className="bg-[#6161ff] hover:bg-[#4d4dcc] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  סנכרן עכשיו
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Scrollbar Styles specifically for Gantt */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.5); }
      `}} />
    </div>
  );
}
