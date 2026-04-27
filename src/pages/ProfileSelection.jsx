import React from 'react'; // מביאים את ריאקט כדי שנוכל לבנות את המסך
import { User, ShieldCheck, Code, Calculator } from 'lucide-react'; // מביאים אייקונים יפים לכל פרופיל

const profiles = [ // רשימה של כל האנשים שיכולים להיכנס למערכת
  {
    id: 'shimon', // המזהה של שמעון
    name: 'שמעון אזולאי', // השם שיוצג
    role: 'מנכ״ל', // התפקיד שלו
    icon: <ShieldCheck className="w-8 h-8 text-brand" />, // האייקון של המנהל
    avatar: '/shimon.png', // התמונה המגניבה שלו (Memoji)
    bg: 'bg-blue-50' // צבע רקע עדין
  },
  {
    id: 'bar', // המזהה של בר
    name: 'בר אזולאי', // השם שיוצג
    role: 'מפתחת מספר 1', // התפקיד שלה
    icon: <Code className="w-8 h-8 text-brand" />, // האייקון של המפתחת
    avatar: '/bar.png', // התמונה המגניבה שלה (Memoji)
    bg: 'bg-orange-50' // צבע רקע עדין
  },
  {
    id: 'tomer', // המזהה של תומר
    name: 'תומר קנובלר', // השם שיוצג
    role: 'מפתח מספר 2', // התפקיד שלו
    icon: <Code className="w-8 h-8 text-brand" />, // האייקון של המפתח
    avatar: '/tomer.png', // התמונה המגניבה שלו (Memoji)
    bg: 'bg-indigo-50' // צבע רקע עדין
  },
  {
    id: 'accountant', // המזהה של מנהלת החשבונות
    name: 'מנהלת חשבונות', // השם שיוצג
    role: 'כספים', // התפקיד שלה
    icon: <Calculator className="w-8 h-8 text-brand" />, // האייקון של הכספים
    avatar: '/accountant.png', // התמונה המגניבה שלה (Memoji)
    bg: 'bg-rose-50' // צבע רקע עדין
  }
];

export function ProfileSelection({ onSelect }) { // הפונקציה שמייצרת את מסך בחירת המשתמש
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl"> {/* המכולה הראשית של המסך */}
      {/* הרקע עם האימוג'ים של הבנייה (כמו בוואטסאפ) */}
      <div 
        className="absolute inset-0 opacity-[0.15] pointer-events-none transition-opacity duration-1000" // הרקע שקוף ועדין
        style={{ 
          backgroundImage: 'url(/doodle_bg.png)', // התמונה של האייקונים הקטנים
          backgroundSize: '400px', // הגודל של האייקונים
          backgroundRepeat: 'repeat' // שהרקע יחזור על עצמו על כל המסך
        }}
      />
      
      <div className="max-w-4xl w-full text-center mb-12 relative z-10"> {/* האזור העליון עם הלוגו והכותרת */}
        <img 
          src="https://barsuf.co.il/wp-content/uploads/2019/07/logo-barsuf.png" // הלוגו הרשמי של ברסוף
          alt="Barsuf Logo" 
          className="h-16 mx-auto mb-6" // הגודל והמיקום של הלוגו
        />
        <h1 className="text-3xl font-bold text-text-primary mb-2">ברוכים הבאים למערכת ניהול פרויקטים של חברת ברסוף !</h1> {/* כותרת ראשית */}
        <p className="text-text-secondary text-lg font-medium">בחר פרופיל עבודה כדי להמשיך</p> {/* הוראה למשתמש */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full"> {/* סידור הכרטיסיות ברשת */}
        {profiles.map((profile) => ( // עוברים על כל פרופיל ומייצרים לו כרטיסייה
          <button
            key={profile.id} // מזהה ייחודי לכל כפתור
            onClick={() => onSelect(profile)} // כשלוחצים, המערכת בוחרת את המשתמש הזה
            className="group relative bg-surface border border-border rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden" // עיצוב הכרטיסייה עם אפקטים של מעבר עכבר
          >
            <div className={`absolute top-0 inset-x-0 h-2 transition-all duration-300 group-hover:h-3 ${profile.id === 'shimon' ? 'bg-brand' : 'bg-brand/60'}`} /> {/* פס צבעוני עליון בכרטיסייה */}
            
            <div className="relative mb-6"> {/* אזור התמונה והאייקון */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface shadow-md group-hover:scale-110 transition-transform duration-300"> {/* עיגול לתמונה */}
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> {/* הצגת ה-Memoji */}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-surface rounded-full p-2 shadow-sm border border-border"> {/* עיגול קטן לאייקון התפקיד */}
                {profile.icon}
              </div>
            </div>

            <h3 className="text-xl font-bold text-text-primary mb-1">{profile.name}</h3> {/* שם המשתמש בכותרת */}
            <p className="text-text-secondary font-medium">{profile.role}</p> {/* תפקיד המשתמש */}
            
            <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand text-white px-4 py-2 rounded-full text-sm font-bold"> {/* כפתור כניסה שמופיע כשעומדים על הכרטיסייה */}
              כניסה למערכת
            </div>
          </button>
        ))}
      </div>

      <div className="mt-16 text-text-muted text-sm flex items-center gap-2 relative z-10 bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border"> {/* שורת זכויות יוצרים בתחתית */}
        <User className="w-4 h-4" /> {/* אייקון משתמש קטן */}
        <span>מערכת ניהול פרויקטים חכמה | Barsuf 2026</span> {/* טקסט בתחתית */}
      </div>
    </div>
  );
}
