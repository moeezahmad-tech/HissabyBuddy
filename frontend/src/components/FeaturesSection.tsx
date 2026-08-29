import React, { useState } from 'react';
import { 
  UploadCloud, 
  Bot, 
  LayoutDashboard, 
  ShieldCheck, 
  Receipt, 
  Palette, 
  PanelLeftClose,
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Lock,
  Zap
} from 'lucide-react';

export interface FeatureItem {
  id: string;
  title: string;
  badge: string;
  tagColor: string;
  icon: React.ElementType;
  description: string;
  techHighlight: string;
  benefits: string[];
}

export const featuresData: FeatureItem[] = [
  {
    id: 'document-upload-rag',
    title: 'Smart Document Upload & RAG',
    badge: 'Pinecone Vector DB',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: UploadCloud,
    description: 'Upload PDF bank statements or financial reports so the system can automatically read, chunk, and index them into Pinecone for semantic vector searching.',
    techHighlight: 'FastAPI + Sentence-Transformers + Pinecone Serverless Vector Index',
    benefits: [
      'Automated PDF OCR & text chunking',
      'High-dimensional vector embeddings',
      'Sub-second semantic search & retrieval'
    ]
  },
  {
    id: 'ai-chat-assistant',
    title: 'AI Financial Chat Assistant',
    badge: 'Groq AI Inference',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Bot,
    description: 'Ask questions about your budget, spending habits, or uploaded financial documents and get instant, real-time answers powered by Groq AI.',
    techHighlight: 'Ultra-low latency Groq Cloud LPU with LLaMA-3 financial intelligence',
    benefits: [
      'Conversational financial analysis',
      'Contextual answers grounded in your bank statements',
      'Instant spending optimization tips'
    ]
  },
  {
    id: 'interactive-dashboard',
    title: 'Interactive Financial Dashboard',
    badge: 'Real-Time Analytics',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: LayoutDashboard,
    description: 'Track your finances using clean KPI summary cards, visual spending trend charts, and structured data views.',
    techHighlight: 'Dynamic data visualization with velocity charts and summary statistics',
    benefits: [
      'Clean KPI summary cards for cashflow & savings',
      'Visual spending trend bar charts by category',
      'Live financial velocity and threshold monitors'
    ]
  },
  {
    id: 'secure-authentication',
    title: 'Secure Authentication & Data Isolation',
    badge: 'Firebase Auth',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ShieldCheck,
    description: 'Sign in securely using Firebase Auth to keep your financial records private and separated per user.',
    techHighlight: 'JWT identity tokens with strict user tenancy and data sandboxing',
    benefits: [
      'Enterprise-grade OAuth and email authentication',
      'Complete per-user document & record isolation',
      'Zero cross-user data leakage guarantee'
    ]
  },
  {
    id: 'transaction-budget-logging',
    title: 'Structured Transaction & Budget Logging',
    badge: 'Firebase Firestore',
    tagColor: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Receipt,
    description: 'Save, categorize, and manage your income, budgets, and transaction histories directly in Firebase Firestore.',
    techHighlight: 'NoSQL real-time document store with instant synchronization',
    benefits: [
      'Categorized transaction histories (Income, Software, Cloud)',
      'Budget cap tracking with real-time balance calculations',
      'Instant sync between web client and backend ledger'
    ]
  },
  {
    id: 'custom-responsive-interface',
    title: 'Custom Responsive Interface',
    badge: 'Tailwind CSS White-Theme',
    tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Palette,
    description: 'Navigate through a clean, white-themed layout styled with Tailwind CSS, custom logo branding, and smooth on-scroll entrance animations.',
    techHighlight: 'Bespoke design system with #5391FE primary blue & #012456 deep navy accents',
    benefits: [
      'Crisp, distraction-free pure white UI (#FFFFFF)',
      'Official Hisaaby Buddy smiling logo branding',
      'Fluid transitions and responsive layout across mobile and desktop'
    ]
  },
  {
    id: 'sidebar-navigation',
    title: 'Sidebar Navigation',
    badge: 'Navigation Hub',
    tagColor: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: PanelLeftClose,
    description: 'Easily switch between different sections of the app—such as the dashboard, chat assistant, document upload zone, and settings—using a dedicated sidebar component.',
    techHighlight: 'Persistent stateful sidebar with active route badges and quick toggles',
    benefits: [
      'One-click switching between Dashboard, Chat, Upload, and Settings',
      'Status indicators for Pinecone sync & Groq pipeline',
      'Collapsible, responsive navigation tailored for productivity'
    ]
  }
];

