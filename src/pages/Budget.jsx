import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, Wallet } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [budgetsData, projectsData] = await Promise.all([
          api.getBudgets(),
          api.getProjects()
        ]);
        
        // Map project names to budgets
        const budgetsWithProjects = budgetsData.map(b => ({
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
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול תקציב</h1>
          <p className="text-text-secondary text-sm">ניהול ומעקב אחר מסגרות התקציב לפרויקטים</p>
        </div>
        <button className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          הוסף סעיף תקציבי
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">פרויקט</th>
              <th className="px-6 py-4 font-medium">סעיף/קטגוריה</th>
              <th className="px-6 py-4 font-medium">תאריך אישור</th>
              <th className="px-6 py-4 font-medium">סכום מאושר</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {budgets.map(b => (
              <tr key={b.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-text-primary">{b.project_name}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
