import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, HardHat, Phone, Mail } from 'lucide-react';

export function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const data = await api.getContractors();
        setContractors(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchContractors();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">קבלנים</h1>
          <p className="text-text-secondary text-sm">מאגר קבלני ביצוע ויעוץ</p>
        </div>
        <button className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          הוסף קבלן
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">שם קבלן</th>
              <th className="px-6 py-4 font-medium">התמחות</th>
              <th className="px-6 py-4 font-medium">טלפון</th>
              <th className="px-6 py-4 font-medium">דוא"ל</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contractors.map(c => (
              <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{c.specialization}</td>
                <td className="px-6 py-4 text-sm text-text-primary flex items-center gap-2 mt-1"><Phone className="w-3.5 h-3.5 text-text-muted" dir="ltr" /> <span dir="ltr">{c.phone}</span></td>
                <td className="px-6 py-4 text-sm text-text-primary"><div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-text-muted" /> {c.email}</div></td>
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-text-muted">לא נמצאו קבלנים במאגר.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
