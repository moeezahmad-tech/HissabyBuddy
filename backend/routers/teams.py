import logging
import time
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field

from core.security import get_current_user
from services.storage_service import storage_service
from collections import defaultdict

logger = logging.getLogger("hissaby.teams")
router = APIRouter(prefix="/api/workspaces", tags=["Workspaces & Team Themes"])

# ------------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# ------------------------------------------------------------------------------

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    theme: str = Field("team", description="'project', 'family', 'friends', or 'team'")
    description: Optional[str] = ""
    currency: Optional[str] = "PKR"
    currency_symbol: Optional[str] = "Rs "
    color_code: Optional[str] = "#4F46E5"
    icon_name: Optional[str] = "briefcase"
    theme_settings: Optional[Dict[str, Any]] = None
    creator_email: Optional[str] = None
    creator_name: Optional[str] = None
    is_temporary: Optional[bool] = False
    budget_type: Optional[str] = "fixed" # "fixed" or "no_budget"

class MemberAdd(BaseModel):
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    role: str = "member"
    spending_limit: Optional[float] = None
    custom_title: Optional[str] = ""

class MemberRoleUpdate(BaseModel):
    role: str = "member"

class BudgetCategoryAllocation(BaseModel):
    category: str
    amount: float

class BudgetCreate(BaseModel):
    name: str
    amount: float = Field(..., ge=0)
    period: str = "monthly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    alert_threshold_percent: int = 80
    categories: Optional[List[BudgetCategoryAllocation]] = None

class BudgetUpdate(BaseModel):
    amount: float = Field(..., ge=0)
    apply_mode: str = "permanent" # permanent, current_month, next_month

class InvitationCreate(BaseModel):
    email: str
    role: str = "member"

class SpendingSplitItem(BaseModel):
    user_id: str
    split_amount: float
    split_percentage: Optional[float] = None
    notes: Optional[str] = None

class TeamSpendingCreate(BaseModel):
    amount: float = Field(..., gt=0)
    category: str
    description: str
    budget_id: Optional[str] = None
    payer_id: Optional[str] = None
    receipt_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    splits: Optional[List[SpendingSplitItem]] = None

class CustomFieldCreate(BaseModel):
    field_name: str
    field_key: str
    field_type: str = "text"
    target_entity: str = "transaction"
    description: Optional[str] = ""
    placeholder: Optional[str] = ""
    is_required: bool = False
    options: Optional[List[str]] = None
    display_order: int = 0

class SettlementCreate(BaseModel):
    payer_id: str
    payee_id: str
    amount: float = Field(..., gt=0)
    currency: Optional[str] = "PKR"
    notes: Optional[str] = None

class SettlementItem(BaseModel):
    debtor_name: str
    debtor_email: Optional[str] = None
    creditor_name: str
    creditor_email: Optional[str] = None
    amount: float
    notes: Optional[str] = None

class SettlementNotificationRequest(BaseModel):
    settlements: List[SettlementItem]
    group_name: Optional[str] = None


# ------------------------------------------------------------------------------
# RATE LIMITING & MULTI-CLICK DEDUPLICATION
# ------------------------------------------------------------------------------
_workspace_creation_timestamps: Dict[str, List[float]] = defaultdict(list)
_recent_creations: Dict[str, tuple] = {}

RATE_LIMIT_WINDOW = 10.0
MAX_CREATIONS_PER_WINDOW = 3
DUPLICATE_NAME_DEBOUNCE_WINDOW = 15.0

# ------------------------------------------------------------------------------
# WORKSPACE / THEME ENDPOINTS
# ------------------------------------------------------------------------------

