import React, { useState, useEffect } from 'react'; // הכלים הבסיסיים של ריאקט לבניית המסך
import { api } from '../services/api'; // החיבור שלנו לשרת כדי לבקש נתונים
import { 
  FileSearch, Upload, Plus, Clock, CheckCircle, AlertCircle, 
  FileText, Download, BrainCircuit, TrendingUp, Search, Loader2, ChevronRight 
} from 'lucide-react'; // אוסף האייקונים היפים שמעצבים את הדף
import { TargetPriceCalculator } from '../components/ui/TargetPriceCalculator';

export default function Tenders() {
  // --- המשתנים של הדף (הזיכרון המקומי של המסך) ---
  const [tenders, setTenders] = useState([]); // רשימת המכרזים שהעלינו
  const [loading, setLoading] = useState(true); // האם אנחנו בטעינה ראשונית?
  const [uploading, setUploading] = useState(false); // האם קובץ עולה עכשיו?
  const [selectedTender, setSelectedTender] = useState(null); // איזה מכרז המשתמש בחר לראות כרגע
  const [generating, setGenerating] = useState(false); // האם ברבור מייצר עכשיו הצעת מחיר?
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    "ברבור קורא את האותיות הקטנות...",
    "מזהה תנאי סף ודרישות חובה...",
    "מחשב לוחות זמנים וקנסות...",
    "מגבש סיכום מנהלים חכם..."
  ];

  useEffect(() => {
    let interval;
    if (uploading || generating) {
      interval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % loadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [uploading, generating]);

  // מנגנון רענון אוטומטי כדי לראות סטטוס חי של ברבור
  useEffect(() => {
    const hasInProgress = tenders.some(t => 
      t.status !== 'נותח' && t.status !== 'הצעה מוכנה' && t.status !== 'שגיאה'
    );

    if (hasInProgress) {
      const interval = setInterval(fetchTenders, 3000); // רענון כל 3 שניות
      return () => clearInterval(interval);
    }
  }, [tenders]);

  useEffect(() => {
    fetchTenders();
  }, []);

  // פונקציה שמושכת את המכרזים ומעדכנת את המסך
  const fetchTenders = async () => {
    try {
      const data = await api.getTenders();
      setTenders(data);
    } catch (error) {
      console.error('אופס, לא הצלחנו להביא את המכרזים:', error);
    } finally {
      setLoading(false);
    }
  };

  // מה קורה כשבוחרים קובץ מכרז (PDF) ומעלים אותו
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true); // מראים למשתמש שאנחנו עובדים
    try {
      await api.createTender(file); // שולחים את הקובץ לשרת
      await fetchTenders(); // מרעננים את הרשימה כדי לראות את המכרז החדש
    } catch (error) {
      alert('משהו השתבש בהעלאה, נסה שוב.');
    } finally {
      setUploading(false);
    }
  };

  // הפקודה לברבור: "קח את המכרז הזה ותכין לי הצעה על בסיס העבר"
  const generateProposal = async (id) => {
    setGenerating(true);
    try {
      await api.generateTenderProposal(id); // הקסם קורה פה בשרת
      await fetchTenders(); // מרעננים נתונים
      // מוודאים שהמסך מראה את המכרז המעודכן עם ההצעה
      const updated = await api.getTenders();
      setSelectedTender(updated.find(t => t.id === id));
    } catch (error) {
      alert('ברבור נתקע קצת ביצירת ההצעה, נסה שוב.');
    } finally {
      setGenerating(false);
    }
  };

  // אם המערכת עדיין טוענת את המכרזים, נראה עיגול מסתובב
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* כותרת הדף וכפתור העלאה */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול מכרזים חכם</h1>
          <p className="text-text-secondary">ניתוח מכרזים והפקת הצעות מחיר מבוססות בינה מלאכותית</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-brand)] text-white rounded-xl hover:bg-[var(--color-brand-dark)] transition-all cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span className="font-medium text-sm">העלאת מכרז חדש</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* צד ימין: רשימת המכרזים האחרונים */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[var(--color-brand)]" />
                מכרזים אחרונים
              </h2>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {tenders.map((tender) => (
                <button
                  key={tender.id}
                  onClick={() => setSelectedTender(tender)}
                  className={`w-full p-4 text-right hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 ${selectedTender?.id === tender.id ? 'bg-blue-50/50 border-r-4 border-[var(--color-brand)]' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{tender.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-xs text-text-muted">{new Date(tender.upload_date).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                  {/* סטטוס המכרז - מנתח, נותח או הצעה מוכנה */}
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    tender.status === 'נותח' ? 'bg-emerald-100 text-emerald-700' :
                    tender.status === 'הצעה מוכנה' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {tender.status}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* צד שמאל: תצוגת התוכן (ניתוח והצעת מחיר) */}
        <div className="lg:col-span-2">
          {selectedTender ? (
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col">
              {/* כותרת המכרז הנבחר */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                    <FileText className="w-6 h-6 text-[var(--color-brand)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedTender.name}</h2>
                    <p className="text-xs text-text-muted">מזהה פנימי: {selectedTender.id}</p>
                  </div>
                </div>
                {/* כפתור הפקת הצעה - מופיע רק אם המכרז כבר נותח אבל עדיין אין הצעה */}
                {!selectedTender.proposal && selectedTender.status === 'נותח' && (
                  <button 
                    onClick={() => generateProposal(selectedTender.id)}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                    <span className="font-bold text-sm">הפקת הצעת מחיר אוטומטית</span>
                  </button>
                )}
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-white/50">
                {/* אזור ניתוח המכרז (תנאי סף, לו"ז וכו') */}
                <section>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700 border-b pb-2">
                    <Search className="w-5 h-5 text-blue-500" />
                    ניתוח מכרז חכם
                  </h3>
                  <div className="prose prose-sm max-w-none text-text-primary bg-blue-50/30 p-4 rounded-xl border border-blue-100 leading-relaxed whitespace-pre-wrap">
                    {selectedTender.analysis || (
                      <div className="flex items-center gap-3 text-[var(--color-brand)] font-medium">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {loadingSteps[currentStep]}
                      </div>
                    )}
                  </div>
                </section>

                {/* אזור הצעת המחיר (אם כבר הופקה) */}
                {selectedTender.proposal && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-700 border-b pb-2 flex-1">
                          <TrendingUp className="w-5 h-5" />
                          הצעת מחיר מבוססת היסטוריה
                        </h3>
                      </div>
                      <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100 shadow-inner mb-6">
                        <div className="prose prose-sm max-w-none text-text-primary whitespace-pre-wrap leading-relaxed">
                          {selectedTender.proposal}
                        </div>
                      </div>
                    </div>
                    
                    {/* מחשבון מחיר מטרה */}
                    {selectedTender.boq_json && (
                      <TargetPriceCalculator 
                        tenderId={selectedTender.id} 
                        initialBoqJson={selectedTender.boq_json} 
                      />
                    )}
                  </section>
                )}
              </div>
            </div>
          ) : (
            // מסך ריק שמופיע כשעדיין לא נבחר מכרז מהרשימה
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col items-center justify-center p-12 text-center text-text-muted">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-border">
                <FileSearch className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">בחר מכרז כדי לראות ניתוח</h3>
              <p className="max-w-xs mx-auto mt-2">העלה קובץ PDF של מכרז חדש או בחר מכרז קיים מהרשימה כדי להתחיל.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
