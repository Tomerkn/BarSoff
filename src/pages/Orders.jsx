import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, ClipboardList } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming api.getOrders exists. We will add it to api.js.
    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הזמנות רכש (POs)</h1>
          <p className="text-text-secondary text-sm">מעקב ובקרת הזמנות רכש מול ספקים וקבלנים</p>
        </div>
        <button className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          הזמנה חדשה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">מס' הזמנה</th>
              <th className="px-6 py-4 font-medium">פרויקט</th>
              <th className="px-6 py-4 font-medium">ספק/קבלן</th>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">תאריך</th>
              <th className="px-6 py-4 font-medium">סכום</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-text-primary">
                  PO-{o.id.toString().padStart(4, '0')}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{o.project_name}</td>
                <td className="px-6 py-4 text-sm text-text-primary">{o.supplier_name}</td>
                <td className="px-6 py-4 text-sm text-text-primary">{o.item_description}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(o.order_date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-text-primary">{formatCurrency(o.amount)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-text-muted flex flex-col items-center gap-2">
                  <ClipboardList className="w-8 h-8 opacity-50" />
                  <span>אין הזמנות רכש פתוחות במערכת.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
