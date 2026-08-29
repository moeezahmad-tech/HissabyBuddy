import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import HeroSection from './components/HeroSection';
import SevenFeatureSections from './components/SevenFeatureSections';
import Footer from './components/Footer';
import AppView from './components/AppView';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { useServerKeepAlive } from './hooks/useServerKeepAlive';
import { Sparkles, RefreshCw } from 'lucide-react';

// Landing Page Component at Route: "/"
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth();

  const handleOpenDashboard = () => {
    if (!user) {
      openAuthModal();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#5391FE]/20 selection:text-[#012456]">
      {/* 1. Header Navigation */}
      <HeaderNav onOpenApp={handleOpenDashboard} />

      {/* 2. Hero Section */}
      <HeroSection onOpenApp={handleOpenDashboard} />

      {/* 3. 7 Dedicated Feature Sections */}
      <SevenFeatureSections onOpenApp={handleOpenDashboard} />

      {/* 4. Clean Footer */}
      <Footer />

      {/* Global Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          closeAuthModal();
          if (user) {
            navigate('/dashboard');
          }
        }} 
      />
    </div>
  );
};

// Protected Dashboard Component at Route: "/dashboard"
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthModalOpen, closeAuthModal } = useAuth();

  // If user is not authenticated on /dashboard, show dedicated login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <AuthModal 
          isOpen={true} 
          onClose={() => navigate('/')} 
        />
      </div>
    );
  }

  return (
    <>
      <AppView onBackToLanding={() => navigate('/')} />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </>
  );
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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;
