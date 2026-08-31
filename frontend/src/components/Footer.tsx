import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cpu, Database } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
              <img
                src="/logo.png"
                alt="Hissaby Buddy Logo"
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <p className="text-base font-black text-[#012456] tracking-tight">
                Hissaby <span className="text-[#5391FE]">Buddy</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                AI Financial Copilot • Next-Gen Wealth Intelligence
              </p>
            </div>
          </div>

          {/* Technology Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#5391FE]" />
              Groq LLaMA-3
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#5391FE]" />
              Pinecone Vector DB
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              Firebase Auth &amp; Firestore
            </span>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; 2026 Hissaby Buddy. All financial records secured with multi-tenant data isolation.</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-[#5391FE] transition-colors font-medium">About Us</Link>
            <Link to="/techkreative" className="hover:text-[#5391FE] transition-colors font-medium">Created By TechKreative</Link>
            <Link to="/contact" className="hover:text-[#5391FE] transition-colors font-medium">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
