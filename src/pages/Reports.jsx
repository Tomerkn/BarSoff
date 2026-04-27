import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, BarChart3, Download, FileText } from 'lucide-react'; // אייקונים יפים
import { KpiCard } from '../components/ui/KpiCard'; // כרטיסי מידע עם מספרים גדולים

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Reports() { // דף דוחות וסיכומי נתונים כלליים
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת
  const [stats, setStats] = useState({ totalBudget: 0, totalExpenses: 0, projectsCount: 0 }); // כאן נשמור את הסיכומים הכלליים

  useEffect(() => { // מביאים את כל הנתונים ברגע שהדף עולה כדי לחשב סיכומים
    const fetchGlobalStats = async () => {
      try {
        const [projects, budgets, expenses] = await Promise.all([ // מבקשים מהשרת את כל המידע הקיים במערכת
          api.getProjects(),
          api.getBudgets(),
          api.getExpenses()
        ]);
        
        const totalBudget = budgets.reduce((acc, b) => acc + b.total_amount, 0); // מחשבים את סך כל התקציבים
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0); // מחשבים את סך כל ההוצאות

        setStats({
          totalBudget,
          totalExpenses,
          projectsCount: projects.length
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false); // הפסקת מצב טעינה
      }
    };
    
    fetchGlobalStats();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* כותרת הדף וכפתור ייצוא */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">דוחות וסטטיסטיקות</h1>
          <p className="text-text-secondary text-sm">מרכז מידע ניהולי חוצה פרויקטים</p>
        </div>
        <button className="bg-surface border border-border hover:bg-surface-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          ייצוא לאקסל
        </button>
      </div>

      {/* כרטיסי סיכום כלליים */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard 
          title="סה״כ פרויקטים פעילים" 
          value={stats.projectsCount} 
          icon={BarChart3} 
        />
        <KpiCard 
          title="סה״כ מסגרות תקציב" 
          value={formatCurrency(stats.totalBudget)} 
          icon={BarChart3} 
        />
        <KpiCard 
          title="סה״כ הוצאות בפועל" 
          value={formatCurrency(stats.totalExpenses)} 
          icon={BarChart3} 
          status={stats.totalExpenses > stats.totalBudget ? 'danger' : 'default'}
        />
      </div>

      {/* הודעה על שדרוג עתידי של הדף */}
      <div className="bg-surface border border-border rounded-xl shadow-sm p-8 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">מחולל הדוחות בבנייה</h2>
        <p className="text-text-secondary max-w-md">
          בקרוב תוכל להפיק דוחות חתך מורכבים לפי קבלן, לפי סעיף ולפי תקופות זמן (חודשי/רבעוני).
        </p>
      </div>
    </div>
  );
}
