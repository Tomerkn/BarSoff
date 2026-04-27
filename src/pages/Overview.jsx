import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { Link } from 'react-router-dom'; // כלי למעבר בין דפים
import { KpiCard } from '../components/ui/KpiCard'; // כרטיסי מידע עם מספרים גדולים
import { Briefcase, Wallet, AlertTriangle, CheckCircle, Loader2, TrendingDown, ArrowUpRight, ShieldCheck } from 'lucide-react'; // אייקונים יפים
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // כלים לציור גרפים

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Overview() { // דף מבט-על ארגוני של כל החברה
  const [analytics, setAnalytics] = useState(null); // כאן נשמור את הנתונים הכלליים של החברה
  const [projectsData, setProjectsData] = useState([]); // כאן נשמור נתונים להשוואה בין פרויקטים
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת

  useEffect(() => { // מביאים את כל הנתונים ברגע שהדף עולה
    const fetchOverview = async () => {
      try {
        const [globalRes, projectsRes] = await Promise.all([ // מבקשים מהשרת נתונים כלליים ורשימת פרויקטים
          fetch('/api/analytics/global'),
          fetch('/api/projects')
        ]);
        
        const globalData = await globalRes.json();
        setAnalytics(globalData);
        
        const pList = await projectsRes.json();
        
        // מביאים נתונים כספיים עבור 5 פרויקטים פעילים כדי להציג בגרף
        const activeProjects = pList.filter(p => p.status === 'תקין');
        const projectStats = await Promise.all(
          activeProjects.slice(0, 5).map(async (p) => {
            const res = await fetch(`/api/projects/${p.id}/analytics`);
            const data = await res.json();
            return {
              name: p.name,
              budget: data.totalBudget,
              expenses: data.actualExecution,
              id: p.id
            };
          })
        );
        
        setProjectsData(projectStats);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false); // הפסקת מצב טעינה
      }
    };
    fetchOverview();
  }, []);

  if (loading) { // אם אנחנו בטעינה, מראים סמל מסתובב
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* כותרת הדף */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">דאשבורד מנהל ארגוני</h1>
        <p className="text-text-secondary text-sm">מבט-על ושליטה מלאה על כלל הפעילות של ברסוף</p>
      </div>

      {/* כרטיסי מידע כלליים על כל החברה */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="סה״כ פרויקטים (כללי)" 
          value={analytics.totalProjects.toString()} 
          icon={Briefcase} 
        />
        <KpiCard 
          title="פרויקטים פעילים" 
          value={analytics.activeProjects.toString()} 
          icon={CheckCircle} 
          trend="+2 החודש"
        />
        <KpiCard 
          title="תקציב מנוהל כולל" 
          value={formatCurrency(analytics.totalBudget)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="קריאות שנת בדק (פתוחות)" 
          value={analytics.openWarrantyTickets.toString()} 
          icon={ShieldCheck} 
          subtext={analytics.openWarrantyTickets > 0 ? "דורש התייחסות" : "הכל מטופל"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* גרף השוואה בין תקציב להוצאות בפועל לכלל הפרויקטים */}
        <div className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-bold text-text-primary mb-6">תקציב מול ביצוע (5 הפרויקטים הפעילים הגדולים)</h2>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)' }} />
                <YAxis tickFormatter={(val) => `₪${(val/1000).toFixed(0)}k`} tick={{ fill: 'var(--color-text-secondary)' }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                />
                <Legend />
                <Bar dataKey="budget" name="תקציב מתוכנן" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="הוצאות בפועל" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* פאנל התראות ופעולות דחופות */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            פעולות לטיפול
          </h2>
          
          <div className="flex-1 flex flex-col gap-3">
            {analytics.openWarrantyTickets > 0 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-orange-700 dark:text-orange-400 font-medium text-sm">
                  יש לך {analytics.openWarrantyTickets} קריאות "שנת בדק" פתוחות שממתינות לטיפול וליווי.
                </p>
              </div>
            )}
            
            {(analytics.totalProjects - analytics.activeProjects) > 0 && (
              <div className="p-4 bg-surface-hover border border-border rounded-lg">
                <p className="text-text-primary font-medium text-sm">
                  {analytics.totalProjects - analytics.activeProjects} פרויקטים ממתינים לאישור או שהושהה הסטטוס שלהם.
                </p>
              </div>
            )}
          </div>
          
          {/* כפתור מעבר מהיר לרשימת הפרויקטים */}
          <div className="mt-auto pt-4 border-t border-border">
            <Link to="/" className="w-full py-2.5 bg-surface-hover hover:bg-border text-text-primary rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
              מעבר לרשימת הפרויקטים
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
