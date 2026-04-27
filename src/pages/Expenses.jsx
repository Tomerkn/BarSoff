import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Plus, ReceiptText } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Expenses() {
  const { projectId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ project_id: projectId, budget_id: '', contractor_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const data = await api.getExpenses();
      const projectExpenses = data.filter(e => e.project_id === Number(projectId));
      setExpenses(projectExpenses);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [p, b, c] = await Promise.all([
        api.getProjects(),
        api.getBudgets(),
        api.getContractors()
      ]);
      setProjects(p);
      setBudgets(b);
      setContractors(c);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchDependencies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createExpense({
        ...formData,
        amount: Number(formData.amount),
        project_id: projectId
      });
      setIsModalOpen(false);
      setFormData({ project_id: projectId, budget_id: '', contractor_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
      await fetchExpenses();
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const availableBudgets = budgets.filter(b => b.project_id.toString() === projectId);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הוצאות וחשבוניות</h1>
          <p className="text-text-secondary text-sm">מעקב אחר כלל ההוצאות בפרויקטים</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוצאה חדשה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">קבלן/ספק</th>
              <th className="px-6 py-4 font-medium">סעיף תקציבי</th>
              <th className="px-6 py-4 font-medium">תאריך</th>
              <th className="px-6 py-4 font-medium">סכום</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{e.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">{e.contractor_name}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  <span className="bg-surface-hover px-2 py-1 rounded text-xs">{e.budget_category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(e.date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-text-primary">{formatCurrency(e.amount)}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">אין הוצאות במערכת.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת הוצאה חדשה">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">סעיף תקציבי</label>
            <select 
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.budget_id} onChange={e => setFormData({...formData, budget_id: e.target.value})}
            >
              <option value="" disabled>בחר סעיף</option>
              {availableBudgets.map(b => <option key={b.id} value={b.id}>{b.category}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">קבלן / ספק</label>
            <select 
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.contractor_id} onChange={e => setFormData({...formData, contractor_id: e.target.value})}
            >
              <option value="" disabled>בחר קבלן מתוך המאגר</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך הוצאה</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור הוצאה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
