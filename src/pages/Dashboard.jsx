import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת בדפדפן
import { KpiCard } from '../components/ui/KpiCard'; // כרטיסי מידע עם מספרים גדולים
import { ProgressBar } from '../components/ui/ProgressBar'; // פסי התקדמות
import { Wallet, TrendingUp, AlertTriangle, Percent, Loader2 } from 'lucide-react'; // אייקונים
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'; // כלים לציור גרפים
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { AIFloatingWidget } from '../components/ui/AIFloatingWidget'; // הבוט הצף (ברבור)

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Dashboard() { // דף הלוח בקרה (דשבורד) של הפרויקט
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [data, setData] = useState(null); // כאן נשמור את כל הנתונים שנביא מהשרת
  const [loading, setLoading] = useState(true); // האם אנחנו עדיין מחכים לנתונים

  useEffect(() => { // ברגע שהדף עולה או שמספר הפרויקט משתנה - מביאים נתונים
    if (!projectId) return;
    
    const fetchAnalytics = async () => { // פונקציה שמביאה את הניתוח הכספי
      setLoading(true);
      try {
        const analytics = await api.getProjectAnalytics(projectId); // מבקשים מהשרת את הנתונים
        setData(analytics); // שומרים אותם במערכת
      } catch (error) {
        console.error('Error fetching dashboard data:', error); // אם הייתה תקלה
      } finally {
        setLoading(false); // מפסיקים להראות טעינה
      }
    };
    fetchAnalytics();
  }, [projectId]);

  if (loading) { // אם אנחנו בטעינה, מראים סמל מסתובב
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-500 font-bold">שגיאה בטעינת נתונים או פרויקט לא נמצא.</div>;

  const { project, totalBudget, actualExecution, totalIncomes, profitLoss, variance, utilization, breakdown } = data; // מפרקים את המידע שקיבלנו מהשרת

  const isOverspent = variance > 0; // בודקים אם חרגנו מהתקציב
  const statusColor = isOverspent ? 'bg-red-500' : 'bg-[#10b981]'; // צבע הסטטוס (אדום לחריגה, ירוק לתקין)
  const statusText = isOverspent ? 'חריגה תקציבית' : 'תקין';

  const chartData = breakdown.map(item => ({ // מכינים את הנתונים לגרף העמודות
    name: item.category, // שם הסעיף (למשל: חשמל)
    תקציב: item.budget, // הסכום המתוכנן
    ביצוע: item.actual || 0 // הסכום ששולם בפועל
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* כותרת הדף עם שם הפרויקט והסטטוס שלו */}
      <div className="mb-8 flex justify-between items-end bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
            {project.name}
          </h1>
          <p className="text-text-secondary text-sm">{project.location} • צפי סיום: {new Date(project.end_date).toLocaleDateString('he-IL')}</p>
        </div>
        <div className="bg-surface-hover border border-border px-4 py-2 rounded-lg text-sm font-medium text-text-primary flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
          סטטוס נוכחי: {statusText}
        </div>
      </div>

      {/* כרטיסי מידע עליונים עם מספרים מרכזיים */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="תקציב כולל" 
          value={formatCurrency(totalBudget)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="סה״כ הוצאות (ביצוע)" 
          value={formatCurrency(actualExecution)} 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="סה״כ הכנסות" 
          value={formatCurrency(totalIncomes)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="רווח והפסד (P&L)" 
          value={formatCurrency(Math.abs(profitLoss))} 
          subtext={profitLoss >= 0 ? 'רווח' : 'הפסד'}
          status={profitLoss >= 0 ? 'ok' : 'danger'}
          icon={AlertTriangle} 
        />
      </div>
      
      {/* כרטיס אחוז ניצול התקציב */}
      <div className="mb-8">
        <KpiCard 
            title="אחוז ניצול תקציב" 
            value={`${utilization.toFixed(1)}%`} 
            status={utilization > 100 ? 'danger' : utilization > 90 ? 'warning' : 'ok'}
            icon={Percent} 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* רשימת פסי התקדמות לפי סעיפי תקציב */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4 overflow-y-auto max-h-[400px]">
          <h3 className="text-lg font-bold text-text-primary sticky top-0 bg-surface pb-2 z-10">התקדמות לפי סעיפים</h3>
          {breakdown.map(item => (
            <ProgressBar 
              key={item.id} 
              label={item.category} 
              value={item.actual || 0} 
              max={item.budget} 
              formatValue={(val) => `₪${(val/1000).toFixed(0)}k`}
            />
          ))}
        </div>

        {/* גרף השוואה בין תקציב לביצוע */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text-primary mb-6">תקציב מול ביצוע לפי סעיף</h3>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', textAlign: 'right', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#475569' }}
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#64748b', marginBottom: '0.5rem', display: 'block' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="תקציב" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="ביצוע" fill="#57B9C1" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* הבוט הצף של ברבור להתייעצות */}
      <AIFloatingWidget projectId={projectId} />
    </div>
  );
}
