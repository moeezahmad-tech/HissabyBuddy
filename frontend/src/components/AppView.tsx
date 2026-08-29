import React, { useState } from 'react';
import SidebarNavigation from './SidebarNavigation';
import Header from './Header';
import DashboardView from './DashboardView';
import AIFinancialAssistantView from './AIFinancialAssistantView';
import DocumentUploadView from './DocumentUploadView';
import RecurringMoneyView from './RecurringMoneyView';
import SettingsView from './SettingsView';

interface AppViewProps {
  onBackToLanding: () => void;
}

export const AppView: React.FC<AppViewProps> = ({ onBackToLanding }) => {
  const [activeView, setActiveView] = useState('dashboard');

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Financial Dashboard & Real-Time Analytics';
      case 'recurring':
        return 'Recurring Money & Fixed Commitments (Rent, Salary, Bills)';
      case 'assistant':
        return 'AI Financial Chat Assistant';
      case 'upload':
        return 'Smart Document Upload & OCR';
      case 'settings':
        return 'Account & Security Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Dedicated Sidebar Navigation */}
      <SidebarNavigation 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onBackToLanding={onBackToLanding} 
      />

      {/* 2. Top Header */}
      <Header title={getTitle()} />

      {/* 3. Main Routed View Area */}
      <main className="ml-72 pt-28 px-6 sm:px-10 pb-16 w-[calc(100%-18rem)] max-w-full">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'recurring' && <RecurringMoneyView />}
        {activeView === 'assistant' && <AIFinancialAssistantView />}
        {activeView === 'upload' && <DocumentUploadView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

export default AppView;
