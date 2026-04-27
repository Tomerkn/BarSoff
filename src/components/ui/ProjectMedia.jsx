import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileText, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export function ProjectMedia({ projectId }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('הכל');
  const [uploadFolder, setUploadFolder] = useState('כללי');
  const fileInputRef = useRef(null);

  const FOLDERS = ['כללי', 'תכנון ורישוי', 'שלב יסודות', 'שלב שלד', 'שלב מערכות', 'שלב גמרים', 'מסירות'];

  const fetchMedia = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/media`);
      const data = await response.json();
      setMedia(data);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [projectId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !projectId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', uploadFolder);

    try {
      const response = await fetch(`/api/projects/${projectId}/media`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      await fetchMedia();
    } catch (error) {
      console.error('Upload error:', error);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredMedia = media.filter(m => {
    const matchesSearch = m.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeTab === 'הכל' || (m.folder || 'כללי') === activeTab;
    return matchesSearch && matchesFolder;
  });

  const images = filteredMedia.filter(m => m.mime_type?.startsWith('image/'));
  const documents = filteredMedia.filter(m => !m.mime_type?.startsWith('image/'));

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">גלריה ומסמכים</h2>
          <p className="text-sm text-text-secondary">תמונות מהשטח ומסמכי פרויקט לפי שלבי בניה</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={uploadFolder} 
            onChange={e => setUploadFolder(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)] shrink-0"
            disabled={uploading}
          >
            {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          
          <input 
            type="file" 
            accept="image/*,application/pdf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 flex-1 md:flex-auto"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? 'מעלה...' : 'העלאה לתיקייה'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 bg-surface-hover p-2 rounded-xl border border-border">
        {/* Tabs scrollable on mobile */}
        <div className="flex overflow-x-auto gap-2 pb-1 md:pb-0 scrollbar-hide flex-1">
          <button 
            onClick={() => setActiveTab('הכל')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'הכל' ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            הכל
          </button>
          {FOLDERS.map(folder => (
            <button 
              key={folder}
              onClick={() => setActiveTab(folder)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === folder ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              {folder}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <input 
            type="text" 
            placeholder="חיפוש לפי שם קובץ..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-4 pr-10 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface-hover">
          <ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">אין עדיין קבצים בפרויקט זה</p>
          <p className="text-sm text-text-muted mt-1">לחץ על כפתור ההעלאה למעלה או פתח את המצלמה בנייד</p>
        </div>
      ) : (
        <div className="space-y-8">
          {images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[var(--color-brand)]" />
                תמונות מהשטח
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map(img => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block group relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                    <img src={img.url} alt={img.original_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <span className="text-white text-xs font-medium truncate w-full mb-1">{img.original_name}</span>
                      <span className="text-white/80 text-[10px]">{img.folder || 'כללי'}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--color-brand)]" />
                מסמכים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate mb-0.5">{doc.original_name}</p>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="bg-surface border border-border px-1.5 py-0.5 rounded">{doc.folder || 'כללי'}</span>
                        <span>{new Date(doc.upload_date).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
