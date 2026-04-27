import React, { useState, useEffect } from 'react'; // מביאים את ריאקט כדי שנוכל לבנות את המסכים
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'; // כלים לניווט בין דפים באתר
import { Sidebar } from './components/layout/Sidebar'; // מביאים את התפריט שבצד
import { Header } from './components/layout/Header'; // מביאים את הפס העליון של האתר
import { Dashboard } from './pages/Dashboard'; // מביאים את מסך הגרפים והנתונים
import { Projects } from './pages/Projects'; // מביאים את מסך רשימת הפרויקטים
import { Contractors } from './pages/Contractors'; // מביאים את מסך ניהול הקבלנים
import { Expenses } from './pages/Expenses'; // מביאים את מסך ניהול ההוצאות
import { Budget } from './pages/Budget'; // מביאים את מסך התקציב
import { Orders } from './pages/Orders'; // מביאים את מסך ההזמנות
import { Reports } from './pages/Reports'; // מביאים את מסך הדוחות
import { Overview } from './pages/Overview'; // מביאים את מסך הניהול הכללי
import { ProjectGanttPage } from './pages/ProjectGanttPage'; // מביאים את מסך לוחות הזמנים (גאנט)
import { ProjectMediaPage } from './pages/ProjectMediaPage'; // מביאים את מסך התמונות והמסמכים
import { ProjectIncomes } from './pages/ProjectIncomes'; // מביאים את מסך ההכנסות
import { DailyLogs } from './pages/DailyLogs'; // מביאים את מסך יומן העבודה
import { Warranty } from './pages/Warranty'; // מביאים את מסך שנת הבדק
import { AIFloatingWidget } from './components/ui/AIFloatingWidget'; // מביאים את הבוט החכם שצף על המסך
import { ProfileSelection } from './pages/ProfileSelection'; // מביאים את מסך בחירת המשתמש

function AppContent() { // הפונקציה הראשית שמחליטה מה להראות באתר
  const [selectedProfile, setSelectedProfile] = useState(() => { // בודקים אם יש משתמש שכבר נבחר קודם
    const saved = localStorage.getItem('barsuf_profile'); // מנסים למשוך את המידע מהזיכרון של הדפדפן
    return saved ? JSON.parse(saved) : null; // אם מצאנו - משתמשים בו, אם לא - מתחילים ריק
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // משתנה שבודק אם התפריט של הטלפון פתוח
  const location = useLocation(); // בודקים באיזה דף אנחנו נמצאים עכשיו
  const match = location.pathname.match(/\/projects\/(\d+)/); // מנסים להבין אם אנחנו בתוך פרויקט ספציפי
  const currentProjectId = match ? match[1] : null; // שומרים את המספר של הפרויקט הנוכחי

  const handleProfileSelect = (profile) => { // פונקציה שפועלת כשבוחרים משתמש
    setSelectedProfile(profile); // מעדכנים את המשתמש הנוכחי
    localStorage.setItem('barsuf_profile', JSON.stringify(profile)); // שומרים אותו בזיכרון של המחשב
    window.location.href = '/'; // חוזרים לדף הראשי אחרי הבחירה
  };

  const handleLogout = () => { // פונקציה שפועלת כשרוצים להתנתק או להחליף משתמש
    console.log("Logging out..."); // רושמים ביומן של המערכת שהתנתקנו
    localStorage.removeItem('barsuf_profile'); // מוחקים את המשתמש מהזיכרון
    setSelectedProfile(null); // מאפסים את המשתמש הנוכחי
    window.location.href = '/'; // חוזרים למסך הבחירה
  };

  if (!selectedProfile) { // אם עדיין לא נבחר משתמש
    return <ProfileSelection onSelect={handleProfileSelect} />; // מראים את מסך בחירת המשתמשים
  }

  return ( // אם יש משתמש - מראים את כל האתר
    <div className="flex h-screen bg-background overflow-hidden text-text-primary" dir="rtl"> {/* המבנה הראשי של האתר, מימין לשמאל */}
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} /> {/* שמים את התפריט בצד */}
      
      <div className="flex-1 flex flex-col md:pr-64 h-full overflow-hidden w-full transition-all duration-300"> {/* האזור המרכזי של התוכן */}
        <Header  // שמים את הפס העליון
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}  // כפתור לפתיחת תפריט בטלפון
          profile={selectedProfile} // שולחים את המידע על המשתמש שנבחר
          onLogout={handleLogout} // שולחים את היכולת להתנתק
        />
        <main className="flex-1 overflow-y-auto relative"> {/* פה מוצג התוכן של כל דף */}
          <Routes> {/* רשימה של כל הכתובות האפשריות באתר */}
            <Route path="/" element={<Projects />} /> {/* דף הבית מראה את רשימת הפרויקטים */}
            <Route path="/overview" element={<Overview />} /> {/* דף ניהול כללי */}
            
            <Route path="/projects/:projectId" element={<Dashboard />} /> {/* דף פרויקט - נתונים וגרפים */}
            <Route path="/projects/:projectId/daily-logs" element={<DailyLogs />} /> {/* יומן עבודה של פרויקט */}
            <Route path="/projects/:projectId/warranty" element={<Warranty />} /> {/* שנת בדק של פרויקט */}
            <Route path="/projects/:projectId/gantt" element={<ProjectGanttPage />} /> {/* לוח זמנים של פרויקט */}
            <Route path="/projects/:projectId/budget" element={<Budget />} /> {/* תקציב של פרויקט */}
            <Route path="/projects/:projectId/incomes" element={<ProjectIncomes />} /> {/* הכנסות של פרויקט */}
            <Route path="/projects/:projectId/expenses" element={<Expenses />} /> {/* הוצאות של פרויקט */}
            <Route path="/projects/:projectId/contractors" element={<Contractors />} /> {/* קבלנים של פרויקט */}
            <Route path="/projects/:projectId/orders" element={<Orders />} /> {/* הזמנות של פרויקט */}
            <Route path="/projects/:projectId/media" element={<ProjectMediaPage />} /> {/* תמונות של פרויקט */}
            <Route path="/projects/:projectId/reports" element={<Reports />} /> {/* דוחות של פרויקט */}
            <Route path="*" element={<div className="p-8 text-center text-text-muted">עמוד בבנייה...</div>} /> {/* אם הגענו לדף שלא קיים */}
          </Routes>
          
          {currentProjectId && <AIFloatingWidget projectId={currentProjectId} />} {/* אם אנחנו בתוך פרויקט, מראים את הבוט הצף */}
        </main>
      </div>
    </div>
  );
}

function App() { // העטיפה הכי חיצונית של האפליקציה
  return (
    <Router> {/* מאפשר ניווט בתוך האתר */}
      <AppContent /> {/* מפעיל את כל התוכן שכתבנו למעלה */}
    </Router>
  );
}

export default App; // מוציאים את הקוד כדי שיוכל לרוץ
