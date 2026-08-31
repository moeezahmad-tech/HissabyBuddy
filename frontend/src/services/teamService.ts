import { getApiUrl } from './api';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  custom_title?: string;
  spending_limit?: number | null;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  total_spent?: number;
  joined_at?: string;
}

export interface BudgetCategory {
  category: string;
  amount: number;
}

export interface WorkspaceBudget {
  id: string;
  workspace_id: string;
  name: string;
  amount: number;
  period: string;
  start_date?: string;
  end_date?: string;
  alert_threshold_percent: number;
  is_active?: boolean;
  current_spent: number;
  remaining: number;
  percentage_used: number;
}

export interface TeamSpending {
  id: string;
  workspace_id: string;
  user_id: string;
  payer_id?: string;
  payer_name?: string;
  budget_id?: string;
  budget_name?: string;
  amount: number;
  category: string;
  description: string;
  receipt_url?: string;
  transaction_date: string;
  custom_fields?: Record<string, any>;
  splits?: Array<{
    user_id: string;
    split_amount: number;
    split_percentage?: number;
    notes?: string;
  }>;
}

export interface Workspace {
  id: string;
  name: string;
  theme: 'family' | 'project' | 'friends' | 'team';
  description?: string;
  currency: string;
  currency_symbol: string;
  color_code?: string;
  icon_name?: string;
  role?: string;
  member_count?: number;
  total_budget: number;
  total_spent: number;
  budget_type?: 'fixed' | 'no_budget';
  members?: WorkspaceMember[];
  budgets?: WorkspaceBudget[];
  spendings?: TeamSpending[];
  created_at?: string;
  theme_settings?: {
    is_temporary?: boolean;
    budget_type?: 'fixed' | 'no_budget';
    [key: string]: any;
  };
}

export interface CreateWorkspacePayload {
  name: string;
  theme: 'family' | 'project' | 'friends' | 'team';
  description?: string;
  currency?: string;
  currency_symbol?: string;
  color_code?: string;
  icon_name?: string;
  is_temporary?: boolean;
  budget_type?: 'fixed' | 'no_budget';
  theme_settings?: Record<string, any>;
}

// Local storage key for offline caching
const LOCAL_STORAGE_KEY = 'hissaby_user_workspaces_v2';
const DELETED_DEFAULT_NAMES = new Set([
  'The Ahmad Family Home', 
  'Summer Road Trip 2026', 
  'Acme Portal Redesign',
  'Hissaby Buddy Deployment Project'
]);

function getStoredLocalWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((w: any) => !DELETED_DEFAULT_NAMES.has(w.name));
        if (filtered.length !== parsed.length) {
          saveLocalWorkspaces(filtered);
        }
        return filtered;
      }
    }
  } catch {}
  return [];
}

function saveLocalWorkspaces(workspaces: Workspace[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspaces));
  } catch {}
}

