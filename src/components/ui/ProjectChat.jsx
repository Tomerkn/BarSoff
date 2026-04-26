import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Bot, Send, Upload, FileText, Loader2, Paperclip, X } from 'lucide-react';

export function ProjectChat({ projectId }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'היי! אני עוזר ה-AI של הפרויקט. העלה מסמכים (כמו מפרטים וכתבי כמויות) ותוכל לשאול אותי שאלות עליהם.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('נא להעלות קבצי PDF בלבד בגרסה זו.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }
      
      await fetchFiles();
      setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: `הקובץ ${file.name} הועלה ועובד בהצלחה. כעת ניתן לשאול עליו שאלות.` }]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`שגיאה בהעלאת הקובץ:\n${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      
      if (!response.ok) throw new Error('Chat request failed');
      
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: data.answer }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { id: Date.now(), type: 'error', text: 'מצטער, חלה שגיאה בתקשורת עם מנוע ה-AI. ודא ש-Ollama פועל ברקע.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Barsoff AI</h3>
            <p className="text-xs text-text-secondary">חיפוש חכם במסמכי הפרויקט</p>
          </div>
        </div>
        
        {/* Files Dropdown (simplified) */}
        <div className="relative group">
          <button className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <FileText className="w-4 h-4" />
            <span>{files.length} מסמכים סרוקים</span>
          </button>
          
          <div className="absolute left-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 p-2 max-h-64 overflow-y-auto">
            <h4 className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider px-2">קבצים זמינים לחיפוש:</h4>
            {files.length === 0 ? (
              <p className="text-sm text-text-muted px-2 pb-2">לא הועלו קבצים.</p>
            ) : (
              <ul className="space-y-1">
                {files.map(f => (
                  <li key={f.id} className="text-sm text-text-primary p-2 hover:bg-surface-hover rounded-md flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{f.original_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.type === 'user' 
                  ? 'bg-[var(--color-brand)] text-white rounded-tr-none' 
                  : msg.type === 'error'
                  ? 'bg-red-500/10 text-red-500 rounded-tl-none border border-red-500/20'
                  : msg.type === 'system'
                  ? 'bg-blue-500/10 text-blue-600 rounded-lg text-sm mx-auto text-center border border-blue-500/20'
                  : 'bg-surface border border-border text-text-primary rounded-tl-none shadow-sm'
              }`}
            >
              {msg.type === 'bot' && (
                <div className="flex items-center gap-2 mb-1 text-[var(--color-brand)]">
                  <Bot className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">AI Assistant</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
              <span className="text-sm text-text-secondary">מחפש במסמכים...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-surface">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          
          {/* Hidden File Input */}
          <input 
            type="file" 
            accept=".pdf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={uploading}
          />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 text-text-secondary hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 rounded-xl transition-colors disabled:opacity-50 shrink-0"
            title="העלאת מסמך PDF (תוכניות, מפרטים)"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="שאל שאלה על מסמכי הפרויקט... (למשל: 'כמה מטר ריצוף דרוש?')"
              className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)] resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute left-2 bottom-2 p-1.5 bg-[var(--color-brand)] text-white rounded-lg hover:bg-[#46a2aa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