@router.get("")
async def list_workspaces(user: Dict[str, Any] = Depends(get_current_user)):
    uid = user.get("uid", "guest_user")
    workspaces = storage_service.get_workspaces(uid)
    return {"status": "success", "workspaces": workspaces}

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_workspace(payload: WorkspaceCreate, background_tasks: BackgroundTasks, user: Dict[str, Any] = Depends(get_current_user)):
    uid = user.get("uid", "guest_user")
    valid_themes = ["project", "family", "friends", "team"]
    theme = payload.theme.lower()
    if theme not in valid_themes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid theme '{theme}'. Must be one of: {', '.join(valid_themes)}"
        )

    now = time.time()
    clean_name = payload.name.strip()
    dup_key = f"{uid}:{clean_name.lower()}"

    if dup_key in _recent_creations:
        last_time, cached_ws = _recent_creations[dup_key]
        if now - last_time < DUPLICATE_NAME_DEBOUNCE_WINDOW:
            logger.warning(f"Deduplicated rapid workspace creation attempt for '{clean_name}' from {uid}")
            return {"status": "success", "workspace": cached_ws, "deduplicated": True}

    timestamps = [t for t in _workspace_creation_timestamps[uid] if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= MAX_CREATIONS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a few seconds before creating another group."
        )

    try:
        creator_email = payload.creator_email or user.get("email")
        if not creator_email or "@hissaby.local" in creator_email:
            creator_email = "you@hissaby.pk"
        creator_name = payload.creator_name or user.get("name") or user.get("display_name") or "You (Creator)"

        t_settings = payload.theme_settings or {}
        if payload.is_temporary:
            t_settings["is_temporary"] = True
        if payload.budget_type:
            t_settings["budget_type"] = payload.budget_type

        ws = storage_service.create_workspace(
            name=clean_name,
            theme=theme,
            created_by=uid,
            currency=payload.currency or "PKR",
            currency_symbol=payload.currency_symbol or "Rs ",
            description=payload.description or "",
            color_code=payload.color_code or "#4F46E5",
            icon_name=payload.icon_name or "briefcase",
            theme_settings=t_settings,
            creator_email=creator_email,
            creator_name=creator_name
        )

        timestamps.append(now)
        _workspace_creation_timestamps[uid] = timestamps
        _recent_creations[dup_key] = (now, ws)

        # Dispatch automated Group Creation confirmation email to the creator
        if creator_email and "@" in creator_email and "@hissaby.local" not in creator_email:
            try:
                from services.email_service import EmailService
                background_tasks.add_task(
                    EmailService.send_group_creation_email,
                    to_email=creator_email.strip(),
                    creator_name=creator_name,
                    group_name=clean_name,
                    group_theme=theme,
                    currency=payload.currency or "PKR",
                    workspace_id=str(ws.get("id", ""))
                )
            except Exception as mail_err:
                logger.error(f"Failed to queue group creation email: {mail_err}")

        return {"status": "success", "workspace": ws}
    except Exception as e:
        logger.error(f"Failed to create workspace: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}")
