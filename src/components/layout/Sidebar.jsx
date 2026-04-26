import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Wallet, 
  ReceiptText, 
  HardHat, 
  ClipboardList, 
  BarChart3,
  Settings
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { name: 'דאשבורד פרויקט', path: '/', icon: LayoutDashboard },
  { name: 'פרויקטים', path: '/projects', icon: Briefcase },
  { name: 'תקציב', path: '/budget', icon: Wallet },
  { name: 'הוצאות', path: '/expenses', icon: ReceiptText },
  { name: 'קבלנים', path: '/contractors', icon: HardHat },
  { name: 'הזמנות רכש', path: '/orders', icon: ClipboardList },
  { name: 'דוחות', path: '/reports', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface border-l border-border flex flex-col h-screen fixed right-0 top-0 text-text-primary">
      <div className="p-6 flex items-center justify-center border-b border-border">
        <img src="https://barsuf.co.il/wp-content/uploads/2019/07/logo-barsuf.png" alt="Barsuf Logo" className="h-10 object-contain" />
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-sm font-medium">
          <Settings className="w-5 h-5" />
          הגדרות
        </button>
      </div>
    </aside>
  );
}
