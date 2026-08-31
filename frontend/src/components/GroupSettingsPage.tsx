import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Crown,
  SplitSquareVertical, PieChart, Check, Mail,
  RefreshCw, X, AlertCircle, CheckCircle2, ShoppingBag, Briefcase, Home, HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { teamService } from '../services/teamService';
import type { Workspace } from '../services/teamService';

// ─── Types ────────────────────────────────────────────────────────────────────
type ExpenseMode = 'equal_split' | 'single_payer' | 'custom_percent';

interface PendingInvite {
  id: string;
  email: string;
  sentAt: string;
  workspace_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadExpenseMode(wsId: string): ExpenseMode {
  try {
    const raw = localStorage.getItem(`hissaby_expense_mode_${wsId}`);
    if (raw === 'single_payer' || raw === 'custom_percent') return raw;
  } catch {}
  return 'equal_split';
}
function saveExpenseMode(wsId: string, mode: ExpenseMode) {
  localStorage.setItem(`hissaby_expense_mode_${wsId}`, mode);
}

function getThemeBadge(theme?: string) {
  switch (theme) {
    case 'family':  return { label: 'Family & Groceries', Icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
    case 'project': return { label: 'Project & Freelance', Icon: Briefcase, color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' };
    default:        return { label: 'Roommates & Friends', Icon: Home, color: 'bg-purple-50 text-purple-600 border-purple-200', dot: 'bg-purple-500' };
  }
}

// ─── Page Component ────────────────────────────────────────────────────────────
export const GroupSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wsId = searchParams.get('id') || '';
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try { return teamService.getStoredWorkspaces(); } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>('equal_split');
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Budget cap state
  const [budgetCap, setBudgetCap] = useState('0');
  const [applyMode, setApplyMode] = useState<'permanent' | 'current_month' | 'next_month'>('permanent');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  const defaultUserEmail = (user?.email && !user.email.includes('@hissaby.local')) ? user.email : 'you@hissaby.pk';

  // Load workspaces data
  useEffect(() => {
    setIsLoading(true);
    teamService.getWorkspaces(user?.token, defaultUserEmail).then((data) => {
      if (data && data.length > 0) setWorkspaces(data);
    }).finally(() => setIsLoading(false));
  }, [user]);

  const currentWs = useMemo(
    () => workspaces.find((w) => w.id === wsId) || workspaces[0] || null,
    [workspaces, wsId]
  );

  // Load settings once workspace is ready
  useEffect(() => {
    if (currentWs?.id) {
      setExpenseMode(loadExpenseMode(currentWs.id));
      setBudgetCap(currentWs.total_budget ? currentWs.total_budget.toString() : '0');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      fetch(`${apiUrl}/api/workspaces/${currentWs.id}/invitations`, {
        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.invitations) {
            const mapped = data.invitations.map((inv: any) => ({
              id: inv.id,
              email: inv.invited_email,
              sentAt: inv.created_at,
              workspace_id: currentWs.id
            }));
            setPendingInvites(mapped);
          }
        })
        .catch(() => {});
    }
  }, [currentWs, user]);

  const isOwner = useMemo(() => {
    const rawMembers = currentWs?.members || [];
    const ownerMember = rawMembers.find((m) => m.role === 'owner');
    if (!ownerMember) return true;
    return ownerMember.user_id === user?.uid || ownerMember.email === user?.email;
  }, [currentWs?.members, user]);

  const members = useMemo(() => {
    const raw = currentWs?.members || [];
    if (raw.length > 0) return raw.map((m) => {
      const isMe = m.user_id === user?.uid || (m.role === 'owner' && isOwner);
      return {
        ...m,
        display_name: m.role === 'owner' ? 'You (Creator)' : (m.display_name || 'Member'),
        email: isMe && user?.email && !user.email.includes('@hissaby.local')
          ? user.email
          : ((m.email && m.email !== 'you@hissaby.pk' && !m.email.includes('@hissaby.local')) ? m.email : defaultUserEmail),
      };
    });
    return [{ id: 'm-me', workspace_id: wsId, user_id: user?.uid || 'usr_me', role: 'owner' as const, display_name: 'You (Creator)', email: defaultUserEmail, custom_title: 'You (Creator)', total_spent: 0 }];
  }, [currentWs?.members, wsId, user, defaultUserEmail, isOwner]);


  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Handlers
  const handleExpenseModeChange = (mode: ExpenseMode) => {
    setExpenseMode(mode);
    if (currentWs?.id) saveExpenseMode(currentWs.id, mode);
    showSuccess('Payment split mode updated successfully.');
  };

  const handleUpdateBudgetCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs || isUpdatingBudget) return;
    setIsUpdatingBudget(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workspaces/${currentWs.id}/budget-cap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({
          amount: parseFloat(budgetCap) || 0,
          apply_mode: applyMode,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        showSuccess(`Budget cap successfully updated to ${formatAmount(parseFloat(budgetCap), false, 'Rs ')}!`);
        teamService.getWorkspaces(user?.token, defaultUserEmail).then((data) => {
          if (data && data.length > 0) setWorkspaces(data);
        });
      }
    } catch {
      alert('Failed to update budget cap.');
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleInviteMember = async () => {
    if (!currentWs || !inviteEmail.trim()) return;
    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workspaces/${currentWs.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({ email: emailToInvite }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showSuccess(`Invitation email successfully dispatched to ${emailToInvite}!`);
        const updatedInvite = {
          id: data.invitation.id,
          email: data.invitation.invited_email,
          sentAt: new Date().toISOString(),
          workspace_id: currentWs.id
        };
        setPendingInvites(prev => [updatedInvite, ...prev]);
        setInviteEmail('');
      } else {
        alert(data.error || data.message || 'Failed to send invitation.');
      }
    } catch {
      alert('Failed to send invitation.');
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!currentWs) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workspaces/invitations/${id}`, {
        method: 'DELETE',
        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPendingInvites(prev => prev.filter(inv => inv.id !== id));
        showSuccess('Invitation cancelled successfully.');
      }
    } catch {
      alert('Failed to cancel invitation.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentWs || deleteConfirmText !== currentWs.name || isDeleting) return;
    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/workspaces/${currentWs.id}`, {
        method: 'DELETE',
        headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
      }).catch(() => {});
      navigate('/dashboard/teams', { replace: true });
    } catch {
      navigate('/dashboard/teams', { replace: true });
    } finally { setIsDeleting(false); }
  };

