import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';

export function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', end_date: '', status: 'תקין' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProject(formData);
      setIsModalOpen(false);
      setFormData({ name: '', location: '', end_date: '', status: 'תקין' });
      await fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">פרויקטים</h1>
          <p className="text-text-secondary text-sm">ניהול כל הפרויקטים הפעילים בחברה</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          פרויקט חדש
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <Link to={`/projects/${project.id}`} key={project.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[var(--color-brand)] transition-all cursor-pointer block">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${project.status === 'תקין' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-red-500/10 text-red-600'}`}>
                {project.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">{project.name}</h3>
            <p className="text-sm text-text-secondary mb-4">{project.location}</p>
            
            <div className="border-t border-border pt-4 mt-4 text-sm text-text-secondary flex justify-between">
              <span>תאריך יעד:</span>
              <span className="font-medium text-text-primary">{new Date(project.end_date).toLocaleDateString('he-IL')}</span>
            </div>
          </Link>
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת פרויקט חדש">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הפרויקט</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">מיקום</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תאריך סיום משוער</label>
            <input 
              type="date" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">סטטוס</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="תקין">תקין</option>
              <option value="עיכוב בלוחות זמנים">עיכוב בלוחות זמנים</option>
              <option value="חריגה תקציבית">חריגה תקציבית</option>
            </select>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור פרויקט'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
