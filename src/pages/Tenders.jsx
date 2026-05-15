import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  FileSearch, 
  Upload, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Download, 
  BrainCircuit,
  TrendingUp,
  Search,
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function Tenders() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      const data = await api.getTenders();
      setTenders(data);
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      await api.createTender(file);
      await fetchTenders();
    } catch (error) {
      alert('שגיאה בהעלאת המכרז');
    } finally {
      setUploading(false);
    }
  };

  const generateProposal = async (id) => {
    setGenerating(true);
    try {
      await api.generateTenderProposal(id);
      await fetchTenders();
      // עדכון ה-Selected כדי להציג את ההצעה שנוצרה
      const updated = await api.getTenders();
      setSelectedTender(updated.find(t => t.id === id));
    } catch (error) {
      alert('שגיאה בהפקת הצעת מחיר');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
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
        {/* Tender List */}
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
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    tender.status === 'נותח' ? 'bg-emerald-100 text-emerald-700' :
                    tender.status === 'הצעה מוכנה' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {tender.status}
                  </div>
                </button>
              ))}
              {tenders.length === 0 && (
                <div className="p-8 text-center text-text-muted italic text-sm">
                  טרם הועלו מכרזים.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {selectedTender ? (
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col">
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
                {/* Analysis Section */}
                <section>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700 border-b pb-2">
                    <Search className="w-5 h-5 text-blue-500" />
                    ניתוח מכרז חכם
                  </h3>
                  <div className="prose prose-sm max-w-none text-text-primary bg-blue-50/30 p-4 rounded-xl border border-blue-100 leading-relaxed whitespace-pre-wrap">
                    {selectedTender.analysis || 'הניתוח בביצוע...'}
                  </div>
                </section>

                {/* Proposal Section */}
                {selectedTender.proposal && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-700 border-b pb-2 flex-1">
                        <TrendingUp className="w-5 h-5" />
                        הצעת מחיר וכתב כמויות מוצע
                      </h3>
                    </div>
                    <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100 shadow-inner">
                      <div className="prose prose-sm max-w-none text-text-primary whitespace-pre-wrap leading-relaxed">
                        {selectedTender.proposal}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-border bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                        <Download className="w-4 h-4" />
                        ייצוא ל-PDF
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 border border-border bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                        <Download className="w-4 h-4" />
                        ייצוא ל-Excel
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
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
