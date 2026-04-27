import { StrictMode } from 'react' // מביאים את הכלי שמוודא שהקוד שלנו תקין
import { createRoot } from 'react-dom/client' // מביאים את הכלי שמחבר את ריאקט לדף האינטרנט
import './index.css' // מביאים את עיצוב ה-CSS הראשי של האתר
import App from './App.jsx' // מביאים את הרכיב הראשי של האפליקציה

createRoot(document.getElementById('root')).render( // מחברים את האפליקציה לתוך האלמנט שנקרא root בדף ה-HTML
  <StrictMode> 
    <App /> {/* מריצים את האפליקציה בתוך מצב בדיקה של ריאקט */}
  </StrictMode>,
)
