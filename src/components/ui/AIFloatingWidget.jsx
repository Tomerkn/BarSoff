import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Bot, X, Sparkles } from 'lucide-react';
import { ProjectChat } from './ProjectChat';

export function AIFloatingWidget({ projectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = React.useRef(null);

  if (!projectId) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
      <div ref={nodeRef} className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
        
        {/* Chat Window */}
        {isOpen && (
          <div className="bg-surface border border-border rounded-2xl shadow-2xl mb-4 w-[400px] overflow-hidden flex flex-col transition-all duration-300">
            <div className="drag-handle bg-[var(--color-brand)] p-3 flex justify-between items-center cursor-move text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold text-sm">התייעץ עם הבינה</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[500px]">
              <ProjectChat projectId={projectId} />
            </div>
          </div>
        )}

        {/* Floating Button */}
        {!isOpen && (
          <div className="drag-handle cursor-move relative group">
            <button 
              onClick={() => setIsOpen(true)}
              className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 relative z-10"
              title="התייעץ עם מנוע הבינה המלאכותית"
            >
              <Bot className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-1 animate-pulse">
                <Sparkles className="w-3 h-3" />
              </div>
            </button>
            
            {/* Tooltip */}
            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-4 bg-surface text-text-primary px-4 py-2 rounded-xl shadow-lg border border-border text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-2">
              התייעץ עם הבינה
              <div className="absolute top-1/2 -translate-y-1/2 right-full border-8 border-transparent border-r-surface" />
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}
