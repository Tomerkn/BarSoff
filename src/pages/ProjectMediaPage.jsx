import React from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { ProjectMedia } from '../components/ui/ProjectMedia'; // מביאים את רכיב ניהול הקבצים והתמונות

export function ProjectMediaPage() { // דף ניהול המדיה של הפרויקט (תמונות ומסמכים)
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת בדפדפן

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* כותרת הדף והסבר קצר */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">מסמכים וגלריה</h1>
        <p className="text-text-secondary text-sm">ניהול קבצים ותמונות של הפרויקט - הכל נשמר כאן בצורה מסודרת</p>
      </div>
      
      {/* הרכיב שמציג את כל הקבצים ומאפשר להעלות חדשים */}
      <ProjectMedia projectId={projectId} />
    </div>
  );
}