async def get_workspace_details(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    ws = storage_service.get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    members = storage_service.get_workspace_members(workspace_id)
    budgets = storage_service.get_budgets(workspace_id)
    custom_fields = storage_service.get_custom_fields(workspace_id)

    return {
        "status": "success",
        "workspace": ws,
        "members": members,
        "budgets": budgets,
        "custom_fields": custom_fields
    }

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, background_tasks: BackgroundTasks, user: Dict[str, Any] = Depends(get_current_user)):
    """Deletes a workspace permanently. Only workspace Owners and Admins are authorized."""
    uid = user.get("uid", "guest_user")
    try:
        # Fetch group and member details prior to deletion for email notification
        ws = storage_service.get_workspace(workspace_id)
        members = storage_service.get_workspace_members(workspace_id) if ws else []
        group_name = ws.get("name", "Group Workspace") if ws else "Group Workspace"
        deleter_name = user.get("name") or user.get("display_name") or "Workspace Admin"

        storage_service.delete_workspace(workspace_id=workspace_id, requesting_user_id=uid)

        # Dispatch deletion notice to all active members in the background
        if members:
            try:
                from services.email_service import EmailService
                for m in members:
                    m_email = m.get("email")
                    m_name = m.get("display_name") or "Group Member"
                    if m_email and "@" in m_email and "@hissaby.local" not in m_email:
                        background_tasks.add_task(
                            EmailService.send_group_deletion_email,
                            to_email=m_email.strip(),
                            member_name=m_name,
                            group_name=group_name,
                            deleted_by=deleter_name
                        )
            except Exception as mail_err:
                logger.error(f"Failed to queue group deletion emails: {mail_err}")

        return {"status": "success", "message": f"Workspace {workspace_id} deleted successfully"}
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workspace_id}/leave")
async def leave_workspace(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Allows an active member to leave the workspace."""
    uid = user.get("uid", "guest_user")
    try:
        storage_service.leave_workspace(workspace_id=workspace_id, requesting_user_id=uid)
        return {"status": "success", "message": "Successfully left the workspace"}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------------------
# MEMBERS
# ------------------------------------------------------------------------------

@router.put("/{workspace_id}/members/{target_user_id}/role")
async def update_member_role(workspace_id: str, target_user_id: str, payload: MemberRoleUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Updates a member's role (e.g. member -> admin). Only workspace Owners and Admins can perform this."""
    uid = user.get("uid", "guest_user")
    try:
        res = storage_service.update_member_role(
            workspace_id=workspace_id,
            target_user_id=target_user_id,
            new_role=payload.role,
            requesting_user_id=uid
        )
        return {"status": "success", "member": res}
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workspace_id}/members/{target_user_id}")
async def remove_member(workspace_id: str, target_user_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Removes a member from the workspace. Only workspace Owners and Admins can perform this."""
    uid = user.get("uid", "guest_user")
    try:
        storage_service.remove_workspace_member(
            workspace_id=workspace_id,
            target_user_id=target_user_id,
            requesting_user_id=uid
        )
        return {"status": "success", "message": f"Member {target_user_id} removed successfully"}
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}/members")
async def get_workspace_members(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    members = storage_service.get_workspace_members(workspace_id)
    return {"status": "success", "members": members}

@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
async def add_workspace_member(workspace_id: str, payload: MemberAdd, user: Dict[str, Any] = Depends(get_current_user)):
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE id = %s;", (payload.user_id,))
            if not cur.fetchone():
                display_email = payload.email or f"{payload.user_id}@hissaby.local"
                display_name = payload.display_name or "Workspace Member"
                cur.execute("""
                    INSERT INTO users (id, email, display_name, default_currency, currency_symbol)
                    VALUES (%s, %s, %s, 'PKR', 'Rs ')
                    ON CONFLICT (id) DO NOTHING;
                """, (payload.user_id, display_email, display_name))
                conn.commit()
    except Exception as db_err:
        logger.error(f"Failed to ensure user existence in add_workspace_member: {db_err}")
    finally:
        storage_service.put_conn(conn)

    try:
        member = storage_service.add_workspace_member(
            workspace_id=workspace_id,
            user_id=payload.user_id,
            role=payload.role,
            spending_limit=payload.spending_limit,
            custom_title=payload.custom_title or ""
        )
        return {"status": "success", "member": member}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------------------
# BUDGETS & CAP UPDATES
# ------------------------------------------------------------------------------

@router.get("/{workspace_id}/budgets")
async def list_workspace_budgets(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    budgets = storage_service.get_budgets(workspace_id)
    return {"status": "success", "budgets": budgets}

@router.post("/{workspace_id}/budgets", status_code=status.HTTP_201_CREATED)
async def create_workspace_budget(workspace_id: str, payload: BudgetCreate, user: Dict[str, Any] = Depends(get_current_user)):
    uid = user.get("uid", "guest_user")
    categories_data = [c.dict() for c in payload.categories] if payload.categories else None
    try:
        b = storage_service.create_budget(
            workspace_id=workspace_id,
            name=payload.name,
            amount=payload.amount,
            period=payload.period,
            start_date=payload.start_date,
            end_date=payload.end_date,
            alert_threshold_percent=payload.alert_threshold_percent,
            created_by=uid,
            categories=categories_data
        )
        return {"status": "success", "budget": b}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{workspace_id}/budget-cap")
async def update_workspace_budget_cap(workspace_id: str, payload: BudgetUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Update or create a budget limit for a workspace based on apply_mode preference."""
    uid = user.get("uid", "guest_user")
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if active budget exists
            cur.execute("""
                SELECT id, name FROM budgets 
                WHERE workspace_id::text = %s
                ORDER BY created_at DESC LIMIT 1;
            """, (workspace_id,))
            existing = cur.fetchone()

            # Format apply mode note or date
            meta = {"apply_mode": payload.apply_mode, "updated_by": uid, "updated_at": datetime.utcnow().isoformat()}

            if existing:
                # Update existing budget
                cur.execute("""
                    UPDATE budgets 
                    SET amount = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, workspace_id, name, amount, period;
                """, (payload.amount, existing["id"]))
                budget = dict(cur.fetchone())
            else:
                # Create a fresh budget cap
                cur.execute("""
                    INSERT INTO budgets (
                        workspace_id, user_id, name, amount, period, start_date
                    ) VALUES (%s, %s, 'Group Budget Cap', %s, 'monthly', CURRENT_DATE)
                    RETURNING id, workspace_id, name, amount, period;
                """, (workspace_id, uid, payload.amount))
                budget = dict(cur.fetchone())
            
            conn.commit()
            budget["id"] = str(budget["id"])
            budget["workspace_id"] = str(budget["workspace_id"])
            budget["amount"] = float(budget["amount"])
            budget["meta"] = meta
            return {"status": "success", "budget": budget}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error updating budget cap: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        storage_service.put_conn(conn)

# ------------------------------------------------------------------------------
# SPENDINGS (WITH EMAIL SPLIT ALERTS DISPATCH)
# ------------------------------------------------------------------------------

@router.post("/{workspace_id}/spendings", status_code=status.HTTP_201_CREATED)
async def add_workspace_spending(workspace_id: str, payload: TeamSpendingCreate, background_tasks: BackgroundTasks, user: Dict[str, Any] = Depends(get_current_user)):
    uid = user.get("uid", "guest_user")
    payer_id = payload.payer_id or uid
    splits_data = [s.dict() for s in payload.splits] if payload.splits else None

    try:
        spending = storage_service.add_team_spending(
            workspace_id=workspace_id,
            payer_id=payer_id,
            user_id=uid,
            amount=payload.amount,
            category=payload.category,
            description=payload.description,
            budget_id=payload.budget_id,
            receipt_url=payload.receipt_url,
            custom_fields=payload.custom_fields,
            splits=splits_data
        )

        # SMTP Email Alert to other group members (via BackgroundTasks)
        try:
            from services.email_service import EmailService
            members = storage_service.get_workspace_members(workspace_id)
            workspace = storage_service.get_workspace(workspace_id)
            group_name = workspace.get("name", "Hissaby Group") if workspace else "Hissaby Group"
            payer_name = user.get("display_name") or user.get("email") or "Group Member"
            
            member_count = len(members)
            if member_count > 0:
                share_amount = payload.amount / member_count
                for m in members:
                    m_email = m.get("email")
                    if m_email and m_email.strip().lower() != user.get("email", "").strip().lower() and "@hissaby.local" not in m_email:
                        background_tasks.add_task(
                            EmailService.send_payment_request,
                            to_email=m_email,
                            payer_name=payer_name,
                            group_name=group_name,
                            expense_description=payload.description,
                            total_amount=payload.amount,
                            share_amount=share_amount
                        )
        except Exception as mail_err:
            logger.error(f"Failed to queue spending emails: {mail_err}")

        return {"status": "success", "spending": spending}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}/spendings")