interface FeaturesSectionProps {
  onSelectFeature?: (featureId: string) => void;
  onOpenApp?: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onSelectFeature, onOpenApp }) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem>(featuresData[0]);

  const filteredFeatures = activeTab === 'all' 
    ? featuresData 
    : activeTab === 'ai' 
      ? featuresData.filter(f => ['document-upload-rag', 'ai-chat-assistant'].includes(f.id))
      : activeTab === 'dashboard'
        ? featuresData.filter(f => ['interactive-dashboard', 'sidebar-navigation', 'custom-responsive-interface'].includes(f.id))
        : featuresData.filter(f => ['secure-authentication', 'transaction-budget-logging'].includes(f.id));

  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-blue-100/40 via-sky-50/50 to-indigo-100/30 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#5391FE] text-xs font-semibold uppercase tracking-wider mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Architecture & Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight text-balance">
            Comprehensive Financial Intelligence Built for Precision
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 text-pretty leading-relaxed">
            Hisaaby Buddy unites advanced RAG vector search, instant Groq inference, and robust Firebase isolation within an elegant, white-themed responsive experience.
          </p>

          {/* Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'All 7 Core Features' },
              { id: 'ai', label: 'AI & Vector RAG' },
              { id: 'dashboard', label: 'Dashboard & Interface' },
              { id: 'security', label: 'Security & Database' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#012456] text-white shadow-sm ring-2 ring-[#012456]/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 7 Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isSelected = selectedFeature.id === feature.id;

            return (
              <div
                key={feature.id}
                onClick={() => {
                  setSelectedFeature(feature);
                  if (onSelectFeature) onSelectFeature(feature.id);
                }}
                className={`group relative p-8 rounded-3xl bg-white border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                  isSelected 
                    ? 'border-[#5391FE] shadow-lg ring-2 ring-[#5391FE]/20 -translate-y-1' 
                    : 'border-slate-200 hover:border-[#5391FE]/60 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div>
                  {/* Top row: Icon and Badge */}
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 text-[#5391FE] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#5391FE] group-hover:text-white transition-all duration-300 shadow-xs">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${feature.tagColor} shadow-2xs`}>
                      {feature.badge}
                    </span>
                  </div>

                  {/* Title & Number */}
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <span className="text-xs font-black text-[#5391FE]">0{index + 1}.</span>
                    <h3 className="text-xl font-bold text-[#012456] tracking-tight group-hover:text-[#5391FE] transition-colors">
                      {feature.title}
                    </h3>
                  </div>

                  {/* Description (Exact requested requirement text) */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                    {feature.description}
                  </p>

                  {/* Bullet Benefits */}
                  <div className="space-y-2 border-t border-slate-100 pt-4 mb-4">
                    {feature.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5391FE] shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Tech Tag */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="truncate max-w-[200px]" title={feature.techHighlight}>
                    {feature.techHighlight}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#5391FE] group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Feature Spotlight Banner */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-[#012456] via-[#022f6d] to-[#011c43] text-white p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-[#5391FE]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 text-[#5391FE]" />
                <span>Feature in Focus: {selectedFeature.title}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Experience {selectedFeature.title} in Action
              </h3>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-2xl">
                {selectedFeature.description}
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-blue-200">
                <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Database className="w-3.5 h-3.5 text-[#5391FE]" />
                  {selectedFeature.techHighlight}
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Lock className="w-3.5 h-3.5 text-[#5391FE]" />
                  Per-User Data Isolation
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              {onOpenApp && (
                <button
                  onClick={onOpenApp}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Launch Live App View</span>
                </button>
              )}
              <a
                href="#interactive-demo"
                className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/20 text-center flex items-center justify-center gap-2"
              >
                <span>Try Interactive Demos</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
