import React from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Wallet, 
  ReceiptText, 
  HardHat, 
  ClipboardList, 
  BarChart3,
  Calendar,
  FolderOpen,
  ArrowUpRight,
  Settings,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

const globalNavItems = [
  { name: 'פרויקטים', path: '/', icon: Briefcase },
  { name: 'דאשבורד מנהל', path: '/overview', icon: LayoutDashboard },
];

const getProjectNavItems = (projectId) => [
  { name: 'דאשבורד פרויקט', path: `/projects/${projectId}`, icon: LayoutDashboard },
  { name: 'יומן עבודה יומי', path: `/projects/${projectId}/daily-logs`, icon: ClipboardCheck },
  { name: 'תקציב', path: `/projects/${projectId}/budget`, icon: Wallet },
  { name: 'הכנסות', path: `/projects/${projectId}/incomes`, icon: ReceiptText },
  { name: 'הוצאות', path: `/projects/${projectId}/expenses`, icon: ReceiptText },
  { name: 'קבלנים', path: `/projects/${projectId}/contractors`, icon: HardHat },
  { name: 'הזמנות רכש', path: `/projects/${projectId}/orders`, icon: ClipboardList },
  { name: 'שנת בדק', path: `/projects/${projectId}/warranty`, icon: ShieldCheck },
  { name: 'לוח זמנים (Gantt)', path: `/projects/${projectId}/gantt`, icon: Calendar },
  { name: 'מסמכים וגלריה', path: `/projects/${projectId}/media`, icon: FolderOpen },
  { name: 'דוחות', path: `/projects/${projectId}/reports`, icon: BarChart3 },
];

export function Sidebar({ isOpen, setIsOpen }) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const location = useLocation();
  
  // Extract projectId if we are under /projects/:id
  const match = location.pathname.match(/\/projects\/(\d+)/);
  const currentProjectId = match ? match[1] : null;

  const currentNavItems = currentProjectId ? getProjectNavItems(currentProjectId) : globalNavItems;

  return (
    <>
      {/* רקע שחור חצי שקוף כשפותחים את התפריט בטלפון */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* התפריט עצמו - מוסתר בטלפון אלא אם isOpen הוא true, ומוצג תמיד במסכים גדולים */}
      <aside className={clsx(
        "w-64 bg-surface border-l border-border flex flex-col h-screen fixed right-0 top-0 text-text-primary z-30 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
      <div className="p-6 flex items-center justify-center border-b border-border">
        <img src="https://barsuf.co.il/wp-content/uploads/2019/07/logo-barsuf.png" alt="Barsuf Logo" className="h-10 object-contain" />
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {currentProjectId && (
          <div className="mb-4 pb-4 border-b border-border">
            <NavLink
              to="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              חזרה לפרויקטים
            </NavLink>
          </div>
        )}
        
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/projects/${currentProjectId}` || item.path === '/'}
              onClick={() => setIsOpen(false)} // סוגר את התפריט בטלפון אחרי שלוחצים על קישור
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] font-semibold" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-sm font-medium"
        >
          <Settings className="w-5 h-5" />
          הגדרות
        </button>
      </div>
    </aside>

    {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface-hover">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--color-brand)]" />
                הגדרות מערכת
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-background"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">כללי</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-text-primary font-medium group-hover:text-[var(--color-brand)] transition-colors">התראות דפדפן</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[var(--color-brand)] rounded border-border focus:ring-[var(--color-brand)] bg-background" />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface-hover flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-[var(--color-brand)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm shadow-[var(--color-brand)]/20"
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