async def get_workspace_spendings(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT t.id, t.workspace_id, t.user_id, t.payer_id, t.budget_id,
                       t.amount, t.category, t.description, t.receipt_url,
                       t.transaction_date, b.name as budget_name, u.display_name as payer_name
                FROM transactions t
                LEFT JOIN budgets b ON t.budget_id = b.id
                LEFT JOIN users u ON t.payer_id = u.id
                WHERE t.workspace_id::text = %s
                ORDER BY t.transaction_date DESC;
            """, (workspace_id,))
            rows = cur.fetchall()
            spendings = []
            for r in rows:
                item = dict(r)
                item["id"] = str(item["id"])
                item["workspace_id"] = str(item["workspace_id"])
                item["budget_id"] = str(item["budget_id"]) if item["budget_id"] else None
                item["amount"] = float(item["amount"])
                item["transaction_date"] = str(item["transaction_date"])
                item["custom_fields"] = storage_service.get_custom_field_values_for_target(item["id"], existing_conn=conn)
                spendings.append(item)
            return {"status": "success", "spendings": spendings}
    finally:
        storage_service.put_conn(conn)

# ------------------------------------------------------------------------------
# INVITATIONS & JOIN FLOW (Neon Postgres backed)
# ------------------------------------------------------------------------------

@router.get("/{workspace_id}/invitations")
async def get_workspace_invitations(workspace_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch pending email invitations for a workspace."""
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, invited_email, role, status, created_at 
                FROM workspace_invitations
                WHERE workspace_id::text = %s AND status = 'pending'
                ORDER BY created_at DESC;
            """, (workspace_id,))
            rows = cur.fetchall()
            invites = []
            for r in rows:
                item = dict(r)
                item["id"] = str(item["id"])
                item["created_at"] = str(item["created_at"])
                invites.append(item)
            return {"status": "success", "invitations": invites}
    except Exception as e:
        logger.error(f"Error fetching workspace invitations for {workspace_id}: {e}")
        return {"status": "success", "invitations": []}
    finally:
        storage_service.put_conn(conn)

@router.post("/{workspace_id}/invitations")
async def create_workspace_invitation(workspace_id: str, payload: InvitationCreate, background_tasks: BackgroundTasks, user: Dict[str, Any] = Depends(get_current_user)):
    """Creates a new invitation token and dispatches an invite email via SMTP."""
    uid = user.get("uid", "guest_user")
    inviter_name = user.get("display_name") or user.get("email") or "Your Friend"
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if group exists
            cur.execute("SELECT name FROM workspaces WHERE id::text = %s;", (workspace_id,))
            ws = cur.fetchone()
            if not ws:
                raise HTTPException(status_code=404, detail="Group not found")
            
            group_name = ws["name"]
            invited_email = payload.email.strip().lower()
            token = str(uuid.uuid4())
            expiry = datetime.utcnow() + timedelta(days=7)

            # Ensure inviter exists in database users table
            storage_service._ensure_user(cur, uid)

            cur.execute("""
                INSERT INTO workspace_invitations (workspace_id, invited_email, role, invite_token, invited_by, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, invite_token, invited_email;
            """, (workspace_id, invited_email, payload.role, token, uid, expiry))
            
            invite = dict(cur.fetchone())
            conn.commit()

            # SMTP dispatch via BackgroundTasks
            from services.email_service import EmailService
            background_tasks.add_task(
                EmailService.send_group_invitation,
                to_email=invited_email,
                inviter_name=inviter_name,
                group_name=group_name,
                invite_id=token
            )

            invite["id"] = str(invite["id"])
            return {"status": "success", "invitation": invite}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creating invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        storage_service.put_conn(conn)

@router.delete("/invitations/{invite_id}")
async def delete_workspace_invitation(invite_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Revoke or delete a pending workspace invitation."""
    conn = storage_service.get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM workspace_invitations WHERE id::text = %s;", (invite_id,))
            conn.commit()
            return {"status": "success", "message": "Invitation cancelled successfully"}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        storage_service.put_conn(conn)

@router.post("/invitations/{token}/accept")
async def accept_workspace_invitation(token: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Accept an invitation token and join the group."""
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    conn = storage_service.get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check invitation validity
            cur.execute("""
                SELECT id, workspace_id, invited_email, status, expires_at, role
                FROM workspace_invitations
                WHERE invite_token = %s;
            """, (token,))
            invite = cur.fetchone()
            
            if not invite:
                raise HTTPException(status_code=404, detail="Invalid invitation token")
            if invite["status"] != "pending":
                raise HTTPException(status_code=400, detail=f"Invitation has already been {invite['status']}")
            if invite["expires_at"] < datetime.utcnow().replace(tzinfo=invite["expires_at"].tzinfo):
                raise HTTPException(status_code=400, detail="Invitation has expired")

            workspace_id = invite["workspace_id"]
            role = invite["role"]

            # Ensure user exists in target
            storage_service._ensure_user(
                cur, 
                uid, 
                email=user.get("email"), 
                display_name=user.get("name") or user.get("display_name")
            )

            # Add member to workspace_members
            cur.execute("""
                INSERT INTO workspace_members (workspace_id, user_id, role, custom_title)
                VALUES (%s, %s, %s, 'Joined Member')
                ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
                RETURNING id;
            """, (workspace_id, uid, role))
            
            # Update invitation status
            cur.execute("""
                UPDATE workspace_invitations
                SET status = 'accepted'
                WHERE id = %s;
            """, (invite["id"],))

            conn.commit()
            return {"status": "success", "workspace_id": str(workspace_id)}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error accepting invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        storage_service.put_conn(conn)

# ------------------------------------------------------------------------------
# DYNAMIC CUSTOM FIELDS (EXTENSIBLE UX)
# ------------------------------------------------------------------------------

@router.get("/{workspace_id}/custom-fields")
async def get_custom_fields(workspace_id: str, target_entity: str = "transaction", user: Dict[str, Any] = Depends(get_current_user)):
    fields = storage_service.get_custom_fields(workspace_id, target_entity)
    return {"status": "success", "custom_fields": fields}

@router.post("/{workspace_id}/custom-fields", status_code=status.HTTP_201_CREATED)
async def create_custom_field(workspace_id: str, payload: CustomFieldCreate, user: Dict[str, Any] = Depends(get_current_user)):
    uid = user.get("uid", "guest_user")
    valid_types = ["text", "number", "currency", "date", "boolean", "select", "multiselect"]
    ftype = payload.field_type.lower()
    if ftype not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid field_type '{ftype}'. Must be one of: {', '.join(valid_types)}"
        )

    try:
        cf = storage_service.create_custom_field(
            workspace_id=workspace_id,
            created_by=uid,
            field_name=payload.field_name,
            field_key=payload.field_key,
            field_type=ftype,
            target_entity=payload.target_entity,
            description=payload.description or "",
            placeholder=payload.placeholder or "",
            is_required=payload.is_required,
            options=payload.options,
            display_order=payload.display_order
        )
        return {"status": "success", "custom_field": cf}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workspace_id}/notify-settlements")
async def notify_settlements(
    workspace_id: str,
    payload: SettlementNotificationRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Dispatches settlement notification emails to all debtors with the exact amounts and payment recipient."""
    from services.email_service import EmailService
    
    group_name = payload.group_name or "Hissaby Workspace"
    notified_count = 0
    
    for item in payload.settlements:
        if item.debtor_email and "@" in item.debtor_email and not item.debtor_email.endswith("@hissaby.local"):
            background_tasks.add_task(
                EmailService.send_settlement_notification,
                to_email=item.debtor_email.strip(),
                debtor_name=item.debtor_name,
                creditor_name=item.creditor_name,
                group_name=group_name,
                amount=item.amount,
                notes=item.notes or ""
            )
            notified_count += 1
            
    return {
        "status": "success",
        "message": f"Settlement notifications dispatched for {len(payload.settlements)} payment(s).",
        "dispatched_count": notified_count
    }

