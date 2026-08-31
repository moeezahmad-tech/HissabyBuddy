import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import HeroSection from './components/HeroSection';
import SevenFeatureSections from './components/SevenFeatureSections';
import Footer from './components/Footer';
import AppView from './components/AppView';
import DashboardView from './components/DashboardView';
import TeamsGroupsView from './components/TeamsGroupsView';
import GroupSettingsPage from './components/GroupSettingsPage';
import LoansView from './components/LoansView';
import RecurringMoneyView from './components/RecurringMoneyView';
import AIFinancialAssistantView from './components/AIFinancialAssistantView';
import DocumentUploadView from './components/DocumentUploadView';
import SettingsView from './components/SettingsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { useServerKeepAlive } from './hooks/useServerKeepAlive';
import { Sparkles, RefreshCw } from 'lucide-react';

import LoginPage from './components/LoginPage';
import AboutPage from './components/AboutPage';
import TechKreativePage from './components/TechKreativePage';
import ContactPage from './components/ContactPage';

// Landing Page Component at Route: "/"
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#5391FE]/20 selection:text-[#012456]">
      {/* 1. Full 100vh Landing Header & Hero Fold */}
      <div className="min-h-screen flex flex-col justify-between">
        <HeaderNav onOpenApp={handleGetStarted} />
        <HeroSection onOpenApp={handleGetStarted} />
      </div>

      {/* 2. 7 Dedicated Feature Sections */}
      <SevenFeatureSections onOpenApp={handleGetStarted} />

      {/* 3. Clean Footer */}
      <Footer />
    </div>
  );
};

// Protected Layout Component for Dashboard & Sidebar Routes
const ProtectedDashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // If user is not authenticated, redirect to dedicated login page with return state
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <AppView onBackToLanding={() => navigate('/')} />;
};

export const App: React.FC = () => {
  const { isWakingUp } = useServerKeepAlive();

  return (
    <AuthProvider>
      <CurrencyProvider>
        {/* Render Cloud Wakeup Banner */}
        {isWakingUp && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#012456] text-white px-4 py-3 rounded-2xl shadow-2xl border border-blue-400/30 flex items-center gap-3 animate-fadeIn text-xs">
            <RefreshCw className="w-4 h-4 text-[#5391FE] animate-spin shrink-0" />
            <div>
              <p className="font-bold flex items-center gap-1.5">
                <span>Waking up cloud backend...</span>
                <Sparkles className="w-3 h-3 text-[#5391FE]" />
              </p>
              <p className="text-[10px] text-slate-300">
                Render server is spinning up. Ready in ~30 seconds!
              </p>
            </div>
          </div>
        )}

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/techkreative" element={<TechKreativePage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Protected Sidebar Routes nested under /dashboard */}
            <Route path="/dashboard" element={<ProtectedDashboardLayout />}>
              <Route index element={<DashboardView />} />
              <Route path="teams" element={<TeamsGroupsView />} />
              <Route path="teams/settings" element={<GroupSettingsPage />} />
              <Route path="loans" element={<LoansView />} />
              <Route path="recurring" element={<RecurringMoneyView />} />
              <Route path="assistant" element={<AIFinancialAssistantView />} />
              <Route path="upload" element={<DocumentUploadView />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>

            {/* Shorthand alias routes for direct URL navigation */}
            <Route path="/teams" element={<Navigate to="/dashboard/teams" replace />} />
            <Route path="/loans" element={<Navigate to="/dashboard/loans" replace />} />
            <Route path="/recurring" element={<Navigate to="/dashboard/recurring" replace />} />
            <Route path="/assistant" element={<Navigate to="/dashboard/assistant" replace />} />
            <Route path="/upload" element={<Navigate to="/dashboard/upload" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;
