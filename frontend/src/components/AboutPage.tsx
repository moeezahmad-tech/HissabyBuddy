import React from 'react';
import HeaderNav from './HeaderNav';
import Footer from './Footer';
import { Target, Users, BookOpen, Sparkles, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <HeaderNav />

      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 space-y-16 animate-fadeIn">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#5391FE] text-xs font-bold uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            <span>Our Mission</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#012456] tracking-tight leading-tight">
            Simplify Money. Empower Teams.
          </h1>
          <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Hissaby Buddy is an autonomous multi-currency financial copilot designed to bridge the gap between individual ledger tracking and collaborative team pools.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-[#012456]">AI-Driven Analytics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We leverage large language models and vector search embeddings to give you instant conversational insights on statements, budgets, and operational expenditures.
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-[#012456]">Collaborative Synergy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Shared household bills, client projects, and trip splits are unified under one settings portal with automated email alerts keeping everyone transparent.
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-[#012456]">Strict Security</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              All uploads and transactions are protected with Firebase enterprise auth, Neon PostgreSQL indexing safeguards, and multi-tenant schema isolation.
            </p>
          </div>
        </div>

        {/* Narrative Section */}
        <div className="p-8 sm:p-10 bg-white border border-slate-200 rounded-3xl space-y-6">
          <h2 className="text-2xl font-black text-[#012456] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#5391FE]" />
            The Story Behind Hissaby Buddy
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hissaby Buddy was conceived to address a very common frustration: managing shared finances. Whether it's roommates dividing utility and grocery bills, freelance teams tracking domain renewals, or families trying to stick to a strict monthly cap, typical tools feel either too simplistic or overly complex. 
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            By building a unified app with inline currency switching (USD, PKR, AED, etc.), real-time statement OCR parsing, and an integrated AI Financial Copilot, we created a dashboard where finances become conversational and collaborative.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
