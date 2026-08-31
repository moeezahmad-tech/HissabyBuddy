import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, ShoppingBag, Briefcase, Home, UserPlus, Receipt,
  CheckCircle2, RefreshCw, X, PieChart, Repeat, Wallet, TrendingDown,
  ArrowDownLeft, CalendarClock, AlertCircle, Crown, SplitSquareVertical,
  Settings2, Check, Trash2, Mail, LogOut, ShieldAlert, Info,
  Bell, Send, Share2, Copy, MessageSquare, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { teamService } from '../services/teamService';
import type { Workspace } from '../services/teamService';

// ─── Types ────────────────────────────────────────────────────────────────────
type ExpenseMode = 'equal_split' | 'single_payer' | 'custom_percent';
type TabId = 'overview' | 'members' | 'expenses' | 'recurring';
type SettingsTabId = 'info' | 'payment' | 'members' | 'danger';

export interface SettlementTransaction {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  fromMemberEmail?: string;
  toMemberId: string;
  toMemberName: string;
  toMemberEmail?: string;
  amount: number;
}

interface RecurringGroupPayment {
  id: string;
  workspace_id: string;
  description: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'quarterly';
  start_date: string;
  category: string;
}

interface PendingInvite {
  id: string;
  email: string;
  sentAt: string;
  workspace_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RECURRING_KEY = (wsId: string) => `hissaby_recurring_group_${wsId}`;
const INVITES_KEY = (wsId: string) => `hissaby_invites_${wsId}`;

function loadRecurring(wsId: string): RecurringGroupPayment[] {
  try { const raw = localStorage.getItem(RECURRING_KEY(wsId)); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveRecurring(wsId: string, items: RecurringGroupPayment[]) {
  localStorage.setItem(RECURRING_KEY(wsId), JSON.stringify(items));
}
function loadExpenseMode(wsId: string): ExpenseMode {
  try { const raw = localStorage.getItem(`hissaby_expense_mode_${wsId}`); if (raw === 'single_payer' || raw === 'custom_percent') return raw; }
  catch {}
  return 'equal_split';
}
function saveExpenseMode(wsId: string, mode: ExpenseMode) {
  localStorage.setItem(`hissaby_expense_mode_${wsId}`, mode);
}
function loadInvites(wsId: string): PendingInvite[] {
  try { const raw = localStorage.getItem(INVITES_KEY(wsId)); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveInvites(wsId: string, items: PendingInvite[]) {
  localStorage.setItem(INVITES_KEY(wsId), JSON.stringify(items));
}
function clearDashboardCache() {
  try { localStorage.removeItem('hissaby_cached_metrics'); } catch {}
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const TeamsGroupsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try { return teamService.getStoredWorkspaces(); } catch { return []; }
  });
  const [selectedWsId, setSelectedWsId] = useState<string>(() => {
    try { const init = teamService.getStoredWorkspaces(); return init[0]?.id || ''; } catch { return ''; }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // ── Modal open states ──────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('info');

  // ── UI feedback ───────────────────────────────────────────────────────────
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);

  // ── Settings state ─────────────────────────────────────────────────────────
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>('equal_split');
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Recurring state ────────────────────────────────────────────────────────
  const [recurringItems, setRecurringItems] = useState<RecurringGroupPayment[]>([]);
  const [newRecurringForm, setNewRecurringForm] = useState({
    description: '', amount: '', frequency: 'monthly' as 'monthly' | 'weekly' | 'quarterly',
    start_date: new Date().toISOString().split('T')[0], category: 'Subscription',
  });

  // ── Form states ────────────────────────────────────────────────────────────
  const [newWsForm, setNewWsForm] = useState({
    name: '', theme: 'family' as 'family' | 'project' | 'friends' | 'team',
    description: '', budget: '', currency: 'PKR', currency_symbol: 'Rs ',
    is_temporary: false,
  });
  const [newMemberForm, setNewMemberForm] = useState({
    display_name: '', email: '', role: 'member' as 'owner' | 'admin' | 'member',
    custom_title: '', spending_limit: '',
  });
  const [newExpenseForm, setNewExpenseForm] = useState({
    amount: '', category: 'Groceries', description: '', payer_id: '',
  });

  const defaultUserEmail = (user?.email && !user.email.includes('@hissaby.local')) ? user.email : 'you@hissaby.pk';

  // ── Load workspaces ────────────────────────────────────────────────────────
  const loadWorkspaces = async () => {
    setIsRefreshing(true);
    try {
      const data = await teamService.getWorkspaces(user?.token, defaultUserEmail);
      if (data && data.length > 0) {
        setWorkspaces(data);
        if (!selectedWsId || !data.some((w) => w.id === selectedWsId)) setSelectedWsId(data[0].id);
      }
    } catch { /* keep local */ } finally { setIsRefreshing(false); }
  };

  useEffect(() => { loadWorkspaces(); }, [user]);

  // ── Current workspace ──────────────────────────────────────────────────────
  const currentWs = useMemo(
    () => workspaces.find((w) => w.id === selectedWsId) || workspaces[0] || null,
    [workspaces, selectedWsId]
  );

  // ── Load per-workspace data on selection change ────────────────────────────
  useEffect(() => {
    if (currentWs?.id) {
      setExpenseMode(loadExpenseMode(currentWs.id));
      setRecurringItems(loadRecurring(currentWs.id));
      setPendingInvites(loadInvites(currentWs.id));
    }
  }, [currentWs?.id]);

  // ── Derived members & metrics ──────────────────────────────────────────────
  const rawMembers = currentWs?.members || [];
  const members = useMemo(() => {
    const base = rawMembers.length > 0 ? rawMembers : [{
      id: 'm-me', workspace_id: currentWs?.id || '', user_id: user?.uid || 'usr_me',
      role: 'owner' as const, display_name: user?.displayName || 'You (Creator)', email: defaultUserEmail,
      custom_title: 'You (Creator)', total_spent: 0,
    }];
    return base.map((m) => {
      const isMe = m.user_id === user?.uid;
      const name = isMe && user?.displayName ? user.displayName : (m.display_name || 'Member');
      return {
        ...m,
        display_name: isMe ? `${name} (You)` : name,
        role: m.role || 'owner',
        email: isMe && user?.email && !user.email.includes('@hissaby.local')
          ? user.email
          : ((m.email && !m.email.includes('@hissaby.local')) ? m.email : defaultUserEmail),
        custom_title: m.role === 'owner' ? (m.custom_title || 'You (Creator)') : m.custom_title,
      };
    });
  }, [rawMembers, currentWs, defaultUserEmail, user]);

  // ── Is the current user the group owner? ──────────────────────────────────
  const isOwner = useMemo(() => {
    const ownerMember = members.find((m) => m.role === 'owner');
    if (!ownerMember) return true; // fallback — creator is always owner
    return ownerMember.email === defaultUserEmail || ownerMember.user_id === user?.uid;
  }, [members, defaultUserEmail, user]);

  const spendings = currentWs?.spendings || [];
  const totalSpent = spendings.reduce((acc, s) => acc + s.amount, 0);
  const totalBudget = currentWs?.total_budget || 0;
  const remaining = totalBudget - totalSpent;
  const budgetUsagePercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  const splitSummary = useMemo(() => {
    const n = members.length;
    const fairShare = n > 0 ? totalSpent / n : 0;
    const memberPaidMap = members.map((m) => {
      const paid = spendings
        .filter((s) => s.payer_id === m.user_id || s.payer_id === m.id || s.user_id === m.user_id)
        .reduce((sum, s) => sum + s.amount, 0);
      return { member: m, paid, net: paid - fairShare };
    });
    return { fairShare, memberPaidMap };
  }, [members, spendings, totalSpent]);

  // ── Calculate pairwise debts (Who pays Whom) ──────────────────────────────
  const settlementTransactions = useMemo<SettlementTransaction[]>(() => {
    if (expenseMode === 'single_payer' || members.length < 2) return [];
    const debtors = splitSummary.memberPaidMap
      .filter((m) => m.net < -0.5)
      .map((m) => ({
        id: m.member.id || m.member.user_id,
        name: m.member.display_name || m.member.email || 'Member',
        email: m.member.email,
        amount: Math.abs(m.net),
      }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = splitSummary.memberPaidMap
      .filter((m) => m.net > 0.5)
      .map((m) => ({
        id: m.member.id || m.member.user_id,
        name: m.member.display_name || m.member.email || 'Member',
        email: m.member.email,
        amount: m.net,
      }))
      .sort((a, b) => b.amount - a.amount);

    const results: SettlementTransaction[] = [];
    let d = 0;
    let c = 0;
    const dList = debtors.map((i) => ({ ...i }));
    const cList = creditors.map((i) => ({ ...i }));

    while (d < dList.length && c < cList.length) {
      const debtor = dList[d];
      const creditor = cList[c];
      const settleAmt = Math.min(debtor.amount, creditor.amount);

      if (settleAmt > 0.5) {
        results.push({
          id: `stl-${d}-${c}-${debtor.id}`,
          fromMemberId: debtor.id,
          fromMemberName: debtor.name,
          fromMemberEmail: debtor.email,
          toMemberId: creditor.id,
          toMemberName: creditor.name,
          toMemberEmail: creditor.email,
          amount: Math.round(settleAmt),
        });
      }

      debtor.amount -= settleAmt;
      creditor.amount -= settleAmt;

      if (debtor.amount <= 0.5) d++;
      if (creditor.amount <= 0.5) c++;
    }

    return results;
  }, [splitSummary, expenseMode, members.length]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleSendSettlementEmails = async () => {
    if (!currentWs || settlementTransactions.length === 0 || isSendingNotifications) return;
    setIsSendingNotifications(true);
    try {
      const payload = settlementTransactions.map((tx) => ({
        debtor_name: tx.fromMemberName,
        debtor_email: tx.fromMemberEmail,
        creditor_name: tx.toMemberName,
        creditor_email: tx.toMemberEmail,
        amount: tx.amount,
        notes: `Settlement for ${currentWs.name} shared expenses`,
      }));

      const res = await teamService.notifySettlements(currentWs.id, payload, currentWs.name, user?.token);
      showSuccess(`Payment reminder notifications dispatched for ${res.dispatched_count || payload.length} member(s)!`);
      setIsNotifyModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notifications.');
    } finally {
      setIsSendingNotifications(false);
    }
  };

  const handleShareWhatsApp = (singleTx?: SettlementTransaction) => {
    if (!currentWs) return;
    let text = '';
    if (singleTx) {
      text = `*Payment Reminder for ${currentWs.name}*\n` +
        `Salam ${singleTx.fromMemberName},\n` +
        `You have a shared expense balance of *Rs ${singleTx.amount.toLocaleString()}* to pay to *${singleTx.toMemberName}*.\n` +
        `Please transfer when convenient. Thanks!`;
    } else {
      text = `📊 *${currentWs.name} - Settlement Summary*\n` +
        `Total Group Spending: Rs ${totalSpent.toLocaleString()}\n\n` +
        `*Dues & Settlement Required:*\n` +
        settlementTransactions.map((tx, idx) => `${idx + 1}. *${tx.fromMemberName}* pays *${tx.toMemberName}* → Rs ${tx.amount.toLocaleString()}`).join('\n') +
        `\n\nPlease transfer via JazzCash/EasyPaisa/Bank Transfer and confirm in Hissaby Buddy!`;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = () => {
    if (!currentWs) return;
    const text = `📊 ${currentWs.name} - Expense Split Breakdown\n` +
      `Total Spent: Rs ${totalSpent.toLocaleString()}\n\n` +
      `Settlements:\n` +
      settlementTransactions.map((tx) => `• ${tx.fromMemberName} owes ${tx.toMemberName}: Rs ${tx.amount.toLocaleString()}`).join('\n') +
      `\nGenerated by Hissaby Buddy.`;
    navigator.clipboard.writeText(text);
    showSuccess('Settlement breakdown copied to clipboard!');
  };

  const handleExpenseModeChange = (mode: ExpenseMode) => {
    setExpenseMode(mode);
    if (currentWs?.id) saveExpenseMode(currentWs.id, mode);
  };

  const handleInviteByEmail = () => {
    if (!currentWs || !inviteEmail.trim()) return;
    const newInvite: PendingInvite = {
      id: `inv-${Date.now()}`, email: inviteEmail.trim().toLowerCase(),
      sentAt: new Date().toISOString(), workspace_id: currentWs.id,
    };
    const updated = [...pendingInvites, newInvite];
    setPendingInvites(updated);
    saveInvites(currentWs.id, updated);
    setInviteEmail('');
  };

  const handleCancelInvite = (id: string) => {
    if (!currentWs) return;
    const updated = pendingInvites.filter((i) => i.id !== id);
    setPendingInvites(updated);
    saveInvites(currentWs.id, updated);
  };

  const handleDeleteGroup = async () => {
    if (!currentWs || deleteConfirmText !== currentWs.name || isDeleting) return;
    setIsDeleting(true);
    const targetWs = currentWs;
    try {
      await teamService.deleteWorkspace(targetWs.id, user?.token);
      const remaining = workspaces.filter((w) => w.id !== targetWs.id);
      setWorkspaces(remaining);
      setSelectedWsId(remaining.length > 0 ? remaining[0].id : '');
      setIsSettingsModalOpen(false);
      setDeleteConfirmText('');
      showSuccess(`Group "${targetWs.name}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete group.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCustomCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating || !newWsForm.name.trim()) return;
    setIsCreating(true);
    setCreationError(null);
    try {
      const created = await teamService.createWorkspace(
        { name: newWsForm.name.trim(), theme: newWsForm.theme, description: newWsForm.description.trim(), currency: newWsForm.currency, currency_symbol: newWsForm.currency_symbol, is_temporary: newWsForm.is_temporary },
        user?.token, { email: defaultUserEmail, displayName: 'You (Creator)' }
      );
      const budgetVal = parseFloat(newWsForm.budget);
      if (!isNaN(budgetVal) && budgetVal > 0) {
        await teamService.createBudget(created.id, {
          name: `${newWsForm.name} Budget`, amount: budgetVal, period: 'monthly', alert_threshold_percent: 80,
        }, user?.token).catch(() => {});
      }
      await loadWorkspaces();
      setSelectedWsId(created.id);
      setIsCreateModalOpen(false);
      setNewWsForm({ name: '', theme: 'family', description: '', budget: '', currency: 'PKR', currency_symbol: 'Rs ', is_temporary: false });
      showSuccess(`Group "${created.name}" successfully created!`);
    } catch (err: any) {
      setCreationError(err.message || 'Failed to create group. Please try again.');
    } finally { setIsCreating(false); }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs || !newMemberForm.email.trim()) return;
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await teamService.inviteMember(
        currentWs.id,
        newMemberForm.email.trim(),
        newMemberForm.role || 'member',
        user?.token
      );
      const invitedEmail = newMemberForm.email.trim();
      setIsMemberModalOpen(false);
      setNewMemberForm({ display_name: '', email: '', role: 'member', custom_title: '', spending_limit: '' });
      showSuccess(`Invitation email successfully dispatched to ${invitedEmail}!`);
    } catch (err: any) {
      setMemberError(err.message || 'Failed to dispatch invitation. Please try again.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs || !newExpenseForm.amount || !newExpenseForm.description.trim() || isAddingExpense) return;
    setIsAddingExpense(true);
    try {
      const amt = parseFloat(newExpenseForm.amount);
      const payer = members.find((m) => m.user_id === newExpenseForm.payer_id || m.id === newExpenseForm.payer_id) || members[0];
      await new Promise((resolve) => setTimeout(resolve, 500));
      await teamService.addSpending(currentWs.id, {
        amount: amt, category: newExpenseForm.category, description: newExpenseForm.description.trim(),
        payer_id: payer ? payer.user_id : 'usr_me', payer_name: payer ? payer.display_name : 'You',
      }, user?.token);
      clearDashboardCache();
      await loadWorkspaces();
      setIsExpenseModalOpen(false);
      setNewExpenseForm({ amount: '', category: 'Groceries', description: '', payer_id: '' });
      showSuccess('Expense logged and dashboard totals updated!');
    } catch (err: any) {
      alert(err.message || 'Failed to log expense');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs || !newRecurringForm.description.trim() || !newRecurringForm.amount || isAddingRecurring) return;
    setIsAddingRecurring(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const item: RecurringGroupPayment = {
        id: `rec-${Date.now()}`, workspace_id: currentWs.id,
        description: newRecurringForm.description.trim(), amount: parseFloat(newRecurringForm.amount),
        frequency: newRecurringForm.frequency, start_date: newRecurringForm.start_date,
        category: newRecurringForm.category,
      };
      const updated = [...recurringItems, item];
      setRecurringItems(updated);
      saveRecurring(currentWs.id, updated);
      setIsRecurringModalOpen(false);
      setNewRecurringForm({ description: '', amount: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], category: 'Subscription' });
      showSuccess(`Recurring "${item.description}" added!`);
    } finally {
      setIsAddingRecurring(false);
    }
  };

  const handleDeleteRecurring = (id: string) => {
    if (!currentWs) return;
    const updated = recurringItems.filter((r) => r.id !== id);
    setRecurringItems(updated);
    saveRecurring(currentWs.id, updated);
  };

  // ─── Theme helpers ─────────────────────────────────────────────────────────
  const getThemeBadge = (theme?: string) => {
    switch (theme) {
      case 'family': return { label: 'Family & Groceries', icon: ShoppingBag, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', bg: 'bg-emerald-50 border-emerald-100' };
      case 'project': return { label: 'Project & Freelance', icon: Briefcase, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', bg: 'bg-blue-50 border-blue-100' };
      default: return { label: 'Roommates & Friends', icon: Home, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', bg: 'bg-purple-50 border-purple-100' };
    }
  };

  const freqLabel = { monthly: 'Monthly', weekly: 'Weekly', quarterly: 'Quarterly' };
  const freqColor = {
    monthly: 'bg-blue-50 text-blue-700 border-blue-200',
    weekly: 'bg-purple-50 text-purple-700 border-purple-200',
    quarterly: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  // ─── Zero State ─────────────────────────────────────────────────────────────
  if (!currentWs || workspaces.length === 0) {
    return (
      <div className="space-y-8 pb-16 w-full animate-fadeIn">
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{actionSuccessMsg}</span></div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <div className="text-center max-w-2xl mx-auto pt-6 pb-2">
          <div className="w-14 h-14 rounded-3xl bg-blue-50 border border-blue-200 text-[#5391FE] flex items-center justify-center mx-auto mb-4 shadow-xs"><Users className="w-7 h-7" /></div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#012456] tracking-tight">Shared Groups & Teams</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">Manage household budgets, grocery splits, and shared project expenses.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {[
            { name: 'Family Groceries & Rashan', theme: 'family' as const, budget: 60000, desc: 'Monthly household ration, milk, and utility bills.', Icon: ShoppingBag, color: 'emerald', label: 'Use Family Template →' },
            { name: 'Client Project Team', theme: 'project' as const, budget: 100000, desc: 'Shared project expenses, domain renewals, and cloud bills.', Icon: Briefcase, color: 'blue', label: 'Use Project Template →' },
            { name: 'Flat Roommates', theme: 'friends' as const, budget: 45000, desc: 'Shared apartment rent, WiFi internet, and flat maintenance.', Icon: Home, color: 'purple', label: 'Use Flatmates Template →' },
          ].map((t) => (
            <div key={t.name} className={`p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-[#5391FE] hover:shadow-md transition-all flex flex-col justify-between space-y-4`}>
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-2xl bg-${t.color}-50 text-${t.color}-600 flex items-center justify-center`}><t.Icon className="w-5 h-5" /></div>
                <h3 className="text-base font-black text-[#012456]">{t.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                <div className="pt-2 text-xs font-bold text-slate-700">Suggested Pool: <span className={`text-${t.color}-600`}>Rs {(t.budget / 1000).toFixed(0)}k{t.budget >= 60000 ? '/mo' : ''}</span></div>
              </div>
              <button onClick={() => navigate(`/dashboard/teams/create?theme=${t.theme}&budget=${t.budget}&name=${encodeURIComponent(t.name)}`)}
                className={`w-full py-2.5 rounded-xl bg-${t.color}-50 hover:bg-${t.color}-100 text-${t.color}-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2`}>
                <span>{t.label}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="text-center pt-4">
          <button onClick={() => navigate('/dashboard/teams/create')}
            className="px-6 py-3 rounded-2xl bg-[#012456] hover:bg-[#02337a] text-white text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /><span>Create Collaborative Group (Complete Setup Page)</span>
          </button>
        </div>
        {renderCreateModal()}
      </div>
    );
  }

  const themeBadge = getThemeBadge(currentWs.theme);
  const ThemeIcon = themeBadge.icon;

  // ─── Main Workspace View ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16 w-full animate-fadeIn">

      {/* ── Success Alert ─────────────────────────────────────────────────── */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{actionSuccessMsg}</span></div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Group Header Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${themeBadge.color}`}>
              <ThemeIcon className="w-3.5 h-3.5" /><span>{themeBadge.label}</span>
            </span>
            {currentWs.theme_settings?.is_temporary && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span>Temporary Split</span>
              </span>
            )}
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#5391FE] font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-[#012456] tracking-tight">{currentWs.name}</h2>
            {workspaces.length > 1 && (
              <select aria-label="Switch group" value={selectedWsId} onChange={(e) => setSelectedWsId(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-700 cursor-pointer shadow-2xs">
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
          </div>
          {currentWs.description && <p className="text-xs text-slate-500 mt-0.5">{currentWs.description}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /><span>Add Expense</span>
          </button>
          <button onClick={() => setIsMemberModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
            <UserPlus className="w-3.5 h-3.5 text-slate-500" /><span>Add Member</span>
          </button>
          {/* Settings → navigates to full Settings page */}
          {currentWs && (
            <button
              onClick={() => navigate(`/dashboard/teams/settings?id=${currentWs?.id || ''}`)}
              title="Group Settings"
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#012456] hover:bg-slate-50 hover:border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Settings</span>
            </button>
          )}
          <button onClick={() => navigate('/dashboard/teams/create')} title="Create new group with full configuration"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#012456] hover:bg-slate-50 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Budget Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Budget */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#012456] to-[#1a3d7c] text-white shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><Wallet className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Total Budget</span>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{totalBudget > 0 ? formatAmount(totalBudget, false, 'Rs ') : 'Rs 0'}</p>
          <span className="text-[11px] text-white/60 mt-1 block">{totalBudget > 0 ? 'Group monthly pool cap' : 'No budget cap set (Spent Only)'}</span>
        </div>

        {/* Total Spending */}
        <div className={`p-5 rounded-3xl shadow-sm border ${totalBudget > 0 && budgetUsagePercent > 85 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${totalBudget > 0 && budgetUsagePercent > 85 ? 'bg-rose-100' : 'bg-slate-50 border border-slate-200'}`}>
              <TrendingDown className={`w-4 h-4 ${totalBudget > 0 && budgetUsagePercent > 85 ? 'text-rose-600' : 'text-slate-500'}`} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spending</span>
          </div>
          <p className={`text-2xl font-black tracking-tight ${totalBudget > 0 && budgetUsagePercent > 85 ? 'text-rose-700' : 'text-[#012456]'}`}>
            {formatAmount(totalSpent, false, 'Rs ')}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {spendings.length} shared {spendings.length === 1 ? 'expense' : 'expenses'} logged
            {totalBudget > 0 && ` • ${budgetUsagePercent}% of budget`}
          </span>
          {totalBudget > 0 && (
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${budgetUsagePercent > 85 ? 'bg-rose-500' : 'bg-[#5391FE]'}`} style={{ width: `${budgetUsagePercent}%` }} />
            </div>
          )}
        </div>

        {/* Remaining */}
        <div className={`p-5 rounded-3xl shadow-sm border ${totalBudget === 0 ? 'bg-white border-slate-200' : remaining >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${totalBudget === 0 ? 'bg-slate-50 border border-slate-200' : remaining >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              <ArrowDownLeft className={`w-4 h-4 ${totalBudget === 0 ? 'text-slate-400' : remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining</span>
          </div>
          <p className={`text-2xl font-black tracking-tight ${totalBudget === 0 ? 'text-slate-500' : remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalBudget > 0 ? formatAmount(Math.abs(remaining), false, 'Rs ') : 'Unlimited'}
          </p>
          <span className={`text-[11px] mt-1 block font-semibold ${totalBudget === 0 ? 'text-slate-400' : remaining >= 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'}`}>
            {totalBudget === 0 ? 'Tracking spent funds only' : remaining >= 0 ? 'Budget still available' : '⚠ Over budget!'}
          </span>
        </div>
      </div>

      {/* ── Active Payment Mode Indicator (read-only) ─────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 w-fit">
        {expenseMode === 'equal_split' && <><SplitSquareVertical className="w-3.5 h-3.5 text-[#5391FE]" /><span className="text-xs font-bold text-slate-700">Equal Split mode active</span></>}
        {expenseMode === 'single_payer' && <><Crown className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-bold text-slate-700">Single Payer mode active</span></>}
        {expenseMode === 'custom_percent' && <><PieChart className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs font-bold text-slate-700">Custom % mode active</span></>}
        {isOwner && (
          <button onClick={() => navigate(`/dashboard/teams/settings?id=${currentWs?.id || ''}&tab=payment`)}
            className="text-[10px] font-bold text-[#5391FE] hover:underline cursor-pointer ml-1">Change →</button>
        )}
      </div>

      {/* ── Tab Switcher ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 w-fit overflow-x-auto">
        {([
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'members', label: `Members (${members.length})`, icon: Users },
          { id: 'expenses', label: `Expenses (${spendings.length})`, icon: Receipt },
          { id: 'recurring', label: `Recurring (${recurringItems.length})`, icon: Repeat },
        ] as { id: TabId; label: string; icon: any }[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${isActive ? 'bg-white text-[#012456] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              <Icon className="w-3.5 h-3.5" /><span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Overview ───────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-[#012456]">Member Ledger &amp; Balances</h4>
              <p className="text-[11px] text-slate-400">Track total spending, fair shares, and outstanding payments.</p>
            </div>
            {settlementTransactions.length > 0 && expenseMode !== 'single_payer' && (
              <button
                onClick={() => setIsNotifyModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#012456] hover:bg-[#02337a] text-white text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Bell className="w-3.5 h-3.5 text-[#5391FE] animate-pulse" />
                <span>Notify Members ({settlementTransactions.length})</span>
              </button>
            )}
          </div>

          {expenseMode === 'single_payer' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Single Payer Mode Active</p>
                <p className="text-[11px] text-amber-700 mt-0.5">All <strong>{formatAmount(totalSpent, false, 'Rs ')}</strong> of shared expenses are covered by one sponsor. No individual settlements required.</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {splitSummary.memberPaidMap.map((item) => (
              <div key={item.member.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#012456] text-white flex items-center justify-center text-xs font-black shrink-0">
                    {(item.member.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.member.display_name || item.member.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {expenseMode === 'single_payer' ? 'Covered by sponsor — no share required'
                        : `Paid: ${formatAmount(item.paid, false, 'Rs ')} • Share: ${formatAmount(splitSummary.fairShare, false, 'Rs ')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {expenseMode === 'single_payer' ? (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Crown className="w-3 h-3" /> Sponsored</span>
                  ) : item.net > 1 ? (
                    <span className="text-xs font-black text-emerald-600">Gets Back {formatAmount(item.net, false, 'Rs ')}</span>
                  ) : item.net < -1 ? (
                    <span className="text-xs font-black text-rose-600">Owes {formatAmount(Math.abs(item.net), false, 'Rs ')}</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Settled Up</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Settlement Directions (Who Pays Whom) ────────────────────────── */}
          {settlementTransactions.length > 0 && expenseMode !== 'single_payer' && (
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3 mt-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#5391FE] text-white flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#012456]">Payment Directions (Who Pays Whom)</h5>
                    <p className="text-[10px] text-slate-500">Minimal required transfers to settle all shared dues</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotifyModalOpen(true)}
                  className="text-xs font-black text-[#5391FE] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Open Notify Modal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {settlementTransactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-white rounded-xl border border-blue-100/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="text-rose-700 font-black truncate">{tx.fromMemberName}</span>
                        <span className="text-slate-400 font-normal">pays</span>
                        <span className="text-emerald-700 font-black truncate">{tx.toMemberName}</span>
                      </div>
                      <span className="text-sm font-black text-[#012456] block mt-0.5">
                        {formatAmount(tx.amount, false, 'Rs ')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleShareWhatsApp(tx)}
                      title="Remind on WhatsApp"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Members ────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#012456]">Active Group Members</h4>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button onClick={() => navigate(`/dashboard/teams/settings?id=${currentWs?.id || ''}&tab=members`)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Mail className="w-3.5 h-3.5" /><span>Invite</span>
                </button>
              )}
              <button onClick={() => setIsMemberModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#5391FE] text-white text-xs font-bold shadow-xs hover:bg-[#437de0] transition-colors cursor-pointer flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /><span>Add Member</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {members.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#012456] text-white flex items-center justify-center text-xs font-black shrink-0">
                      {(m.display_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">{m.display_name || m.email}</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold shrink-0 ml-1 ${m.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' : m.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    {m.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                {m.custom_title && <span className="text-[10px] text-blue-600 font-semibold block">{m.custom_title}</span>}
                {m.spending_limit && <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">Limit: {formatAmount(m.spending_limit, false, 'Rs ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: Shared Expenses ────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#012456]">Group Shared Expenses</h4>
            <button onClick={() => setIsExpenseModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#5391FE] text-white text-xs font-bold shadow-xs hover:bg-[#437de0] transition-colors cursor-pointer flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /><span>Add Expense</span>
            </button>
          </div>
          {spendings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">No shared expenses recorded for this group yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {spendings.map((s, idx) => (
                <div key={s.id || `spending-${idx}`} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{s.description}</p>
                    <p className="text-[10px] text-slate-400">Paid by <span className="font-semibold text-slate-600">{s.payer_name || 'Member'}</span> • {s.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#012456]">{formatAmount(s.amount, false, 'Rs ')}</span>
                    <span className="block text-[9px] text-slate-400">{new Date(s.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Recurring Payments ─────────────────────────────────────── */}
      {activeTab === 'recurring' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-[#012456]">Group Recurring Payments</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Netflix, hosting, subscriptions, rent — fixed group costs.</p>
            </div>
            <button onClick={() => setIsRecurringModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#5391FE] text-white text-xs font-bold shadow-xs hover:bg-[#437de0] transition-colors cursor-pointer flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /><span>Add Recurring</span>
            </button>
          </div>
          {recurringItems.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center"><CalendarClock className="w-6 h-6 text-slate-300" /></div>
              <div><p className="text-xs font-bold text-slate-600">No recurring payments yet</p><p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">Add Netflix, Spotify, cloud hosting, monthly rent — any fixed group payment.</p></div>
              <button onClick={() => setIsRecurringModalOpen(true)} className="px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold cursor-pointer hover:bg-[#437de0] transition-colors">+ Add First Recurring Payment</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#5391FE]">Total Monthly Commitment</span>
                <span className="text-sm font-black text-[#012456]">
                  {formatAmount(recurringItems.reduce((acc, r) => { if (r.frequency === 'monthly') return acc + r.amount; if (r.frequency === 'weekly') return acc + r.amount * 4.33; if (r.frequency === 'quarterly') return acc + r.amount / 3; return acc; }, 0), false, 'Rs ')}
                  <span className="text-[10px] font-bold text-slate-400">/mo</span>
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {recurringItems.map((r) => (
                  <div key={r.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0"><Repeat className="w-4 h-4 text-[#5391FE]" /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{r.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold ${freqColor[r.frequency]}`}>{freqLabel[r.frequency]}</span>
                          <span className="text-[10px] text-slate-400">{r.category} • Since {new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-[#012456] block">{formatAmount(r.amount, false, 'Rs ')}</span>
                        <span className="text-[9px] text-slate-400">per {r.frequency.replace('ly', '')}</span>
                      </div>
                      <button onClick={() => handleDeleteRecurring(r.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer" title="Remove"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── All Modals ────────────────────────────────────────────────────── */}
      {renderCreateModal()}
      {renderMemberModal()}
      {renderExpenseModal()}
      {renderRecurringModal()}
      {renderSettingsModal()}
      {renderNotifyModal()}
    </div>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // MODAL RENDERERS
  // ───────────────────────────────────────────────────────────────────────────

  function renderCreateModal() {
    if (!isCreateModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-black text-[#012456]">Create Collaborative Group</h3>
            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleCustomCreate} className="space-y-3.5">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Group Name</label>
              <input type="text" required value={newWsForm.name} onChange={(e) => setNewWsForm({ ...newWsForm, name: e.target.value })} placeholder="e.g. Model Town Grocery Pool" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Theme / Type</label>
              <select value={newWsForm.theme} onChange={(e) => setNewWsForm({ ...newWsForm, theme: e.target.value as any })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer">
                <option value="family">Family &amp; Groceries</option><option value="project">Freelance / Client Project</option>
                <option value="friends">Roommates &amp; Flat Bills</option><option value="team">Team / Department</option>
              </select></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Initial Monthly Budget Pool (PKR)</label>
              <input type="number" value={newWsForm.budget} onChange={(e) => setNewWsForm({ ...newWsForm, budget: e.target.value })} placeholder="e.g. 50000" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
              <textarea value={newWsForm.description} onChange={(e) => setNewWsForm({ ...newWsForm, description: e.target.value })} placeholder="e.g. Shared household food, groceries and utilities" rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none" /></div>
            
            {/* Is Temporary Quick Group Toggle */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Temporary Quick Group</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">For one-off splits like dining out, trips, or temporary bills.</span>
              </div>
              <input
                type="checkbox"
                checked={newWsForm.is_temporary}
                onChange={(e) => setNewWsForm({ ...newWsForm, is_temporary: e.target.checked })}
                className="w-4.5 h-4.5 rounded-md text-[#5391FE] border-slate-300 focus:ring-[#5391FE]/20 cursor-pointer"
              />
            </div>

            {creationError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{creationError}</div>}
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={isCreating} onClick={() => { setCreationError(null); setIsCreateModalOpen(false); }} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isCreating} className="flex-1 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-[#5391FE]/60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                {isCreating ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Creating...</span></> : <span>Create Group</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderNotifyModal() {
    if (!isNotifyModalOpen || !currentWs) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#012456]">Notify Members &amp; Settle Dues</h3>
                <p className="text-[11px] text-slate-400">Send direct payment shares and breakdown to all group participants.</p>
              </div>
            </div>
            <button onClick={() => setIsNotifyModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Group Overview Quick Stats */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Group Spending</span>
              <span className="text-sm font-black text-[#012456] block mt-0.5">{formatAmount(totalSpent, false, 'Rs ')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Pending Settlements</span>
              <span className="text-sm font-black text-rose-600 block mt-0.5">{settlementTransactions.length} Transaction(s)</span>
            </div>
          </div>

          {/* Settlement Transactions List */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-700 block">Required Payments (Who Pays Whom)</span>
            {settlementTransactions.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-400">
                All balances are currently settled up! No payments required.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {settlementTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="text-rose-700 font-black truncate">{tx.fromMemberName}</span>
                        <span className="text-slate-400 font-normal">owes</span>
                        <span className="text-emerald-700 font-black truncate">{tx.toMemberName}</span>
                      </div>
                      <span className="text-sm font-black text-[#012456] block mt-0.5">
                        {formatAmount(tx.amount, false, 'Rs ')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleShareWhatsApp(tx)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <button
              disabled={isSendingNotifications || settlementTransactions.length === 0}
              onClick={handleSendSettlementEmails}
              className="w-full py-2.5 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSendingNotifications ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Email Notifications...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Email Notifications to All Debtors</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleShareWhatsApp()}
                className="py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Share WhatsApp Summary</span>
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMemberModal() {
    if (!isMemberModalOpen || !currentWs) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-[#012456]">Invite Member to {currentWs.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">We will send an email invitation with a direct link to join this workspace.</p>
            </div>
            <button onClick={() => setIsMemberModalOpen(false)} disabled={isAddingMember} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {memberError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold animate-fadeIn">
              {memberError}
            </div>
          )}
          <form onSubmit={handleInviteMember} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invitee Email Address</label>
              <input
                type="email"
                required
                disabled={isAddingMember}
                value={newMemberForm.email}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                placeholder="colleague@example.com, friend@hissaby.pk"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60 focus:outline-none focus:border-[#5391FE]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
              <select
                disabled={isAddingMember}
                value={newMemberForm.role}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer disabled:opacity-60"
              >
                <option value="member">Member (Can log expenses &amp; leave)</option>
                <option value="admin">Admin (Can manage settings &amp; delete)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={isAddingMember} onClick={() => setIsMemberModalOpen(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isAddingMember} className="flex-1 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-[#5391FE]/60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                {isAddingMember ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Invite...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Invitation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderExpenseModal() {
    if (!isExpenseModalOpen || !currentWs) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-black text-[#012456]">Log Shared Expense</h3>
            <button onClick={() => setIsExpenseModalOpen(false)} disabled={isAddingExpense} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          {expenseMode === 'single_payer' && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Single Payer mode — expense recorded against sponsor only.
            </div>
          )}
          <form onSubmit={handleAddExpense} className="space-y-3.5">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Amount (PKR)</label>
              <input type="number" required disabled={isAddingExpense} value={newExpenseForm.amount} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })} placeholder="e.g. 8500" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input type="text" required disabled={isAddingExpense} value={newExpenseForm.description} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })} placeholder="e.g. Metro Supermarket Monthly Ration" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select disabled={isAddingExpense} value={newExpenseForm.category} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer disabled:opacity-60">
                <option value="Groceries">Groceries &amp; Rashan</option><option value="Utilities">Utilities &amp; Bills</option>
                <option value="Rent">Rent &amp; Accommodation</option><option value="Software">Software &amp; Tools</option>
                <option value="Dining">Dining Out</option><option value="General">General Expense</option>
              </select></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Who Paid?</label>
              <select disabled={isAddingExpense} value={newExpenseForm.payer_id} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, payer_id: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer disabled:opacity-60">
                {members.length > 0 ? members.map((m) => <option key={m.id} value={m.user_id || m.id}>{m.display_name || m.email}</option>) : <option value="usr_me">You (Owner)</option>}
              </select></div>
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={isAddingExpense} onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isAddingExpense} className="flex-1 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-[#5391FE]/60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                {isAddingExpense ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Logging Expense...</span>
                  </>
                ) : (
                  <span>Add Expense</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderRecurringModal() {
    if (!isRecurringModalOpen || !currentWs) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div><h3 className="text-base font-black text-[#012456]">Add Recurring Payment</h3><p className="text-[11px] text-slate-400 mt-0.5">Netflix, hosting, rent, subscriptions — any fixed group cost.</p></div>
            <button onClick={() => setIsRecurringModalOpen(false)} disabled={isAddingRecurring} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleAddRecurring} className="space-y-3.5">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input type="text" required disabled={isAddingRecurring} value={newRecurringForm.description} onChange={(e) => setNewRecurringForm({ ...newRecurringForm, description: e.target.value })} placeholder="e.g. Netflix Premium Plan" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Amount (PKR)</label>
              <input type="number" required disabled={isAddingRecurring} value={newRecurringForm.amount} onChange={(e) => setNewRecurringForm({ ...newRecurringForm, amount: e.target.value })} placeholder="e.g. 1500" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                <select disabled={isAddingRecurring} value={newRecurringForm.frequency} onChange={(e) => setNewRecurringForm({ ...newRecurringForm, frequency: e.target.value as any })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer disabled:opacity-60">
                  <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option>
                </select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select disabled={isAddingRecurring} value={newRecurringForm.category} onChange={(e) => setNewRecurringForm({ ...newRecurringForm, category: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer disabled:opacity-60">
                  <option value="Subscription">Subscription</option><option value="Rent">Rent &amp; Housing</option>
                  <option value="Utilities">Utilities &amp; Bills</option><option value="Software">Software &amp; Tools</option><option value="General">General</option>
                </select></div>
            </div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input type="date" required disabled={isAddingRecurring} value={newRecurringForm.start_date} onChange={(e) => setNewRecurringForm({ ...newRecurringForm, start_date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-60" /></div>
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={isAddingRecurring} onClick={() => setIsRecurringModalOpen(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isAddingRecurring} className="flex-1 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-[#5391FE]/60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                {isAddingRecurring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Adding Recurring...</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Add Recurring</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── GROUP SETTINGS MODAL (Owner Only) ──────────────────────────────────────
  function renderSettingsModal() {
    if (!isSettingsModalOpen || !currentWs) return null;

    const SETTINGS_TABS: { id: SettingsTabId; label: string; icon: any; danger?: boolean }[] = [
      { id: 'info', label: 'Group Info', icon: Info },
      { id: 'payment', label: 'Payment Mode', icon: Wallet },
      { id: 'members', label: 'Members & Invites', icon: Users },
      { id: 'danger', label: 'Danger Zone', icon: ShieldAlert, danger: true },
    ];

    const closeSettings = () => {
      setIsSettingsModalOpen(false);
      setDeleteConfirmText('');
      setSettingsTab('info');
      setInviteEmail('');
    };

    return (
      <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${themeBadge.bg}`}>
                <ThemeIcon className="w-5 h-5" style={{ color: 'inherit' }} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#012456]">{currentWs.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Group Settings · Owner Access</p>
                </div>
              </div>
            </div>
            <button onClick={closeSettings} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Left Nav */}
            <nav className="w-44 border-r border-slate-100 p-3 space-y-1 shrink-0 bg-slate-50/40 overflow-y-auto">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = settingsTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      isActive
                        ? tab.danger ? 'bg-rose-50 text-rose-700' : 'bg-[#5391FE]/10 text-[#5391FE]'
                        : tab.danger ? 'text-rose-500 hover:bg-rose-50/60 hover:text-rose-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Tab: Group Info ────────────────────────────────────────── */}
              {settingsTab === 'info' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-[#012456] mb-1">Group Overview</h4>
                    <p className="text-[11px] text-slate-400">Summary of this group's configuration and current status.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Group Name</span>
                      <p className="text-sm font-black text-[#012456]">{currentWs.name}</p>
                    </div>
                    {currentWs.description && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                        <p className="text-xs text-slate-700">{currentWs.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Budget</span>
                        <p className="text-sm font-black text-[#012456]">{totalBudget > 0 ? formatAmount(totalBudget, false, 'Rs ') : 'Not set'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Members</span>
                        <p className="text-sm font-black text-[#012456]">{members.length} people</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Spent</span>
                        <p className="text-sm font-black text-rose-600">{formatAmount(totalSpent, false, 'Rs ')}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remaining</span>
                        <p className={`text-sm font-black ${remaining >= 0 && totalBudget > 0 ? 'text-emerald-600' : totalBudget === 0 ? 'text-slate-400' : 'text-rose-600'}`}>
                          {totalBudget > 0 ? formatAmount(Math.abs(remaining), false, 'Rs ') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Mode</span>
                      <div className="flex items-center gap-2 mt-1">
                        {expenseMode === 'equal_split' && <><SplitSquareVertical className="w-4 h-4 text-[#5391FE]" /><span className="text-xs font-black text-[#012456]">Equal Split</span></>}
                        {expenseMode === 'single_payer' && <><Crown className="w-4 h-4 text-amber-500" /><span className="text-xs font-black text-[#012456]">Single Payer</span></>}
                        {expenseMode === 'custom_percent' && <><PieChart className="w-4 h-4 text-purple-500" /><span className="text-xs font-black text-[#012456]">Custom %</span></>}
                        <button onClick={() => setSettingsTab('payment')} className="text-[10px] font-bold text-[#5391FE] hover:underline cursor-pointer ml-auto">Change →</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Payment Mode ──────────────────────────────────────── */}
              {settingsTab === 'payment' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-[#012456] mb-1">Fund & Payment Mode</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Choose how shared expenses are divided across group members. As the group owner, only you can change this setting. It applies to all future expense calculations.</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {/* Equal Split */}
                    <button onClick={() => handleExpenseModeChange('equal_split')}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'equal_split' ? 'border-[#5391FE] bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${expenseMode === 'equal_split' ? 'bg-[#5391FE]/15' : 'bg-slate-100'}`}>
                            <SplitSquareVertical className={`w-4 h-4 ${expenseMode === 'equal_split' ? 'text-[#5391FE]' : 'text-slate-500'}`} />
                          </div>
                          <span className={`text-xs font-black ${expenseMode === 'equal_split' ? 'text-[#012456]' : 'text-slate-700'}`}>Equal Split</span>
                        </div>
                        {expenseMode === 'equal_split' && <span className="w-5 h-5 rounded-full bg-[#5391FE] flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed ml-10">All expenses are divided equally among all {members.length} members. Each person owes the same fair share of the total group spending. Best for friend groups and equal partnerships.</p>
                    </button>

                    {/* Single Payer */}
                    <button onClick={() => handleExpenseModeChange('single_payer')}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'single_payer' ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${expenseMode === 'single_payer' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                            <Crown className={`w-4 h-4 ${expenseMode === 'single_payer' ? 'text-amber-500' : 'text-slate-500'}`} />
                          </div>
                          <span className={`text-xs font-black ${expenseMode === 'single_payer' ? 'text-amber-800' : 'text-slate-700'}`}>Single Payer</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold">Sponsor / CEO / NGO</span>
                        </div>
                        {expenseMode === 'single_payer' && <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed ml-10">One person — a philanthropist, organization, sponsor, CEO, or project manager — covers all group expenses. No charges or settlements for other members. Best for charity projects, sponsored teams, or corporate groups.</p>
                    </button>

                    {/* Custom % */}
                    <button onClick={() => handleExpenseModeChange('custom_percent')}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${expenseMode === 'custom_percent' ? 'border-purple-400 bg-purple-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${expenseMode === 'custom_percent' ? 'bg-purple-100' : 'bg-slate-100'}`}>
                            <PieChart className={`w-4 h-4 ${expenseMode === 'custom_percent' ? 'text-purple-500' : 'text-slate-500'}`} />
                          </div>
                          <span className={`text-xs font-black ${expenseMode === 'custom_percent' ? 'text-purple-800' : 'text-slate-700'}`}>Custom %</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold border border-slate-200">Coming Soon</span>
                        </div>
                        {expenseMode === 'custom_percent' && <span className="w-5 h-5 rounded-full bg-purple-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed ml-10">Set a custom contribution percentage per member — e.g. 60% Owner · 25% Partner · 15% Contractor. Per-member percentage input will be available in the next release.</p>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Changes save automatically and apply immediately to expense calculations.
                  </p>
                </div>
              )}

              {/* ── Tab: Members & Invites ─────────────────────────────────── */}
              {settingsTab === 'members' && (
                <div className="space-y-5">
                  {/* Current Members */}
                  <div>
                    <h4 className="text-sm font-black text-[#012456] mb-3">Active Members ({members.length})</h4>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#012456] text-white flex items-center justify-center text-xs font-black shrink-0">
                              {(m.display_name || m.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{m.display_name || m.email}</p>
                              <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border ${m.role === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200' : m.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invite by Email */}
                  <div>
                    <h4 className="text-sm font-black text-[#012456] mb-1">Invite by Email</h4>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Add a member's email to send them an invitation.
                      <span className="text-[#5391FE] font-semibold"> Email delivery is coming soon</span> — invitations are tracked below until then.
                    </p>
                    <div className="flex gap-2">
                      <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInviteByEmail(); } }}
                        placeholder="colleague@example.com"
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all" />
                      <button onClick={handleInviteByEmail} disabled={!inviteEmail.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#5391FE] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold cursor-pointer hover:bg-[#437de0] disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0">
                        <Mail className="w-3.5 h-3.5" /> Send Invite
                      </button>
                    </div>
                  </div>

                  {/* Pending Invitations */}
                  {pendingInvites.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black text-slate-600 mb-2">Pending Invitations ({pendingInvites.length})</h4>
                      <div className="space-y-2">
                        {pendingInvites.map((inv) => (
                          <div key={inv.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-amber-800 truncate">{inv.email}</p>
                                <p className="text-[10px] text-amber-600">Sent {new Date(inv.sentAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                              </div>
                            </div>
                            <button onClick={() => handleCancelInvite(inv.id)}
                              className="text-[10px] font-bold text-amber-700 hover:text-rose-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0">
                              Cancel
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Future roadmap note */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-600"><strong>Roadmap:</strong> Invited members will receive an Accept/Decline email button. After accepting, they can view shared expenses and will appear in the member ledger automatically.</p>
                  </div>
                </div>
              )}

              {/* ── Tab: Danger Zone ───────────────────────────────────────── */}
              {settingsTab === 'danger' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-black text-rose-600 mb-1">Danger Zone</h4>
                    <p className="text-[11px] text-slate-500">These actions are permanent and irreversible. Proceed with caution.</p>
                  </div>

                  {/* Delete Group — Owner only */}
                  {isOwner && (
                    <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50/40 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Trash2 className="w-4.5 h-4.5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-700">Delete This Group</p>
                          <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                            Permanently delete <strong>"{currentWs.name}"</strong> along with all expense records, member ledger entries, recurring payments, and pending invitations. <strong>This cannot be undone.</strong>
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-rose-700 mb-1.5">
                          Type <strong className="font-black text-rose-800">"{currentWs.name}"</strong> below to confirm:
                        </label>
                        <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={`Type "${currentWs.name}" to confirm`}
                          className="w-full px-3 py-2.5 bg-white border-2 border-rose-200 focus:border-rose-500 rounded-xl text-xs text-slate-900 focus:outline-none transition-colors" />
                      </div>
                      <button onClick={handleDeleteGroup} disabled={deleteConfirmText !== currentWs.name || isDeleting}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 disabled:cursor-not-allowed text-white text-xs font-black cursor-pointer transition-colors flex items-center justify-center gap-2">
                        {isDeleting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting...</> : <><Trash2 className="w-3.5 h-3.5" /> Permanently Delete Group</>}
                      </button>
                    </div>
                  )}

                  {/* Leave Group — Non-owner members */}
                  {!isOwner && (
                    <div className="p-5 rounded-2xl border-2 border-orange-200 bg-orange-50/40 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                          <LogOut className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-orange-700">Leave This Group</p>
                          <p className="text-[11px] text-orange-600 mt-1 leading-relaxed">Remove yourself from <strong>"{currentWs.name}"</strong>. You will lose access to all shared expenses, budget data, and the member ledger.</p>
                        </div>
                      </div>
                      <button className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black cursor-pointer transition-colors flex items-center justify-center gap-2">
                        <LogOut className="w-3.5 h-3.5" /> Leave Group
                      </button>
                    </div>
                  )}

                  {/* Future actions note */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      <strong>Coming soon:</strong> Transfer group ownership to another member, archive group (read-only mode), and export all expense history as a PDF or CSV report.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default TeamsGroupsView;