export const teamService = {
  getStoredWorkspaces(): Workspace[] {
    return getStoredLocalWorkspaces();
  },

  async getWorkspaces(token?: string, userEmail?: string): Promise<Workspace[]> {
    const apiUrl = getApiUrl();
    const local = getStoredLocalWorkspaces();

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/workspaces`, {
        headers,
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(15000) : undefined,
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && Array.isArray(data.workspaces)) {
          const defaultEmail = (userEmail && !userEmail.includes('@hissaby.local')) ? userEmail : 'you@hissaby.pk';

          // Preserve any un-synced offline workspaces
          const offlineOnly = local.filter((lw) => lw.id.startsWith('ws-') && !data.workspaces.some((rw: any) => rw.id === lw.id || rw.name === lw.name));

          // Merge backend workspaces with local models so members/budgets/spendings exist
          const mergedWorkspaces: Workspace[] = data.workspaces.map((rw: any) => {
            const match = local.find((lw) => lw.id === rw.id || lw.name === rw.name);
            return {
              ...rw,
              members: match?.members || [
                {
                  id: 'm-' + rw.id,
                  workspace_id: rw.id,
                  user_id: 'usr_me',
                  role: 'owner',
                  display_name: 'You (Creator)',
                  email: defaultEmail,
                  total_spent: rw.total_spent || 0,
                  custom_title: 'You (Creator)',
                },
              ],
              budgets: match?.budgets || [],
              spendings: match?.spendings || [],
            };
          });

          const finalWorkspaces = [...mergedWorkspaces, ...offlineOnly];
          saveLocalWorkspaces(finalWorkspaces);
          return finalWorkspaces;
        }
      }
    } catch {
      // Return local cache on timeout or network error
    }
    return local;
  },

  async createWorkspace(
    payload: CreateWorkspacePayload,
    token?: string,
    userProfile?: { email?: string; displayName?: string }
  ): Promise<Workspace> {
    const apiUrl = getApiUrl();
    const resolvedEmail = (userProfile?.email && !userProfile.email.includes('@hissaby.local')) ? userProfile.email : 'you@hissaby.pk';
    const resolvedName = 'You (Creator)';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          currency: payload.currency || 'PKR',
          currency_symbol: payload.currency_symbol || 'Rs ',
          creator_email: resolvedEmail,
          creator_name: resolvedName,
          is_temporary: payload.is_temporary || false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          const current = getStoredLocalWorkspaces();
          const existing = current.find(w => w.id === data.workspace.id || w.name === data.workspace.name);
          const fullWs: Workspace = {
            ...data.workspace,
            members: existing?.members || [
              {
                id: 'm-' + data.workspace.id,
                workspace_id: data.workspace.id,
                user_id: 'usr_me',
                role: 'owner',
                display_name: resolvedName,
                email: resolvedEmail,
                total_spent: 0,
                custom_title: resolvedName,
              },
            ],
            budgets: existing?.budgets || [],
            spendings: existing?.spendings || [],
          };
          saveLocalWorkspaces([...current.filter(w => w.id !== fullWs.id), fullWs]);
          return fullWs;
        }
      } else if (res.status === 429) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Please wait a moment before creating another group.');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Rate limit')) {
        throw e;
      }
    }

    // Local creation
    const current = getStoredLocalWorkspaces();
    const newWs: Workspace = {
      id: 'ws-' + Date.now(),
      name: payload.name,
      theme: payload.theme,
      description: payload.description || '',
      currency: payload.currency || 'PKR',
      currency_symbol: payload.currency_symbol || 'Rs ',
      color_code: payload.color_code || '#10B981',
      icon_name: payload.icon_name || 'users',
      role: 'owner',
      member_count: 1,
      total_budget: 0,
      total_spent: 0,
      budget_type: payload.budget_type || 'fixed',
      theme_settings: payload.theme_settings,
      members: [
        {
          id: 'm-' + Date.now(),
          workspace_id: 'ws-' + Date.now(),
          user_id: 'usr_me',
          role: 'owner',
          display_name: resolvedName,
          email: resolvedEmail,
          total_spent: 0,
          custom_title: resolvedName,
        },
      ],
      budgets: [],
      spendings: [],
    };
    saveLocalWorkspaces([...current, newWs]);
    return newWs;
  },

  async addMember(
    workspaceId: string,
    member: {
      user_id?: string;
      display_name: string;
      email: string;
      role?: 'owner' | 'admin' | 'member';
      custom_title?: string;
      spending_limit?: number;
    },
    token?: string
  ): Promise<WorkspaceMember> {
    const apiUrl = getApiUrl();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: member.user_id || 'usr_' + Date.now(),
          display_name: member.display_name,
          email: member.email,
          role: member.role || 'member',
          custom_title: member.custom_title || '',
          spending_limit: member.spending_limit || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.member) return data.member;
      }
    } catch {}

    const current = getStoredLocalWorkspaces();
    const ws = current.find((w) => w.id === workspaceId);
    const newMember: WorkspaceMember = {
      id: 'm-' + Date.now(),
      workspace_id: workspaceId,
      user_id: member.user_id || 'usr_' + Date.now(),
      role: member.role || 'member',
      display_name: member.display_name,
      email: member.email,
      custom_title: member.custom_title || '',
      spending_limit: member.spending_limit || null,
      total_spent: 0,
      joined_at: new Date().toISOString(),
    };
    if (ws) {
      if (!ws.members) ws.members = [];
      ws.members.push(newMember);
      ws.member_count = ws.members.length;
      saveLocalWorkspaces(current);
    }
    return newMember;
  },

  async createBudget(
    workspaceId: string,
    budget: {
      name: string;
      amount: number;
      period?: string;
      alert_threshold_percent?: number;
    },
    token?: string
  ): Promise<WorkspaceBudget> {
    const apiUrl = getApiUrl();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/budgets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: budget.name,
          amount: budget.amount,
          period: budget.period || 'monthly',
          alert_threshold_percent: budget.alert_threshold_percent || 80,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.budget) return data.budget;
      }
    } catch {}

    const current = getStoredLocalWorkspaces();
    const ws = current.find((w) => w.id === workspaceId);
    const newBudget: WorkspaceBudget = {
      id: 'b-' + Date.now(),
      workspace_id: workspaceId,
      name: budget.name,
      amount: budget.amount,
      period: budget.period || 'monthly',
      alert_threshold_percent: budget.alert_threshold_percent || 80,
      current_spent: 0,
      remaining: budget.amount,
      percentage_used: 0,
    };
    if (ws) {
      if (!ws.budgets) ws.budgets = [];
      ws.budgets.unshift(newBudget);
      ws.total_budget += budget.amount;
      saveLocalWorkspaces(current);
    }
    return newBudget;
  },

  async addSpending(
    workspaceId: string,
    spending: {
      amount: number;
      category: string;
      description: string;
      payer_id?: string;
      payer_name?: string;
      budget_id?: string;
      splits?: Array<{ user_id: string; split_amount: number }>;
    },
    token?: string
  ): Promise<TeamSpending> {
    const apiUrl = getApiUrl();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/spendings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(spending),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.spending) return data.spending;
      }
    } catch {}

    const current = getStoredLocalWorkspaces();
    const ws = current.find((w) => w.id === workspaceId);
    const newSpending: TeamSpending = {
      id: 'sp-' + Date.now(),
      workspace_id: workspaceId,
      user_id: spending.payer_id || 'usr_me',
      payer_id: spending.payer_id || 'usr_me',
      payer_name: spending.payer_name || 'You',
      budget_id: spending.budget_id,
      amount: spending.amount,
      category: spending.category,
      description: spending.description,
      transaction_date: new Date().toISOString(),
      splits: spending.splits,
    };

    if (ws) {
      if (!ws.spendings) ws.spendings = [];
      ws.spendings.unshift(newSpending);
      ws.total_spent += spending.amount;

      if (spending.budget_id && ws.budgets) {
        const b = ws.budgets.find((bg) => bg.id === spending.budget_id);
        if (b) {
          b.current_spent += spending.amount;
          b.remaining = Math.max(b.amount - b.current_spent, 0);
          b.percentage_used = Math.round((b.current_spent / b.amount) * 100);
        }
      }

      if (ws.members) {
        const m = ws.members.find((mem) => mem.user_id === spending.payer_id || mem.id === spending.payer_id);
        if (m) {
          m.total_spent = (m.total_spent || 0) + spending.amount;
        }
      }

      saveLocalWorkspaces(current);
    }

    return newSpending;
  },

  async deleteWorkspace(workspaceId: string, token?: string): Promise<boolean> {
    const apiUrl = getApiUrl();
    const current = getStoredLocalWorkspaces();
    saveLocalWorkspaces(current.filter((w) => w.id !== workspaceId));

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        return true;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error(data.detail || 'You do not have permission to delete this group.');
      }
      return true;
    } catch (e: any) {
      if (e.message && e.message.includes('permission')) {
        throw e;
      }
      return true;
    }
  },

  async leaveWorkspace(workspaceId: string, token?: string): Promise<boolean> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/leave`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const current = getStoredLocalWorkspaces();
      saveLocalWorkspaces(current.filter((w) => w.id !== workspaceId));
      return true;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to leave workspace');
  },

  async inviteMember(
    workspaceId: string,
    email: string,
    role: string = 'member',
    token?: string
  ): Promise<{ id: string; invited_email: string; invite_token: string }> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.status === 'success') {
      return data.invitation;
    }
    throw new Error(data.detail || data.error || 'Failed to send invitation');
  },

  async getWorkspaceInvitations(workspaceId: string, token?: string): Promise<any[]> {
    const apiUrl = getApiUrl();
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/invitations`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.invitations || [];
      }
    } catch {}
    return [];
  },

  async cancelInvitation(inviteId: string, token?: string): Promise<boolean> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/api/workspaces/invitations/${inviteId}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  },

  async updateMemberRole(workspaceId: string, userId: string, newRole: string, token?: string): Promise<boolean> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/members/${userId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) return true;
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to update member role');
  },

  async removeMember(workspaceId: string, userId: string, token?: string): Promise<boolean> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      const current = getStoredLocalWorkspaces();
      const ws = current.find((w) => w.id === workspaceId);
      if (ws && ws.members) {
        ws.members = ws.members.filter((m) => m.user_id !== userId && m.id !== userId);
        ws.member_count = ws.members.length;
        saveLocalWorkspaces(current);
      }
      return true;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to remove member');
  },

  async notifySettlements(
    workspaceId: string,
    settlements: Array<{
      debtor_name: string;
      debtor_email?: string;
      creditor_name: string;
      creditor_email?: string;
      amount: number;
      notes?: string;
    }>,
    groupName?: string,
    token?: string
  ): Promise<{ status: string; message: string; dispatched_count: number }> {
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/notify-settlements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settlements, group_name: groupName }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend notification failed, fallback to simulated dispatch:', e);
    }
    return {
      status: 'success',
      message: `Notifications prepared for ${settlements.length} settlement(s)`,
      dispatched_count: settlements.filter((s) => s.debtor_email && s.debtor_email.includes('@')).length,
    };
  },
};

export default teamService;

