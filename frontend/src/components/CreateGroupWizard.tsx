import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Sparkles, Users, Wallet,
  ShieldCheck, ShoppingBag, Briefcase, Home,
  Plus, X, RefreshCw, SplitSquareVertical,
  CheckCircle2, ChevronRight, Bell,
  Percent, Hash
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { teamService } from '../services/teamService';

type ThemeType = 'family' | 'project' | 'friends' | 'team';
type BudgetMode = 'fixed' | 'no_budget';
type SplitMode = 'equal_split' | 'single_payer' | 'custom_percent' | 'custom_ratio';

interface InitialMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  customTitle: string;
  sharePercent: number;
  shareRatio: number;
  isPrimaryPayer?: boolean;
}

interface WizardState {
  name: string;
  theme: ThemeType;
  description: string;
  currency: string;
  currency_symbol: string;
  budgetMode: BudgetMode;
  budgetAmount: string;
  splitMode: SplitMode;
  sponsorName: string;
  isTemporary: boolean;
  requireReceipts: boolean;
  allowMemberInvites: boolean;
  autoNotifyMembers: boolean;
  members: InitialMember[];
}

export const CreateGroupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New member draft inputs
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [newMemberTitle, setNewMemberTitle] = useState('');

  const defaultUserEmail = user?.email || 'you@hissaby.pk';
  const defaultUserName = user?.displayName || user?.email?.split('@')[0] || 'You (Creator)';

  const [form, setForm] = useState<WizardState>(() => {
    const urlTheme = (searchParams.get('theme') as ThemeType) || 'family';
    const urlBudget = searchParams.get('budget') || (urlTheme === 'family' ? '60000' : '50000');
    const urlName = searchParams.get('name') || (urlTheme === 'family' ? 'Family & Household Pool' : '');

    return {
      name: urlName,
      theme: urlTheme,
      description: '',
      currency: 'PKR',
      currency_symbol: 'Rs ',
      budgetMode: 'fixed',
      budgetAmount: urlBudget,
      splitMode: urlTheme === 'family' ? 'single_payer' : 'equal_split',
      sponsorName: defaultUserName,
      isTemporary: false,
      requireReceipts: false,
      allowMemberInvites: true,
      autoNotifyMembers: true,
      members: [
        {
          id: 'mem_owner',
          name: defaultUserName,
          email: defaultUserEmail,
          role: 'owner',
          customTitle: 'Head of Household / Creator',
          sharePercent: 100,
          shareRatio: 1,
          isPrimaryPayer: true,
        },
      ],
    };
  });

  // Re-balance percentages when members change
  useEffect(() => {
    if (form.splitMode === 'custom_percent' && form.members.length > 0) {
      const equalShare = Math.floor(100 / form.members.length);
      const remainder = 100 - equalShare * form.members.length;
      setForm((prev) => ({
        ...prev,
        members: prev.members.map((m, idx) => ({
          ...m,
          sharePercent: equalShare + (idx === 0 ? remainder : 0),
        })),
      }));
    }
  }, [form.members.length, form.splitMode]);

  const STEPS = [
    { num: 1, title: 'Identity & Theme', desc: 'Name, purpose & type' },
    { num: 2, title: 'Budget Structure', desc: 'Monthly pool vs simple split' },
    { num: 3, title: 'Division Proportion', desc: 'Who pays & split rules' },
    { num: 4, title: 'Members & Roles', desc: 'Add participants & titles' },
    { num: 5, title: 'Review & Launch', desc: 'Verify & activate' },
  ];

  const THEMES: { id: ThemeType; label: string; desc: string; icon: any; color: string; badgeColor: string; defaultBudget: string; defaultSplit: SplitMode }[] = [
    {
      id: 'family',
      label: 'Family & Household',
      desc: 'Home rashan, groceries, utilities, school fees, and allowances.',
      icon: ShoppingBag,
      color: 'emerald',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      defaultBudget: '60000',
      defaultSplit: 'single_payer',
    },
    {
      id: 'friends',
      label: 'Roommates & Flat Bills',
      desc: 'Dining out, trips, shared groceries, and roommate utility bills.',
      icon: Home,
      color: 'purple',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      defaultBudget: '40000',
      defaultSplit: 'equal_split',
    },
    {
      id: 'project',
      label: 'Freelance & Projects',
      desc: 'Client budgets, billable milestones, contractor payouts and tools.',
      icon: Briefcase,
      color: 'blue',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      defaultBudget: '150000',
      defaultSplit: 'equal_split',
    },
    {
      id: 'team',
      label: 'Team & Department',
      desc: 'Department budgets, software subscriptions, office expenses.',
      icon: Users,
      color: 'amber',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      defaultBudget: '100000',
      defaultSplit: 'single_payer',
    },
  ];

  const handleSelectTheme = (theme: ThemeType) => {
    const t = THEMES.find((item) => item.id === theme);
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      theme,
      budgetAmount: t.defaultBudget,
      splitMode: t.defaultSplit,
    }));
  };

  const handleAddMember = () => {
    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    const trimmedName = newMemberName.trim() || trimmedEmail.split('@')[0] || 'Member';
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please provide a valid member email address.');
      return;
    }
    if (form.members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
      setErrorMessage('A member with this email is already added.');
      return;
    }

    setErrorMessage(null);
    const newMember: InitialMember = {
      id: `mem-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      role: newMemberRole,
      customTitle: newMemberTitle.trim() || (newMemberRole === 'admin' ? 'Co-Manager' : 'Member'),
      sharePercent: 0,
      shareRatio: 1,
    };

    setForm((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberTitle('');
  };

  const handleRemoveMember = (id: string) => {
    if (id === 'mem_owner') return; // Cannot remove owner
    setForm((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  };

  const handleUpdateMemberPercent = (id: string, percent: number) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, sharePercent: Math.max(0, Math.min(100, percent)) } : m)),
    }));
  };

  const handleAutoBalancePercent = () => {
    if (form.members.length === 0) return;
    const equalShare = Math.floor(100 / form.members.length);
    const remainder = 100 - equalShare * form.members.length;
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((m, idx) => ({
        ...m,
        sharePercent: equalShare + (idx === 0 ? remainder : 0),
      })),
    }));
  };

  const totalPercentSum = form.members.reduce((acc, m) => acc + (m.sharePercent || 0), 0);

  const handleCreateWorkspace = async () => {
    if (!form.name.trim()) {
      setCurrentStep(1);
      setErrorMessage('Please provide a name for this group.');
      return;
    }

    if (form.splitMode === 'custom_percent' && totalPercentSum !== 100) {
      setCurrentStep(4);
      setErrorMessage(`Total percentages must sum to 100% (currently ${totalPercentSum}%). Click "Auto-Balance 100%" or adjust.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Workspace
      const createdWs = await teamService.createWorkspace(
        {
          name: form.name.trim(),
          theme: form.theme,
          description: form.description.trim(),
          currency: form.currency,
          currency_symbol: form.currency_symbol,
          is_temporary: form.isTemporary,
          budget_type: form.budgetMode,
          theme_settings: {
            budget_type: form.budgetMode,
            split_mode: form.splitMode,
            sponsor_name: form.sponsorName,
            require_receipts: form.requireReceipts,
            allow_member_invites: form.allowMemberInvites,
            auto_notify_members: form.autoNotifyMembers,
            custom_shares: form.members.map((m) => ({
              email: m.email,
              name: m.name,
              role: m.role,
              custom_title: m.customTitle,
              share_percent: m.sharePercent,
              share_ratio: m.shareRatio,
            })),
          },
        },
        user?.token,
        {
          email: defaultUserEmail,
          displayName: defaultUserName,
        }
      );

      // Save split preference locally
      try {
        localStorage.setItem(`hissaby_expense_mode_${createdWs.id}`, form.splitMode);
      } catch {}

      // 2. If Fixed Budget is active, create the initial budget
      if (form.budgetMode === 'fixed') {
        const budgetVal = parseFloat(form.budgetAmount);
        if (!isNaN(budgetVal) && budgetVal > 0) {
          await teamService.createBudget(
            createdWs.id,
            {
              name: `${form.name.trim()} Monthly Pool`,
              amount: budgetVal,
              period: 'monthly',
              alert_threshold_percent: 80,
            },
            user?.token
          ).catch((err) => console.warn('Budget create warning:', err));
        }
      }

      // 3. Dispatch member invitations
      const invitees = form.members.filter((m) => m.id !== 'mem_owner' && m.email);
      for (const inv of invitees) {
        try {
          await teamService.inviteMember(createdWs.id, inv.email, inv.role, user?.token);
        } catch (invErr) {
          console.warn(`Invitation dispatch note for ${inv.email}:`, invErr);
        }
      }

      // 4. Redirect to the newly created collaborative workspace
      navigate(`/dashboard/teams?ws=${createdWs.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create collaborative group. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 animate-fadeIn">
      {/* ── Top Sticky Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/teams')}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Groups &amp; Teams</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Step {currentStep} of {STEPS.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ── Step Progress Indicator ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-8">
          {STEPS.map((s) => {
            const isActive = s.num === currentStep;
            const isCompleted = s.num < currentStep;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep || (currentStep === 1 && form.name.trim())) {
                    setCurrentStep(s.num);
                  }
                }}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white border-[#5391FE] shadow-sm ring-2 ring-[#5391FE]/10'
                    : isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                    : 'bg-white/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-[#5391FE] text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  <span className="text-xs font-black text-slate-800 truncate">{s.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Main 2-Column Layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Steps */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── STEP 1: IDENTITY & THEME ──────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-[#012456]">What is this group for?</h2>
                  <p className="text-xs text-slate-500 mt-1">Select a theme and customize the group name, currency, and purpose.</p>
                </div>

                {/* Theme Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {THEMES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = form.theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/40 border-[#5391FE] shadow-xs ring-2 ring-[#5391FE]/10'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#5391FE] text-white' : 'bg-slate-100 text-slate-600'}`}>
                              <Icon className="w-4.5 h-4.5" />
                            </div>
                            {isSelected && (
                              <div className="w-4.5 h-4.5 rounded-full bg-[#5391FE] text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-xs font-black text-slate-900">{t.label}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                          Suggested pool: <span className="text-slate-700">Rs {parseInt(t.defaultBudget).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Group Details */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">Group / Pool Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Model Town Home Rashan, Murree Trip 2026, Flat 402 Utilities"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1.5">Description (Optional)</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="e.g. Shared household food, groceries, utilities, and daily rashan expenses."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 resize-none"
                    />
                  </div>

                  {/* Temporary Quick Split Checkbox */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Temporary Quick Split</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Auto-archived once all balances are settled (perfect for one-off dining or weekend trips).</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isTemporary}
                      onChange={(e) => setForm({ ...form, isTemporary: e.target.checked })}
                      className="w-4.5 h-4.5 rounded-md text-[#5391FE] border-slate-300 focus:ring-[#5391FE]/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (!form.name.trim()) {
                        setErrorMessage('Please provide a group name before proceeding.');
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep(2);
                    }}
                    className="px-6 py-2.5 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Next: Budget Structure</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: BUDGET STRUCTURE (BUDGET ONE vs SIMPLE ONE) ──────── */}
            {currentStep === 2 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-[#012456]">Choose the Group Structure</h2>
                  <p className="text-xs text-slate-500 mt-1">Select whether this group uses a capped monthly budget pool or a simple open-ended bill split.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Fixed Budget Pool */}
                  <div
                    onClick={() => setForm({ ...form, budgetMode: 'fixed' })}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.budgetMode === 'fixed'
                        ? 'bg-blue-50/40 border-[#5391FE] shadow-sm ring-2 ring-[#5391FE]/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#5391FE] flex items-center justify-center">
                          <Wallet className="w-5 h-5" />
                        </div>
                        {form.budgetMode === 'fixed' && (
                          <div className="w-4.5 h-4.5 rounded-full bg-[#5391FE] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#5391FE] block mb-1">Structure 1</span>
                      <h3 className="text-sm font-black text-slate-900">Monthly Budget Pool</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Best for household groceries, family rashan, and team allowances with a predefined ceiling.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] font-bold text-[#5391FE]">
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Total spending limit &amp; 80% alerts</div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Auto resets every calendar month</div>
                    </div>
                  </div>

                  {/* Option B: Simple Bill Split */}
                  <div
                    onClick={() => setForm({ ...form, budgetMode: 'no_budget' })}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.budgetMode === 'no_budget'
                        ? 'bg-emerald-50/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <SplitSquareVertical className="w-5 h-5" />
                        </div>
                        {form.budgetMode === 'no_budget' && (
                          <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">Structure 2</span>
                      <h3 className="text-sm font-black text-slate-900">Simple Open Split</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Best for dinners, road trips, roommate outings, and casual splits without spending restrictions.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] font-bold text-emerald-700">
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No budget caps or limit restrictions</div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Log expenses &amp; calculate exact dues</div>
                    </div>
                  </div>
                </div>

                {/* If Budget Pool is chosen, configure monthly amount */}
                {form.budgetMode === 'fixed' && (
                  <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 animate-fadeIn">
                    <label className="block text-xs font-black text-slate-800">
                      Initial Monthly Pool Ceiling (PKR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rs</span>
                      <input
                        type="number"
                        required
                        value={form.budgetAmount}
                        onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })}
                        placeholder="50000"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['30000', '50000', '75000', '100000', '150000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setForm({ ...form, budgetAmount: preset })}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            form.budgetAmount === preset
                              ? 'bg-[#5391FE] text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Rs {parseInt(preset).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Division Proportion</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: PROPORTION & DIVISION STRUCTURE ─────────────────── */}
            {currentStep === 3 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-[#012456]">Who will divide it and how?</h2>
                  <p className="text-xs text-slate-500 mt-1">Configure how expenses and shares will be divided between members.</p>
                </div>

                <div className="space-y-3.5">
                  {/* Mode 1: Equal Split */}
                  <div
                    onClick={() => setForm({ ...form, splitMode: 'equal_split' })}
                    className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      form.splitMode === 'equal_split'
                        ? 'bg-blue-50/40 border-[#5391FE] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.splitMode === 'equal_split' ? 'bg-[#5391FE] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <SplitSquareVertical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Equal Division (1/N per member)</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700">Fair Split</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Every expense is split equally among all members. Ideal for roommates, flat bills, and shared dinners.
                        </p>
                      </div>
                    </div>
                    {form.splitMode === 'equal_split' && (
                      <div className="w-5 h-5 rounded-full bg-[#5391FE] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Mode 2: Single Payer / Household Sponsor (Dad will pay / Sponsor) */}
                  <div
                    onClick={() => setForm({ ...form, splitMode: 'single_payer' })}
                    className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      form.splitMode === 'single_payer'
                        ? 'bg-amber-50/40 border-amber-500 shadow-xs ring-2 ring-amber-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.splitMode === 'single_payer' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Single Payer / Household Head (e.g. Dad Covers All)</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800">Sponsor Mode</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          One primary person (e.g. father, household head, or company sponsor) covers all shared pool expenses. No dues or settlements expected from other members.
                        </p>
                      </div>
                    </div>
                    {form.splitMode === 'single_payer' && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Mode 3: Custom Percentage Proportion */}
                  <div
                    onClick={() => setForm({ ...form, splitMode: 'custom_percent' })}
                    className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      form.splitMode === 'custom_percent'
                        ? 'bg-purple-50/40 border-purple-500 shadow-xs ring-2 ring-purple-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.splitMode === 'custom_percent' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Custom Percentage Split (e.g. Dad 50%, Son 25%, Daughter 25%)</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-800">Proportional</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Allocate specific percentage shares for each member in the next step. Perfect for unequal earning or usage.
                        </p>
                      </div>
                    </div>
                    {form.splitMode === 'custom_percent' && (
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Mode 4: Custom Shares / Ratio */}
                  <div
                    onClick={() => setForm({ ...form, splitMode: 'custom_ratio' })}
                    className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      form.splitMode === 'custom_ratio'
                        ? 'bg-blue-50/40 border-[#5391FE] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.splitMode === 'custom_ratio' ? 'bg-[#5391FE] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Custom Share Multipliers (e.g. 2 shares : 1 share : 1 share)</h4>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-[#012456]">Share Ratios</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          Set relative units or heads per member (e.g. couples pay 2 shares, singles pay 1 share).
                        </p>
                      </div>
                    </div>
                    {form.splitMode === 'custom_ratio' && (
                      <div className="w-5 h-5 rounded-full bg-[#5391FE] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Add Members &amp; Roles</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: MEMBERS, ROLES & PROPORTIONS ─────────────────────── */}
            {currentStep === 4 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#012456]">Who will be in this group?</h2>
                    <p className="text-xs text-slate-500 mt-1">Add members, their custom titles (e.g. Dad, Mom, Roommate) and split proportions.</p>
                  </div>
                  {form.splitMode === 'custom_percent' && (
                    <button
                      type="button"
                      onClick={handleAutoBalancePercent}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Auto-Balance 100%
                    </button>
                  )}
                </div>

                {/* Add Member Form */}
                <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#5391FE]" />
                    <span>Add a Member to Group</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Member Name / Title</label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="e.g. Dad, Mom, Ali, Roommate 1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address <span className="text-rose-500">*</span></label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMember();
                          }
                        }}
                        placeholder="member@example.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Role</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="member">Member (Can log expenses &amp; view dues)</option>
                        <option value="admin">Co-Admin (Can manage group settings)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom Label / Role Tag</label>
                      <input
                        type="text"
                        value={newMemberTitle}
                        onChange={(e) => setNewMemberTitle(e.target.value)}
                        placeholder="e.g. Household Head, Eldest Son, Roommate"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Participant</span>
                    </button>
                  </div>
                </div>

                {/* Current Members List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700 px-1">
                    <span>Configured Members ({form.members.length})</span>
                    {form.splitMode === 'custom_percent' && (
                      <span className={`text-[11px] font-bold ${totalPercentSum === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Total Share: {totalPercentSum}% / 100%
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {form.members.map((m, idx) => (
                      <div key={m.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${m.role === 'owner' ? 'bg-[#012456] text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{m.name}</span>
                              <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                m.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : m.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {m.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">{m.email} {m.customTitle ? `• ${m.customTitle}` : ''}</p>
                          </div>
                        </div>

                        {/* Split Proportions control */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {form.splitMode === 'custom_percent' && (
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-bold text-slate-600">Share:</label>
                              <div className="relative w-20">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={m.sharePercent}
                                  onChange={(e) => handleUpdateMemberPercent(m.id, parseInt(e.target.value) || 0)}
                                  className="w-full pr-5 pl-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-right focus:outline-none focus:border-[#5391FE]"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                              </div>
                            </div>
                          )}

                          {form.splitMode === 'single_payer' && (
                            <div className="text-[11px] font-bold text-amber-700">
                              {idx === 0 ? '👑 Primary Sponsor' : 'Covered by Sponsor'}
                            </div>
                          )}

                          {form.splitMode === 'equal_split' && (
                            <div className="text-[11px] font-bold text-slate-500">
                              Equal 1/{form.members.length} Share
                            </div>
                          )}

                          {m.id !== 'mem_owner' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Remove member"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (form.splitMode === 'custom_percent' && totalPercentSum !== 100) {
                        setErrorMessage(`Total percentages must sum to 100% (currently ${totalPercentSum}%). Click "Auto-Balance 100%" or adjust.`);
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep(5);
                    }}
                    className="px-6 py-2.5 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Review &amp; Launch</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 5: REVIEW, NOTIFICATION PREFERENCES & LAUNCH ───────── */}
            {currentStep === 5 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-black text-[#012456]">Ready to Launch Collaborative Group!</h2>
                  <p className="text-xs text-slate-500 mt-1">Review the configurations below before generating the group ledger and settlement rules.</p>
                </div>

                {/* Configuration Summary Table */}
                <div className="space-y-2.5 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">Group Name</span>
                    <span className="font-black text-slate-900">{form.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">Theme / Type</span>
                    <span className="font-black text-slate-900 capitalize">{form.theme}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">Structure</span>
                    <span className="font-black text-slate-900">
                      {form.budgetMode === 'fixed'
                        ? `Monthly Pool Ceiling (${formatAmount(parseFloat(form.budgetAmount) || 0, false, 'Rs ')})`
                        : 'Simple Open Bill Split (No limit)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">Division Rule</span>
                    <span className="font-black text-slate-900 capitalize">
                      {form.splitMode === 'single_payer'
                        ? 'Single Payer / Sponsor (Dad Covers All)'
                        : form.splitMode === 'custom_percent'
                        ? 'Custom Percentage Split'
                        : form.splitMode === 'custom_ratio'
                        ? 'Custom Share Multipliers'
                        : 'Equal 1/N Split'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/70">
                    <span className="text-slate-500 font-medium">Active Participants</span>
                    <span className="font-black text-slate-900">{form.members.length} member(s)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Currency</span>
                    <span className="font-black text-slate-900">PKR (Rs)</span>
                  </div>
                </div>

                {/* Automated Notification Feature Option */}
                <div className="p-4.5 bg-blue-50/50 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5391FE] text-white flex items-center justify-center shrink-0">
                      <Bell className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Automated Share &amp; Settlement Notifications</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Instantly alert members on WhatsApp, Email, or SMS with exact amounts and who to pay.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.autoNotifyMembers}
                    onChange={(e) => setForm({ ...form, autoNotifyMembers: e.target.checked })}
                    className="w-4.5 h-4.5 rounded-md text-[#5391FE] border-slate-300 focus:ring-[#5391FE]/20 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-black rounded-xl shadow-lg shadow-[#5391FE]/20 flex items-center gap-2 cursor-pointer disabled:bg-slate-300 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Launching Group &amp; Initializing Settlement Ledger...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Launch Collaborative Group</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Preview Sidebar */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Live Preview</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#5391FE]">Interactive</span>
              </div>

              {/* Group Card Preview */}
              <div className="bg-gradient-to-br from-[#012456] to-[#04337a] p-5 rounded-2xl text-white shadow-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-md">
                      {form.theme.toUpperCase()}
                    </span>
                    <h3 className="text-base font-black mt-2 truncate max-w-[220px]">
                      {form.name || 'Untitled Collaborative Group'}
                    </h3>
                    <p className="text-[11px] text-blue-100/70 mt-0.5 line-clamp-1">
                      {form.description || 'Shared collaborative budget and expense pool'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-200/60 block">Structure</span>
                    <span className="font-bold text-white block mt-0.5 truncate">
                      {form.budgetMode === 'fixed' ? formatAmount(parseFloat(form.budgetAmount) || 0, false, 'Rs ') : 'Simple Bill Split'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200/60 block">Division Rule</span>
                    <span className="font-bold text-white block mt-0.5 capitalize truncate">
                      {form.splitMode.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Share Allocations List Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-700 block uppercase tracking-wider">
                  Participants &amp; Shares ({form.members.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {form.members.map((m, idx) => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[#012456] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 truncate">{m.name}</span>
                      </div>
                      <span className="font-bold text-[#5391FE] text-[11px] shrink-0">
                        {form.splitMode === 'single_payer'
                          ? (idx === 0 ? '100% (Sponsor)' : '0% (Covered)')
                          : form.splitMode === 'custom_percent'
                          ? `${m.sharePercent}%`
                          : `${(100 / form.members.length).toFixed(0)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Ready Alert */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ready with WhatsApp &amp; Email settlement notify buttons.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupWizard;
