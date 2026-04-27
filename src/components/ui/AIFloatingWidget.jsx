import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Bot, X, Sparkles } from 'lucide-react';
import { ProjectChat } from './ProjectChat';

export function AIFloatingWidget({ projectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const nodeRef = React.useRef(null);

  if (!projectId || !isVisible) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="body">
      <div ref={nodeRef} className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
        
        {/* Chat Window */}
        {isOpen && (
          <div 
            className="bg-surface border border-border rounded-2xl shadow-2xl mb-4 overflow-hidden flex flex-col transition-all duration-300"
            style={{ width: '400px', maxWidth: '90vw', height: '550px', maxHeight: '85vh' }}
          >
            <div className="drag-handle bg-[var(--color-brand)] p-3 flex justify-between items-center cursor-move text-white rounded-t-2xl shrink-0">
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
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <ProjectChat projectId={projectId} />
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        {!isOpen && (
          <div className="relative group flex items-start gap-1">
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

            {/* Dismiss completely button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="bg-surface border border-border text-text-secondary hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100 absolute -top-2 -left-2 z-20"
              title="סגור חלונית AI"
            >
              <X className="w-3 h-3" />
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
