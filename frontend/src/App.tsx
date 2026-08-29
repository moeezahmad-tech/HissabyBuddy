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
  return (
    <AuthProvider>
      <CurrencyProvider>
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
