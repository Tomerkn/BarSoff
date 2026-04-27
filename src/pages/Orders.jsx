import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, ClipboardList, Pencil, Trash2 } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Orders() { // דף ניהול הזמנות רכש (POs)
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [orders, setOrders] = useState([]); // רשימת ההזמנות שנשמרת כאן
  const [projects, setProjects] = useState([]); // רשימת הפרויקטים
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת

  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת הזמנה פתוחה
  const [formData, setFormData] = useState({ project_id: projectId, supplier_name: '', item_description: '', amount: '', order_date: new Date().toISOString().split('T')[0], status: 'פתוח' }); // הנתונים שהמשתמש ממלא בטופס
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים הזמנה קיימת

  const fetchData = async () => { // פונקציה שמביאה את כל ההזמנות והפרויקטים מהשרת
    try {
      const [ordersData, projectsData] = await Promise.all([
        api.getOrders(),
        api.getProjects()
      ]);
      const projectOrders = ordersData.filter(o => o.project_id === Number(projectId)); // מסננים רק את ההזמנות של הפרויקט הנוכחי
      setOrders(projectOrders);
      setProjects(projectsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false); // סיום מצב טעינה
    }
  };

  useEffect(() => { // הבאת הנתונים ברגע שהדף עולה
    fetchData();
  }, []);

  const handleSubmit = async (e) => { // שמירת הזמנה חדשה או עריכת קיימת
    e.preventDefault(); // מניעת רענון הדף
    setSubmitting(true); // מצב שמירה
    try {
      if (editingId) { // עריכת הזמנה
        await api.updateResource('orders', editingId, {
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      } else { // יצירת הזמנה חדשה
        await api.createOrder({
          ...formData,
          project_id: projectId,
          amount: Number(formData.amount)
        });
      }
      setIsModalOpen(false); // סגירת החלונית
      setEditingId(null); // איפוס עריכה
      setFormData({ project_id: projectId, supplier_name: '', item_description: '', amount: '', order_date: new Date().toISOString().split('T')[0], status: 'פתוח' }); // ניקוי טופס
      await fetchData(); // רענון הרשימה
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setSubmitting(false); // סיום מצב שמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת הזמנה מהמערכת
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) return;
    try {
      await api.deleteResource('orders', id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEdit = (order) => { // הכנת הטופס לעריכה
    setEditingId(order.id);
    setFormData({
      project_id: order.project_id,
      supplier_name: order.supplier_name || '',
      item_description: order.item_description || '',
      amount: order.amount,
      order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: order.status || 'פתוח'
    });
    setIsModalOpen(true);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הזמנות רכש (POs)</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">מעקב ובקרת הזמנות רכש מול ספקים וקבלנים</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ project_id: projectId, supplier_name: '', item_description: '', amount: '', order_date: new Date().toISOString().split('T')[0], status: 'פתוח' });
            setIsModalOpen(true);
          }}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הזמנה חדשה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת ההזמנות */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">מס' הזמנה</th>
              <th className="px-6 py-4 font-medium">ספק/קבלן</th>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">תאריך</th>
              <th className="px-6 py-4 font-medium">סכום</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
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
                <td className="px-6 py-4 text-xs">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(o)} className="p-1 text-text-muted hover:text-[var(--color-brand)] transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(o.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* הודעה אם אין הזמנות */}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="w-8 h-8 opacity-50" />
                    <span>אין הזמנות רכש פתוחות במערכת.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספה או עריכה של הזמנת רכש */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת הזמנה" : "הוספת הזמנת רכש (PO) חדשה"}>
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
