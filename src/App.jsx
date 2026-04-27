import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Contractors } from './pages/Contractors';
import { Expenses } from './pages/Expenses';
import { Budget } from './pages/Budget';
import { Orders } from './pages/Orders';
import { Reports } from './pages/Reports';
import { Overview } from './pages/Overview';
import { ProjectGanttPage } from './pages/ProjectGanttPage';
import { ProjectMediaPage } from './pages/ProjectMediaPage';
import { ProjectIncomes } from './pages/ProjectIncomes';
import { DailyLogs } from './pages/DailyLogs';
import { Warranty } from './pages/Warranty';
import { AIFloatingWidget } from './components/ui/AIFloatingWidget';

function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const match = location.pathname.match(/\/projects\/(\d+)/);
  const currentProjectId = match ? match[1] : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-text-primary" dir="rtl">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col md:pr-64 h-full overflow-hidden w-full transition-all duration-300">
        <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Projects />} />
            <Route path="/overview" element={<Overview />} />
            
            <Route path="/projects/:projectId" element={<Dashboard />} />
            <Route path="/projects/:projectId/daily-logs" element={<DailyLogs />} />
            <Route path="/projects/:projectId/warranty" element={<Warranty />} />
            <Route path="/projects/:projectId/gantt" element={<ProjectGanttPage />} />
            <Route path="/projects/:projectId/budget" element={<Budget />} />
            <Route path="/projects/:projectId/incomes" element={<ProjectIncomes />} />
            <Route path="/projects/:projectId/expenses" element={<Expenses />} />
            <Route path="/projects/:projectId/contractors" element={<Contractors />} />
            <Route path="/projects/:projectId/orders" element={<Orders />} />
            <Route path="/projects/:projectId/media" element={<ProjectMediaPage />} />
            <Route path="/projects/:projectId/reports" element={<Reports />} />
            <Route path="*" element={<div className="p-8 text-center text-text-muted">עמוד בבנייה...</div>} />
          </Routes>
          
          {currentProjectId && <AIFloatingWidget projectId={currentProjectId} />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
