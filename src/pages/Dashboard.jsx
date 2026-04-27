import React, { useEffect, useState } from 'react';
import { KpiCard } from '../components/ui/KpiCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Wallet, TrendingUp, AlertTriangle, Percent, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '../services/api';
import { AIFloatingWidget } from '../components/ui/AIFloatingWidget';
import { ProjectMedia } from '../components/ui/ProjectMedia';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function Dashboard() {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const pList = await api.getProjects();
        setProjects(pList);
        if (pList.length > 0) {
          setSelectedProjectId(pList[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch analytics when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const analytics = await api.getProjectAnalytics(selectedProjectId);
        setData(analytics);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedProjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full text-text-muted">
        <h2 className="text-xl font-bold mb-2 text-text-primary">אין פרויקטים להצגה</h2>
        <p>נא להוסיף פרויקט חדש דרך תפריט הפרויקטים כדי לראות נתונים בדאשבורד.</p>
      </div>
    );
  }

  if (!data) return <div className="p-8">שגיאה בטעינת נתונים.</div>;

  const { project, totalBudget, actualExecution, variance, utilization, breakdown } = data;

  const isOverspent = variance > 0;
  const statusColor = isOverspent ? 'bg-red-500' : 'bg-[#10b981]';
  const statusText = isOverspent ? 'חריגה תקציבית' : 'תקין';

  // Format data for Recharts BarChart (Budget vs Actual per Category)
  const chartData = breakdown.map(item => ({
    name: item.category,
    תקציב: item.budget,
    ביצוע: item.actual || 0
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
            דאשבורד פרויקט:
            <select 
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="bg-transparent border-b-2 border-[var(--color-brand)] focus:outline-none text-text-primary pb-1"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </h1>
          <p className="text-text-secondary text-sm">{project.location} • צפי סיום: {new Date(project.end_date).toLocaleDateString('he-IL')}</p>
        </div>
        <div className="bg-surface-hover border border-border px-4 py-2 rounded-lg text-sm font-medium text-text-primary flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
          סטטוס נוכחי: {statusText}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="תקציב כולל" 
          value={formatCurrency(totalBudget)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="ביצוע בפועל" 
          value={formatCurrency(actualExecution)} 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="סטייה (Variance)" 
          value={formatCurrency(Math.abs(variance))} 
          subtext={isOverspent ? 'חריגה מהתקציב' : 'יתרה בתקציב'}
          status={isOverspent ? 'danger' : 'ok'}
          icon={AlertTriangle} 
        />
        <KpiCard 
          title="אחוז ניצול" 
          value={`${utilization.toFixed(1)}%`} 
          status={utilization > 100 ? 'danger' : utilization > 90 ? 'warning' : 'ok'}
          icon={Percent} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {/* Project Media & Gallery */}
      <ProjectMedia projectId={selectedProjectId} />

      {/* Floating AI Widget */}
      <AIFloatingWidget projectId={selectedProjectId} />
    </div>
  );
}
