import React, { useState, useEffect, useRef } from 'react'; // מביאים את הכלים של ריאקט שיעזרו לנו לנהל את המידע על המסך
import { api } from '../../services/api'; // השליח שלנו שמדבר עם השרת ומביא נתונים
import { Bot, Send, Upload, FileText, Loader2, Paperclip, X, ShieldCheck, HelpCircle } from 'lucide-react'; // אוסף אייקונים יפים כדי שהכל יראה מקצועי

export function ProjectChat({ projectId }) { // הרכיב שאחראי על הצ'אט החכם עם ברבור
  // --- המשתנים של הצ'אט (מה המצב כרגע?) ---
  const [messages, setMessages] = useState([ // רשימת ההודעות שרואים על המסך
    { id: 1, type: 'bot', text: 'אהלן, ברבור כאן 🦢. אני שולט בכל המסמכים והנתונים של הפרויקט. מה נרצה לבדוק היום? אני יכול לעבור על הצעות מחיר, תקציבים או כל מה שקבור באותיות הקטנות.' }
  ]);
  const [input, setInput] = useState(''); // מה שהמשתמש כותב כרגע בתיבת הטקסט
  const [loading, setLoading] = useState(false); // האם ברבור חושב על תשובה כרגע?
  const [uploading, setUploading] = useState(false); // האם אנחנו באמצע העלאת קובץ?
  const [files, setFiles] = useState([]); // רשימת הקבצים שהמערכת כבר למדה
  const messagesEndRef = useRef(null); // עוזר לנו לגלול תמיד לסוף הצ'אט באופן אוטומטי
  const fileInputRef = useRef(null); // הקישור לכפתור העלאת הקבצים הנסתר
  const tenderInputRef = useRef(null); // הקישור לכפתור ניתוח המכרזים

  // פונקציה שמביאה את רשימת הקבצים שברבור כבר מכיר בפרויקט הזה
  const fetchFiles = async () => {
    try {
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('אופס, לא הצלחנו למשוך את רשימת הקבצים:', error);
    }
  };

  // מביאים את הקבצים ברגע שנכנסים לפרויקט
  useEffect(() => {
    if (projectId) fetchFiles();
  }, [projectId]);

  // גוללים למטה בכל פעם שיש הודעה חדשה כדי שלא נצטרך לגלול ידנית
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // הודעות מתחלפות בזמן שברבור "חושב" כדי שהמשתמש יבין מה קורה
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const loadingSteps = [
    "ברבור סורק את המסמכים...",
    "מנתח נתונים והצלבות...",
    "בודק היסטוריית מחירים...",
    "מגבש תשובה מדויקת..."
  ];

  // מחליפים את הודעת הטעינה כל 3 שניות
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setCurrentLoadingStep(prev => (prev + 1) % loadingSteps.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // העלאת קובץ לפרויקט דרך הצ'אט
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `מעלה ולומד את הקובץ: ${file.name}...` }]);

    try {
      await api.uploadProjectFile(projectId, file);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        type: 'bot', 
        text: `הקובץ ${file.name} נלמד בהצלחה! אני מוכן לענות על שאלות לגביו.`
      }]);
      fetchFiles(); // רענון רשימת הקבצים
    } catch (error) {
      alert('העלאת הקובץ נכשלה, וודא שהקובץ תקין.');
    } finally {
      setUploading(false);
    }
  };

  // מה קורה כששולחים שאלה בצ'אט
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'error', text: 'משהו השתבש בתקשורת עם ברבור.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* כותרת הצ'אט עם שם הפרויקט ומצב המסמכים */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">ברבור 🦢</h3>
            <p className="text-xs text-text-secondary">עוזר בינה מלאכותית חכם</p>
          </div>
        </div>
        <div className="text-xs text-text-muted">{files.length} מסמכים סרוקים במערכת</div>
      </div>

      {/* אזור ההודעות - כאן רואים את כל השיחה */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
              msg.type === 'user' ? 'bg-[var(--color-brand)] text-white rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'
            }`}>
              
              {/* הצגת תהליך המחשבה של ברבור - שקיפות מלאה למנכ"ל */}
              {msg.type === 'bot' && msg.text.includes('[THOUGHT]') && (
                <div className="mb-2 p-2 bg-slate-50 border-r-2 border-slate-300 text-[10px] text-slate-500 italic rounded">
                  <strong>ברבור חשב על זה ככה:</strong>
                  {msg.text.match(/\[THOUGHT\](.*?)\[\/THOUGHT\]/s)?.[1] || ''}
                </div>
              )}

              {/* גוף ההודעה הנקי (בלי תגיות המחשבה והוודאות) */}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.type === 'bot' 
                  ? msg.text.replace(/\[THOUGHT\].*?\[\/THOUGHT\]/s, '').replace(/\[CONFIDENCE\].*?\[\/CONFIDENCE\]/s, '').trim() 
                  : msg.text}
              </p>

              {/* הצגת באדג' רמת וודאות - כדי שהמנהל ידע כמה לסמוך על התשובה */}
              {msg.type === 'bot' && msg.text.includes('[CONFIDENCE]') && (
                <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                  {(() => {
                    const conf = parseInt(msg.text.match(/\[CONFIDENCE\](\d+)\[\/CONFIDENCE\]/)?.[1] || '0');
                    const color = conf > 80 ? 'text-emerald-600 bg-emerald-50' : conf > 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>וודאות: {conf}%</span>
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* אנימציית טעינה בזמן שברבור מכין תשובה */}
        {(loading || uploading) && (
          <div className="flex items-center gap-2 text-text-muted italic text-xs p-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{uploading ? "מעלה קובץ ולומד את הנתונים..." : loadingSteps[currentLoadingStep]}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* שורת הכתיבה - איפה ששואלים ומעלים קבצים */}
      <div className="p-4 border-t border-border bg-surface">
        <form onSubmit={handleSend} className="flex gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <Paperclip className="w-5 h-5" />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </button>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="שאל את ברבור משהו על הפרויקט..." 
            className="flex-1 p-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
            disabled={uploading}
          />
          <button type="submit" className="bg-[var(--color-brand)] text-white p-2 rounded-lg hover:opacity-90">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
