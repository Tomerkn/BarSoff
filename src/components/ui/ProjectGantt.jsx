import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, PlayCircle, Loader2, RefreshCw } from 'lucide-react';

export function ProjectGantt({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
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

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.name || !newTask.start_date || !newTask.end_date) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        setNewTask({ name: '', start_date: '', end_date: '', progress: 0 });
        setIsAdding(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error adding task', error);
    }
  };

  const updateProgress = async (task, newProgress) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, progress: newProgress })
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task', error);
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
    if (tasks.length === 0) {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return { minDate: today, maxDate: nextMonth, totalDays: 30 };
    }
    
    const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Add some padding
    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 5);
    
    const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    return { minDate, maxDate, totalDays };
  };

  const { minDate, totalDays } = getBounds();

  const getTaskStyle = (task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    
    const leftPercent = Math.max(0, ((start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    const widthPercent = Math.max(2, ((end - start) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
            לוחות זמנים (Gantt)
          </h2>
          <p className="text-sm text-text-secondary">תכנון ומעקב אחר שלבי הבניה</p>
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
            onClick={() => setIsAdding(!isAdding)}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            משימה חדשה
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-surface-hover p-4 rounded-xl border border-border mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-secondary mb-1">שם המשימה/שלב</label>
            <input 
              type="text" 
              required
              placeholder="למשל: יציקת רצפה"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.name}
              onChange={e => setNewTask({...newTask, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה</label>
            <input 
              type="date" 
              required
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.start_date}
              onChange={e => setNewTask({...newTask, start_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">תאריך סיום צפוי</label>
            <input 
              type="date" 
              required
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.end_date}
              onChange={e => setNewTask({...newTask, end_date: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-text-primary hover:bg-black dark:hover:bg-white text-surface px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            שמור
          </button>
        </form>
      )}

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

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface-hover">
          <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">אין משימות בלוח הזמנים</p>
          <p className="text-sm text-text-muted mt-1">הוסף משימה חדשה כדי להתחיל לעקוב אחר התקדמות הבניה</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[800px]">
            {/* Gantt Header */}
            <div className="flex border-b border-border pb-2 mb-4 text-sm font-medium text-text-secondary">
              <div className="w-1/3 shrink-0 px-2">שם המשימה / התקדמות</div>
              <div className="w-2/3 relative h-6 border-l border-border border-dashed">
                <span className="absolute left-0 -translate-x-1/2 bg-surface px-2">{minDate.toLocaleDateString('he-IL', {day:'numeric', month:'short'})}</span>
                <span className="absolute left-1/2 -translate-x-1/2 bg-surface px-2 text-xs opacity-50">ציר זמן (Gantt)</span>
                <span className="absolute right-0 translate-x-1/2 bg-surface px-2">סיום צפוי</span>
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center group">
                  <div className="w-1/3 shrink-0 pr-2 pl-4 flex flex-col justify-center">
                    <span className="font-medium text-text-primary text-sm truncate">{task.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={task.progress} 
                        onChange={(e) => updateProgress(task, parseInt(e.target.value))}
                        className="w-24 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-[var(--color-brand)]"
                      />
                      <span className="text-xs text-text-muted w-8">{task.progress}%</span>
                    </div>
                  </div>
                  
                  <div className="w-2/3 relative h-10 border-l border-border/50 border-dashed bg-surface-hover/30 rounded-r-lg">
                    <div 
                      className="absolute h-6 top-2 rounded-md shadow-sm flex items-center overflow-hidden"
                      style={{
                        ...getTaskStyle(task),
                        backgroundColor: task.progress === 100 ? '#10b981' : 'var(--color-brand)',
                      }}
                      title={`${task.name} (${new Date(task.start_date).toLocaleDateString('he-IL')} - ${new Date(task.end_date).toLocaleDateString('he-IL')})`}
                    >
                      {/* Progress Fill inside the bar */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-white/20"
                        style={{ width: `${task.progress}%` }}
                      />
                      
                      {task.progress === 100 && <CheckCircle2 className="w-3 h-3 text-white absolute left-1.5 z-10" />}
                      {task.progress > 0 && task.progress < 100 && <PlayCircle className="w-3 h-3 text-white absolute left-1.5 z-10 opacity-70" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
