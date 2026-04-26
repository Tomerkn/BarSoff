import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="חיפוש פרויקט, קבלן, הוצאה..." 
            className="w-full bg-surface border border-border rounded-lg py-2 pr-10 pl-4 text-sm text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-surface-hover">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-surface-hover pr-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] font-bold">
            ת
          </div>
          <span className="text-sm font-medium hidden sm:block mr-2 text-text-primary">תומר ק.</span>
        </div>
      </div>
    </header>
  );
}
