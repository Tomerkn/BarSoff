import React from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת
import { ProjectGantt } from '../components/ui/ProjectGantt'; // מביאים את רכיב הגאנט לניהול זמנים

export function ProjectGanttPage() { // דף לוחות זמנים (גאנט) של הפרויקט
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת בדפדפן

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* הרכיב שמציג את לוח הזמנים והמשימות */}
      <ProjectGantt projectId={projectId} />
    </div>
  );
}