  if (!currentWs && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-600">Group not found</p>
        <button onClick={() => navigate('/dashboard/teams')} className="mt-4 px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold cursor-pointer">← Back to Groups</button>
      </div>
    );
  }

  const themeBadge = getThemeBadge(currentWs?.theme);
  const ThemeIcon = themeBadge.Icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fadeIn">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-5 border-b border-slate-200">
        <button onClick={() => navigate('/dashboard/teams')}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#012456] hover:bg-slate-50 transition-colors cursor-pointer shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          {isLoading ? (
            <div className="w-10 h-10 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
          ) : (
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${themeBadge.color}`}>
              <ThemeIcon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#012456] tracking-tight truncate">
                {currentWs?.name || 'Group Settings'}
              </h1>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${themeBadge.color}`}>
                <ThemeIcon className="w-2.5 h-2.5" /> {themeBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Crown className="w-3 h-3 text-amber-500" />
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Group settings dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-emerald-800">{successMsg}</span></div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── SECTION 1: Group Info Overview ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div>
          <h2 className="text-base font-black text-[#012456] mb-1">Group Details</h2>
          <p className="text-[11px] text-slate-500">Theme classification and financial description.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Group Name</span>
            <p className="text-sm font-black text-[#012456]">{currentWs?.name}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Group Theme</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${themeBadge.color}`}><ThemeIcon className="w-3 h-3" /></div>
              <span className="text-xs font-bold text-slate-700">{themeBadge.label}</span>
            </div>
          </div>
          {currentWs?.description && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</span>
              <p className="text-xs text-slate-700">{currentWs.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Budget Cap Updation ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div>
          <h2 className="text-base font-black text-[#012456] mb-1">Update Budget Cap</h2>
          <p className="text-[11px] text-slate-500">Configure or modify the maximum monthly fund limit for this shared group.</p>
        </div>

        <form onSubmit={handleUpdateBudgetCap} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Monthly Budget Limit (PKR)</label>
            <input
              type="number"
              value={budgetCap}
              onChange={(e) => setBudgetCap(e.target.value)}
              placeholder="e.g. 50000 (0 for no cap)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#5391FE] transition-all"
            />
          </div>

          {/* Budget cap options/questions */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <p className="text-xs font-black text-[#012456] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#5391FE]" />
              <span>How should this budget cap change apply?</span>
            </p>
            <div className="space-y-2">
              {[
                { id: 'permanent', label: 'Apply permanently starting now' },
                { id: 'current_month', label: 'Apply starting from this current month only' },
                { id: 'next_month', label: 'Apply starting from next month' }
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="applyMode"
                    value={opt.id}
                    checked={applyMode === opt.id}
                    onChange={() => setApplyMode(opt.id as any)}
                    className="w-4 h-4 text-[#5391FE] focus:ring-[#5391FE]/20"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingBudget}
            className="px-5 py-3 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-slate-200 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            {isUpdatingBudget ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save Budget Settings</span>
          </button>
        </form>
      </div>

      {/* ── SECTION 3: Payment Split Mode ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div>
          <h2 className="text-base font-black text-[#012456] mb-1">Payment Split Mode</h2>
          <p className="text-[11px] text-slate-500">Configure how expenses logged by other members are divided.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Equal Split */}
          <button onClick={() => handleExpenseModeChange('equal_split')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'equal_split' ? 'border-[#5391FE] bg-blue-50/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <SplitSquareVertical className="w-4 h-4 text-[#5391FE]" />
              {expenseMode === 'equal_split' && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs font-black text-[#012456]">Equal Split</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Divided equally among all members.</p>
          </button>

          {/* Single Payer */}
          <button onClick={() => handleExpenseModeChange('single_payer')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'single_payer' ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <Crown className="w-4 h-4 text-amber-500" />
              {expenseMode === 'single_payer' && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs font-black text-amber-800">Single Payer</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Philanthropist covers all group bills.</p>
          </button>

          {/* Custom Percentage */}
          <button onClick={() => handleExpenseModeChange('custom_percent')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'custom_percent' ? 'border-purple-400 bg-purple-50/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              {expenseMode === 'custom_percent' && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs font-black text-purple-800">Custom %</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Customize per-member contribution shares.</p>
          </button>
        </div>
      </div>

      {/* ── SECTION 4: Active Members & Invites ─────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-base font-black text-[#012456] mb-1">Members & Invitations</h2>
          <p className="text-[11px] text-slate-500">Invite new colleagues and view outstanding split group users.</p>
        </div>

        {/* Invite Form */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">Invite by Email</label>
          <div className="flex gap-2">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. partner@example.com"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
            />
            <button onClick={handleInviteMember} disabled={!inviteEmail.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#5391FE] disabled:bg-slate-100 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer">
              <Mail className="w-3.5 h-3.5" /><span>Invite</span>
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-[#012456] mb-2">Current Members ({members.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div key={m.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#012456] text-white flex items-center justify-center text-xs font-black shrink-0">
                    {(m.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{m.display_name || m.email}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                  </div>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md uppercase font-bold shrink-0 border ${m.role === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-600">Pending invitations ({pendingInvites.length})</h3>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-amber-800 truncate">{inv.email}</p>
                  </div>
                  <button onClick={() => handleCancelInvite(inv.id)} className="text-[10px] font-bold text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer">Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 5: Danger Zone ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-rose-600 mb-1">Danger Zone</h2>
          <p className="text-[11px] text-slate-500 font-semibold">These actions are permanent and cannot be undone.</p>
        </div>

        {isOwner ? (
          <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/40 space-y-3">
            <div>
              <p className="text-xs font-black text-rose-700">Delete This Group</p>
              <p className="text-[10px] text-rose-600 leading-relaxed mt-0.5">Delete all associated transactions, split histories, and members. Enter group name below to confirm.</p>
            </div>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${currentWs?.name}" to confirm`}
              className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs"
            />
            <button
              onClick={handleDeleteGroup}
              disabled={deleteConfirmText !== currentWs?.name || isDeleting}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Permanently Delete Group</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/40 space-y-2">
            <p className="text-xs font-black text-orange-700">Leave Group</p>
            <p className="text-[10px] text-orange-600">Remove yourself from this shared group ledger.</p>
            <button className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer">Leave Group</button>
          </div>
        )}
      </div>

    </div>
  );
};

export default GroupSettingsPage;
