import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Plus, Wallet } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Budget() {
  const { projectId } = useParams();
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ project_id: projectId, category: '', total_amount: '', approved_date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [budgetsData, projectsData] = await Promise.all([
        api.getBudgets(),
        api.getProjects()
      ]);
      
      const projectBudgets = budgetsData.filter(b => b.project_id === Number(projectId));
      
      const budgetsWithProjects = projectBudgets.map(b => ({
        ...b,
        project_name: projectsData.find(p => p.id === b.project_id)?.name || 'לא ידוע'
      }));
      
      setBudgets(budgetsWithProjects);
      setProjects(projectsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createBudget({
        ...formData,
        project_id: projectId,
        total_amount: Number(formData.total_amount)
      });
      setIsModalOpen(false);
      setFormData({ project_id: projectId, category: '', total_amount: '', approved_date: new Date().toISOString().split('T')[0] });
      await fetchData();
    } catch (error) {
      console.error('Failed to create budget:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול תקציב</h1>
          <p className="text-text-secondary text-sm">ניהול ומעקב אחר מסגרות התקציב לפרויקטים</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף סעיף תקציבי
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">סעיף/קטגוריה</th>
              <th className="px-6 py-4 font-medium">תאריך אישור</th>
              <th className="px-6 py-4 font-medium">סכום מאושר</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {budgets.map(b => (
              <tr key={b.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-text-muted" />
                    <span className="font-medium text-text-primary">{b.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(b.approved_date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-[#10b981]">{formatCurrency(b.total_amount)}</td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr><td colSpan="3" className="px-6 py-8 text-center text-text-muted">לא נמצאו סעיפי תקציב במערכת.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת סעיף תקציבי חדש">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הסעיף (קטגוריה)</label>
            <input 
              type="text" required placeholder="למשל: עבודות שלד, חשמל..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום מאושר (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך אישור</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.approved_date} onChange={e => setFormData({...formData, approved_date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור תקציב'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
