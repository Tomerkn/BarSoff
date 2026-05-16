import React, { useState, useEffect } from 'react';
import { Calculator, Save, TrendingUp, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { api } from '../../services/api';

export function TargetPriceCalculator({ tenderId, initialBoqJson }) {
  const [boq, setBoq] = useState([]);
  const [globalFactor, setGlobalFactor] = useState(0); // -50% to +50%
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (initialBoqJson) {
        setBoq(JSON.parse(initialBoqJson));
      }
    } catch (e) {
      console.error("Failed to parse BoQ JSON", e);
    }
  }, [initialBoqJson]);

  const handlePriceChange = (index, newPrice) => {
    const updated = [...boq];
    updated[index].unitPrice = Number(newPrice);
    setBoq(updated);
  };

  const calculateRowTotal = (item) => {
    const baseTotal = item.quantity * item.unitPrice;
    return baseTotal * (1 + globalFactor / 100);
  };

  const totalTargetPrice = boq.reduce((sum, item) => sum + calculateRowTotal(item), 0);

  const saveBoq = async () => {
    setSaving(true);
    try {
      // In a real app we'd have a dedicated API route to save the updated BOQ
      // Here we just mock the save delay
      await new Promise(resolve => setTimeout(resolve, 800));
      alert('מחיר המטרה עודכן בהצלחה!');
    } catch (error) {
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  if (!boq || boq.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-slate-800">
          <Calculator className="w-5 h-5 text-indigo-600" />
          מחשבון מחיר מטרה (כתב כמויות דינמי)
        </h3>
        <button 
          onClick={saveBoq}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור עדכונים
        </button>
      </div>

      <div className="p-4 bg-indigo-50/30 border-b border-border flex items-center gap-4">
        <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
        <div className="flex-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            פקטור כללי להצעה (בצ"מ / סיכון): {globalFactor > 0 ? '+' : ''}{globalFactor}%
          </label>
          <input 
            type="range" 
            min="-30" 
            max="50" 
            value={globalFactor} 
            onChange={(e) => setGlobalFactor(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
            <span>-30%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-border">
            <tr>
              <th className="p-3">סעיף</th>
              <th className="p-3">תיאור העבודה</th>
              <th className="p-3">כמות</th>
              <th className="p-3">יחידה</th>
              <th className="p-3 w-32">מחיר יחידה (₪)</th>
              <th className="p-3 text-left">סה"כ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {boq.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 text-slate-500">{item.section}</td>
                <td className="p-3 font-medium text-slate-800">{item.item}</td>
                <td className="p-3">{item.quantity}</td>
                <td className="p-3">{item.unit}</td>
                <td className="p-3">
                  <input 
                    type="number" 
                    value={item.unitPrice} 
                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded-md focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </td>
                <td className="p-3 font-bold text-left text-slate-700">
                  ₪{calculateRowTotal(item).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <TrendingUp className="w-4 h-4" />
          <span>מתעדכן בזמן אמת עפ"י הפקטור ({globalFactor}%)</span>
        </div>
        <div className="text-xl font-black text-indigo-700">
          סה"כ מחיר מטרה: ₪{totalTargetPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
}
