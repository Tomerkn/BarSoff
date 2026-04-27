import React, { useState, useEffect } from 'react'; // מביאים את ריאקט לניהול המצב של החלונית
import Draggable from 'react-draggable'; // כלי שמאפשר לגרור את הבוט על המסך
import { Bot, X, Sparkles } from 'lucide-react'; // מביאים אייקונים יפים
import { ProjectChat } from './ProjectChat'; // מביאים את רכיב הצ'אט עצמו

export function AIFloatingWidget({ projectId }) { // הפונקציה של הבוט הצף
  const [isOpen, setIsOpen] = useState(false); // האם הצ'אט פתוח עכשיו
  const [isVisible, setIsVisible] = useState(true); // האם בכלל רואים את הבוט על המסך
  const [isMobile, setIsMobile] = useState(false); // האם המשתמש גולש מהטלפון
  const nodeRef = React.useRef(null); // התייחסות לאלמנט בשביל הגרירה

  useEffect(() => { // בודקים אם אנחנו בטלפון כדי להתאים את התצוגה
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!projectId || !isVisible) return null; // אם אין פרויקט או שסגרנו את הבוט, לא מראים כלום

  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="body" disabled={isMobile}> {/* מאפשר לגרור את הבוט (לא בטלפון) */}
      <div 
        ref={nodeRef} 
        className={`fixed z-50 flex flex-col items-start ${isMobile && isOpen ? 'inset-0 p-4' : 'bottom-6 left-6'}`} // מיקום על המסך
      >
        
        {/* חלון הצ'אט שנפתח */}
        {isOpen && (
          <div 
            className={`bg-surface border border-border overflow-hidden flex flex-col transition-all duration-300 shadow-2xl ${
              isMobile 
                ? 'w-full h-full rounded-2xl' 
                : 'w-[400px] h-[550px] max-w-[90vw] max-h-[85vh] rounded-2xl mb-4'
            }`}
          >
            <div className="drag-handle bg-[var(--color-brand)] p-3 flex justify-between items-center cursor-move text-white rounded-t-2xl shrink-0"> {/* הפס העליון שאפשר לגרור */}
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold text-sm">התייעץ עם ברבור</span> {/* כותרת החלון ללא אימוג'ים */}
              </div>
              <button 
                onClick={() => setIsOpen(false)} // כפתור סגירת החלון
                className="hover:bg-white/20 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative"> {/* תוכן הצ'אט */}
              <div className="absolute inset-0">
                <ProjectChat projectId={projectId} />
              </div>
            </div>
          </div>
        )}

        {/* הכפתור הצף שרואים כשהצ'אט סגור */}
        {!isOpen && (
          <div className="relative group flex items-start gap-1">
            <button 
              onClick={() => setIsOpen(true)} // לחיצה פותחת את הצ'אט
              className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 relative z-10"
              title="התייעץ עם ברבור"
            >
              <Bot className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-1 animate-pulse"> {/* כוכבים נוצצים עדינים */}
                <Sparkles className="w-3 h-3" />
              </div>
            </button>

            {/* כפתור להעלמת הבוט לגמרי מהמסך */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="bg-surface border border-border text-text-secondary hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100 absolute -top-2 -left-2 z-20"
              title="סגור חלונית ברבור"
            >
              <X className="w-3 h-3" />
            </button>
            
            {/* בועית עזרה כשעומדים על הכפתור */}
            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-4 bg-surface text-text-primary px-4 py-2 rounded-xl shadow-lg border border-border text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-2">
              התייעץ עם ברבור
              <div className="absolute top-1/2 -translate-y-1/2 right-full border-8 border-transparent border-r-surface" />
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}
