import React, { useState, useRef } from 'react';
import { Upload, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function AIExcelUpload({ projectId, targetTable, onSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const cn = (...inputs) => twMerge(clsx(inputs));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetTable', targetTable);

    try {
      const response = await fetch(`${api.baseUrl}/projects/${projectId}/import-excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setSuccessMsg(`הוזנו בהצלחה ${result.count} רשומות!`);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(`שגיאה בייבוא: ${error.message}`);
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  return (
    <div className="inline-flex items-center gap-3">
      <input 
        type="file" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary",
          "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        )}
      >
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isUploading ? 'טוען נתונים...' : 'ייבא מאקסל'}
      </button>

      {successMsg && (
        <span className="text-[#10b981] text-sm font-medium flex items-center gap-1 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </span>
      )}
    </div>
  );
}
