import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Plus, ShieldCheck, AlertCircle, Wrench } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

export function Warranty() {
  const { projectId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    customer_name: '', 
    issue_description: '', 
    contractor_id: '', 
    status: 'פתוח',
    open_date: new Date().toISOString().split('T')[0],
    close_date: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [ticketsRes, contractorsRes] = await Promise.all([
        fetch(`/api/warranty-tickets?projectId=${projectId}`),
        fetch(`/api/contractors`)
      ]);
      const ticketsData = await ticketsRes.json();
      const contractorsData = await contractorsRes.json();
      
      setTickets(ticketsData);
      setContractors(contractorsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        project_id: projectId,
        contractor_id: formData.contractor_id ? parseInt(formData.contractor_id) : null
      };
      
      await fetch('/api/warranty-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setIsModalOpen(false);
      setFormData({ 
        customer_name: '', 
        issue_description: '', 
        contractor_id: '', 
        status: 'פתוח',
        open_date: new Date().toISOString().split('T')[0],
        close_date: '',
        notes: ''
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('שגיאה בפתיחת קריאת שירות');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const ticket = tickets.find(t => t.id === id);
      const closeDate = newStatus === 'סגור' ? new Date().toISOString().split('T')[0] : ticket.close_date;
      
      await fetch(`/api/warranty-tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticket, status: newStatus, close_date: closeDate })
      });
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--color-brand)]" />
            חוק מכר (שנת בדק)
          </h1>
          <p className="text-text-secondary text-sm mt-1">ניהול קריאות שירות, תקלות ואחריות לאחר מסירה</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          קריאה חדשה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">מס' קריאה</th>
              <th className="px-6 py-4 font-medium">שם הדייר / אזור</th>
              <th className="px-6 py-4 font-medium">תיאור התקלה</th>
              <th className="px-6 py-4 font-medium">קבלן אחראי</th>
              <th className="px-6 py-4 font-medium">תאריך פתיחה</th>
              <th className="px-6 py-4 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-text-primary">
                  SR-{t.id.toString().padStart(4, '0')}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary">{t.customer_name}</td>
                <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={t.issue_description}>
                  {t.issue_description}
                </td>
                <td className="px-6 py-4 text-sm text-text-primary flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-text-muted" /> 
                  {t.contractor_name || 'טרם שויך'}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(t.open_date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4">
                  <select 
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-0
                      ${t.status === 'פתוח' ? 'bg-red-500/10 text-red-600' : 
                        t.status === 'בטיפול' ? 'bg-orange-500/10 text-orange-600' : 
                        'bg-[#10b981]/10 text-[#10b981]'}`}
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                  >
                    <option value="פתוח" className="text-black bg-white">🔴 פתוח</option>
                    <option value="בטיפול" className="text-black bg-white">🟠 בטיפול קבלן</option>
                    <option value="סגור" className="text-black bg-white">🟢 סגור / טופל</option>
                  </select>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-text-muted flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 opacity-50 mb-2" />
                  <p>אין קריאות שירות פתוחות.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="פתיחת קריאת שירות (בדק)">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">שם דייר / מיקום התקלה</label>
              <input 
                type="text" required placeholder="למשל: דירה 12, משפחת כהן"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך פתיחה</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
                value={formData.open_date} onChange={e => setFormData({...formData, open_date: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור התקלה</label>
            <textarea 
              required rows={3} placeholder="פרט מה התקלה (למשל: נזילה מתחת לכיור בחדר הרחצה של ההורים)"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] resize-none"
              value={formData.issue_description} onChange={e => setFormData({...formData, issue_description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שיוך לקבלן אחראי</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.contractor_id} onChange={e => setFormData({...formData, contractor_id: e.target.value})}
            >
              <option value="">בחר קבלן ממאגר הקבלנים שלנו...</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.specialization})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">הערות לטיפול</label>
            <input 
              type="text" placeholder="למשל: לתאם הגעה מול הדייר לפני השעה 14:00"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'פתיחת קריאה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
