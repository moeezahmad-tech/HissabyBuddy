import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {HeaderNav} from './components/HeaderNav';
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
import NotificationsView from './components/NotificationsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './context/ToastContext';
import { useServerKeepAlive } from './hooks/useServerKeepAlive';

import LoginPage from './components/LoginPage';
import AboutPage from './components/AboutPage';
import TechKreativePage from './components/TechKreativePage';
import ContactPage from './components/ContactPage';
import CreateGroupWizard from './components/CreateGroupWizard';
import PWABanner from './components/PWABanner';

// Landing Page Component at Route: "/"
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is logged in, automatically move directly to the dashboard
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (user && params.get('view') !== 'landing') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

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

      {/* 2. Dedicated PWA App Download Banner on Home Screen */}
      <PWABanner />

      {/* 3. 7 Dedicated Feature Sections */}
      <SevenFeatureSections onOpenApp={handleGetStarted} />

      {/* 4. Clean Footer */}
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

  return <AppView onBackToLanding={() => navigate('/?view=landing')} />;
};

export const App: React.FC = () => {
  // Cloud keepalive runs quietly in background without visual popup
  useServerKeepAlive();

  return (
    <AuthProvider>
      <CurrencyProvider>
        <ToastProvider>
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
                <Route path="teams/create" element={<CreateGroupWizard />} />
                <Route path="teams/settings" element={<GroupSettingsPage />} />
                <Route path="loans" element={<LoansView />} />
                <Route path="recurring" element={<RecurringMoneyView />} />
                <Route path="assistant" element={<AIFinancialAssistantView />} />
                <Route path="upload" element={<DocumentUploadView />} />
                <Route path="settings" element={<SettingsView />} />
                <Route path="notifications" element={<NotificationsView />} />
              </Route>

              {/* Shorthand alias routes for direct URL navigation */}
              <Route path="/teams/create" element={<Navigate to="/dashboard/teams/create" replace />} />
              <Route path="/teams" element={<Navigate to="/dashboard/teams" replace />} />
              <Route path="/loans" element={<Navigate to="/dashboard/loans" replace />} />
              <Route path="/recurring" element={<Navigate to="/dashboard/recurring" replace />} />
              <Route path="/assistant" element={<Navigate to="/dashboard/assistant" replace />} />
              <Route path="/upload" element={<Navigate to="/dashboard/upload" replace />} />
              <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
              <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;
