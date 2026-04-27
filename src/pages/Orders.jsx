import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Plus, ClipboardList } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Orders() {
  const { projectId } = useParams();
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ project_id: projectId, supplier_name: '', item_description: '', amount: '', order_date: new Date().toISOString().split('T')[0], status: 'פתוח' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [ordersData, projectsData] = await Promise.all([
        api.getOrders(),
        api.getProjects()
      ]);
      const projectOrders = ordersData.filter(o => o.project_id === Number(projectId));
      setOrders(projectOrders);
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
      await api.createOrder({
        ...formData,
        project_id: projectId,
        amount: Number(formData.amount)
      });
      setIsModalOpen(false);
      setFormData({ project_id: projectId, supplier_name: '', item_description: '', amount: '', order_date: new Date().toISOString().split('T')[0], status: 'פתוח' });
      await fetchData();
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הזמנות רכש (POs)</h1>
          <p className="text-text-secondary text-sm">מעקב ובקרת הזמנות רכש מול ספקים וקבלנים</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הזמנה חדשה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">מס' הזמנה</th>
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
                <td className="px-6 py-4 text-sm text-text-primary">{o.supplier_name}</td>
                <td className="px-6 py-4 text-sm text-text-primary">{o.item_description}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(o.order_date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-text-primary">{formatCurrency(o.amount)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-text-muted flex flex-col items-center gap-2">
                  <ClipboardList className="w-8 h-8 opacity-50" />
                  <span>אין הזמנות רכש פתוחות במערכת.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת הזמנת רכש (PO) חדשה">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הספק / קבלן</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור העבודה או הפריט</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.item_description} onChange={e => setFormData({...formData, item_description: e.target.value})}
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
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך הוצאת הזמנה</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.order_date} onChange={e => setFormData({...formData, order_date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'צור הזמנה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
