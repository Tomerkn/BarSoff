import React from 'react';

export function ProgressBar({ label, value, max = 100, formatValue }) {
  const percentage = Math.min((value / max) * 100, 100);
  const overspent = value > max;
  
  let colorClass = 'bg-[#10b981]'; // OK (Green)
  if (overspent) {
    colorClass = 'bg-[#ef4444]'; // Danger (Red)
  } else if (percentage >= 90) {
    colorClass = 'bg-[#f59e0b]'; // Warning (Yellow)
  }

  const displayValue = formatValue ? formatValue(value) : value;
  const displayMax = formatValue ? formatValue(max) : max;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">
          {displayValue} / {displayMax} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-surface-hover rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${colorClass} transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
