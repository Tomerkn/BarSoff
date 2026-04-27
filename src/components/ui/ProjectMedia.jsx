import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileText, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export function ProjectMedia({ projectId }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const images = media.filter(m => m.mime_type?.startsWith('image/'));
  const documents = media.filter(m => !m.mime_type?.startsWith('image/'));

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">גלריה ומסמכים</h2>
          <p className="text-sm text-text-secondary">תמונות מהשטח ומסמכי פרויקט בגיבוי ענן</p>
        </div>
        
        <div>
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
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? 'מעלה לענן...' : 'העלאת תמונה / מסמך'}
          </button>
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-white text-xs truncate w-full">{img.original_name}</span>
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
                      <p className="text-sm font-medium text-text-primary truncate">{doc.original_name}</p>
                      <p className="text-xs text-text-muted">{new Date(doc.upload_date).toLocaleDateString('he-IL')}</p>
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
