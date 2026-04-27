import React from 'react';
import { User, ShieldCheck, Code, Calculator } from 'lucide-react';

const profiles = [
  {
    id: 'shimon',
    name: 'שמעון אזולאי',
    role: 'מנכ״ל',
    icon: <ShieldCheck className="w-8 h-8 text-brand" />,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shimon&backgroundColor=b6e3f4',
    bg: 'bg-blue-50'
  },
  {
    id: 'bar',
    name: 'בר אזולאי',
    role: 'מפתחת מספר 1',
    icon: <Code className="w-8 h-8 text-brand" />,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bar&backgroundColor=ffdfbf',
    bg: 'bg-orange-50'
  },
  {
    id: 'tomer',
    name: 'תומר קנובלר',
    role: 'מפתח מספר 2',
    icon: <Code className="w-8 h-8 text-brand" />,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tomer&backgroundColor=d1d4f9',
    bg: 'bg-indigo-50'
  },
  {
    id: 'accountant',
    name: 'מנהלת חשבונות',
    role: 'כספים',
    icon: <Calculator className="w-8 h-8 text-brand" />,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Accountant&backgroundColor=ffd5dc',
    bg: 'bg-rose-50'
  }
];

export function ProfileSelection({ onSelect }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-4xl w-full text-center mb-12">
        <img 
          src="https://barsuf.co.il/wp-content/uploads/2019/07/logo-barsuf.png" 
          alt="Barsuf Logo" 
          className="h-16 mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-text-primary mb-2">ברוכים הבאים למערכת Barsuf</h1>
        <p className="text-text-secondary text-lg">בחר פרופיל עבודה כדי להמשיך</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            className="group relative bg-surface border border-border rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden"
          >
            <div className={`absolute top-0 inset-x-0 h-2 transition-all duration-300 group-hover:h-3 ${profile.id === 'shimon' ? 'bg-brand' : 'bg-brand/60'}`} />
            
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface shadow-md group-hover:scale-110 transition-transform duration-300">
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-surface rounded-full p-2 shadow-sm border border-border">
                {profile.icon}
              </div>
            </div>

            <h3 className="text-xl font-bold text-text-primary mb-1">{profile.name}</h3>
            <p className="text-text-secondary font-medium">{profile.role}</p>
            
            <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand text-white px-4 py-2 rounded-full text-sm font-bold">
              כניסה למערכת
            </div>
          </button>
        ))}
      </div>

      <div className="mt-16 text-text-muted text-sm flex items-center gap-2">
        <User className="w-4 h-4" />
        <span>מערכת ניהול פרויקטים חכמה | Barsuf 2024</span>
      </div>
    </div>
  );
}
