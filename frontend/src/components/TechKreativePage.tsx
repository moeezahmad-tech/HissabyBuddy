import React from 'react';
import HeaderNav from './HeaderNav';
import Footer from './Footer';
import { ExternalLink, Terminal, Globe, Sparkles } from 'lucide-react';

export const TechKreativePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <HeaderNav />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 space-y-12 animate-fadeIn">
        {/* Creator Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Profile</span>
          </div>
          <h1 className="text-4xl font-black text-[#012456] tracking-tight">
            Created by TechKreative
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            TechKreative is a premium software agency specialized in building high-fidelity web experiences, transactional database systems, and state-of-the-art AI-driven applications.
          </p>
        </div>

        {/* Focus Areas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-[#012456]">Full-Stack Engineering</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Crafting scalable Python API backend logic, robust Neon PostgreSQL relational schemas, and highly polished React dashboards.
            </p>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-[#012456]">AI Integration Specialist</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connecting Groq LPU inference, Pinecone semantic retrieval models, and vision OCR extractors directly into your business processes.
            </p>
          </div>
        </div>

        {/* Promotion block with Link */}
        <div className="p-8 rounded-3xl bg-indigo-900 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl" />

          <div className="space-y-2 relative z-10">
            <h2 className="text-xl font-black">Looking for Custom Software Solutions?</h2>
            <p className="text-xs text-indigo-200 max-w-md mx-auto leading-relaxed">
              We design, build, and deploy custom fintech interfaces, business administration pools, and secure cloud pipelines suited to your workflow.
            </p>
          </div>

          <div className="relative z-10">
            <a
              href="https://techkreative.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>Visit TechKreative.com</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TechKreativePage;
