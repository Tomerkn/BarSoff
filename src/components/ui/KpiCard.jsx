import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function KpiCard({ title, value, subtext, status = 'default', icon: Icon, className }) {
  const cn = (...inputs) => twMerge(clsx(inputs));
  
  let statusColor = 'text-text-secondary';
  let bgColor = 'bg-surface';
  let borderColor = 'border-border';

  if (status === 'ok') {
    statusColor = 'text-[#10b981]';
    borderColor = 'border-[#10b981]/30';
  } else if (status === 'warning') {
    statusColor = 'text-[#f59e0b]';
    borderColor = 'border-[#f59e0b]/30';
  } else if (status === 'danger') {
    statusColor = 'text-[#ef4444]';
    borderColor = 'border-[#ef4444]/30';
    bgColor = 'bg-[#ef4444]/10'; // slight red tint for danger
  }

  return (
    <div className={cn("p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between", bgColor, borderColor, className)}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-text-muted" />}
      </div>
      <div>
        <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
        {subtext && (
          <div className={cn("text-sm font-medium flex items-center gap-1", statusColor)}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
