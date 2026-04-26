import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, ReceiptText } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await api.getExpenses();
        setExpenses(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הוצאות וחשבוניות</h1>
          <p className="text-text-secondary text-sm">מעקב אחר כלל ההוצאות בפרויקטים</p>
        </div>
        <button className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
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
    </div>
  );
}
