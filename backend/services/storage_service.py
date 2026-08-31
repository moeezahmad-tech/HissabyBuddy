import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from core.config import settings

logger = logging.getLogger("hissaby.storage")

# Migration path for one-time legacy transfer from hissaby_store.json
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
STORE_FILE = os.path.join(DATA_DIR, "hissaby_store.json")

class PostgresStorageService:
    def __init__(self):
        self.conn_url = settings.DATABASE_URL
        self._pool = None
        self._init_pool()
        self._initial_migration_done = False
        self._ensured_users = set()
        self._currency_cache = {}
        self._migrate_legacy_file_if_needed()

    def _init_pool(self):
        try:
            # Clean connection string
            clean_url = self.conn_url
            if clean_url.startswith("postgres://"):
                clean_url = clean_url.replace("postgres://", "postgresql://", 1)
            if "connect_timeout=" not in clean_url:
                sep = "&" if "?" in clean_url else "?"
                clean_url = f"{clean_url}{sep}connect_timeout=5"
            self._pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=clean_url
            )
            logger.info("Neon PostgreSQL connection pool successfully initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Neon DB connection pool: {e}")
            raise

    def get_conn(self):
        if not self._pool:
            self._init_pool()
        return self._pool.getconn()

    def put_conn(self, conn):
        if self._pool and conn:
            self._pool.putconn(conn)

    def _ensure_user(self, cursor, uid: str) -> bool:
        """Ensure user row exists in Neon DB (cached in-memory so read queries don't write to DB)."""
        if not uid:
            uid = "guest_user"
        if uid in self._ensured_users:
            return False
        cursor.execute("""
            INSERT INTO users (id, email, display_name, default_currency, currency_symbol)
            VALUES (%s, %s, %s, 'PKR', 'Rs ')
            ON CONFLICT (id) DO NOTHING;
        """, (uid, f"{uid}@hissaby.local", "User" if uid != "guest_user" else "Guest User"))

        cursor.execute("""
            INSERT INTO user_settings (user_id, monthly_budget_goal, dark_mode)
            VALUES (%s, 50000.00, TRUE)
            ON CONFLICT (user_id) DO NOTHING;
        """, (uid,))
        self._ensured_users.add(uid)
        return True

    def _migrate_legacy_file_if_needed(self):
        """One-time migration from hissaby_store.json into Neon DB if tables are empty."""
        if not os.path.exists(STORE_FILE):
            return
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                # Check if transactions already exist
                cur.execute("SELECT COUNT(*) FROM transactions;")
                tx_count = cur.fetchone()[0]
                if tx_count > 0:
                    logger.info("Neon DB already populated with transactions. Skipping legacy file migration.")
                    return

                logger.info("Migrating legacy data from hissaby_store.json to Neon DB...")
                with open(STORE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Migrate users & currencies
                currencies = data.get("currencies", {})
                symbols = data.get("symbols", {})
                balances = data.get("balances", {})

                all_uids = set(data.get("transactions", {}).keys()) | set(balances.keys()) | set(currencies.keys())
                for uid in all_uids:
                    self._ensure_user(cur, uid)
                    curr = currencies.get(uid, "PKR")
                    sym = symbols.get(uid, "Rs ")
                    cur.execute("""
                        UPDATE users SET default_currency = %s, currency_symbol = %s WHERE id = %s;
                    """, (curr, sym, uid))
                    
                    bal = balances.get(uid, 0.0)
                    cur.execute("""
                        UPDATE user_settings SET monthly_budget_goal = %s WHERE user_id = %s;
                    """, (bal, uid))

                # Migrate transactions
                for uid, tx_list in data.get("transactions", {}).items():
                    self._ensure_user(cur, uid)
                    for tx in tx_list:
                        raw_amt = float(tx.get("amount", 0.0))
                        tx_type = "income" if raw_amt > 0 and tx.get("category") == "Salary & Income" else ("income" if raw_amt > 0 else "expense")
                        abs_amt = abs(raw_amt)
                        cur.execute("""
                            INSERT INTO transactions (
                                user_id, amount, type, category, description,
                                source, status, metadata
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                        """, (
                            uid, abs_amt, tx_type, tx.get("category", "General"),
                            tx.get("name") or tx.get("purpose") or "Transaction",
                            tx.get("source", "manual"), tx.get("status", "cleared"),
                            json.dumps(tx)
                        ))

                # Migrate recurring items
                for uid, rec_list in data.get("recurring", {}).items():
                    self._ensure_user(cur, uid)
                    for rec in rec_list:
                        cur.execute("""
                            INSERT INTO recurring_items (
                                user_id, title, amount, type, category, billing_cycle,
                                start_date, next_due_date, auto_pay, status, notes
                            ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', %s, %s, %s);
                        """, (
                            uid, rec.get("name", "Subscription"), abs(float(rec.get("amount", 0.0))),
                            "expense" if float(rec.get("amount", 0.0)) < 0 else "income",
                            rec.get("category", "Subscriptions"), "monthly",
                            rec.get("autoDebit", False), rec.get("status", "active"),
                            rec.get("payee", "")
                        ))

                # Migrate documents
                for uid, doc_list in data.get("documents", {}).items():
                    self._ensure_user(cur, uid)
                    for doc in doc_list:
                        cur.execute("""
                            INSERT INTO documents (
                                user_id, title, file_url, file_type, ocr_status,
                                extracted_amount, raw_ocr_data
                            ) VALUES (%s, %s, %s, %s, 'processed', %s, %s);
                        """, (
                            uid, doc.get("filename", "Receipt Document"), doc.get("file_url", ""),
                            doc.get("type", "pdf"), abs(float(doc.get("total", 0.0))),
                            json.dumps(doc)
                        ))

                conn.commit()
                logger.info("Successfully imported legacy records into Neon DB!")
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error migrating legacy store to Neon DB: {e}")
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # TRANSACTIONS
    # --------------------------------------------------------------------------
    def get_transactions(self, uid: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if self._ensure_user(cur, uid):
                    conn.commit()
                cur.execute("""
                    SELECT id, user_id, workspace_id, amount, type, category, description,
                           transaction_date, receipt_url, payment_method, status, is_reconciled,
                           source, metadata
                    FROM transactions
                    WHERE user_id = %s OR user_id = 'guest_user'
                    ORDER BY transaction_date DESC, created_at DESC;
                """, (uid,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    tx_meta = r["metadata"] or {}
                    amt = float(r["amount"])
                    if r["type"] == "expense" and amt > 0:
                        amt = -amt
                    item = {
                        "id": str(r["id"]),
                        "name": r["description"] or tx_meta.get("name", "Transaction"),
                        "category": r["category"],
                        "payee": tx_meta.get("payee", "Direct Entry"),
                        "purpose": r["description"] or tx_meta.get("purpose", ""),
                        "currency": tx_meta.get("currency", "PKR"),
                        "currencySymbol": tx_meta.get("currencySymbol", "Rs "),
                        "amount": amt,
                        "date": r["transaction_date"].strftime("%d %b %Y") if hasattr(r["transaction_date"], "strftime") else str(r["transaction_date"]),
                        "status": r["status"],
                        "source": r["source"],
                        "workspace_id": str(r["workspace_id"]) if r["workspace_id"] else None
                    }
                    if "lineItems" in tx_meta:
                        item["lineItems"] = tx_meta["lineItems"]
                    results.append(item)
                return results
        except Exception as e:
            logger.error(f"Error fetching transactions for {uid}: {e}")
            return []
        finally:
            self.put_conn(conn)

    def add_transaction(self, uid: str, tx: Dict[str, Any], prepend: bool = True):
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                raw_amt = float(tx.get("amount", 0.0))
                tx_type = tx.get("type")
                if not tx_type:
                    tx_type = "income" if raw_amt > 0 and tx.get("category") == "Salary & Income" else ("income" if raw_amt > 0 else "expense")
                abs_amt = abs(raw_amt)
                
                workspace_id = tx.get("workspace_id")
                budget_id = tx.get("budget_id")

                cur.execute("""
                    INSERT INTO transactions (
                        user_id, workspace_id, budget_id, amount, type, category,
                        description, source, status, payment_method, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    uid, workspace_id, budget_id, abs_amt, tx_type,
                    tx.get("category", "General"),
                    tx.get("name") or tx.get("purpose") or "Transaction",
                    tx.get("source", "manual"),
                    tx.get("status", "cleared"),
                    tx.get("payment_method", "Card"),
                    json.dumps(tx)
                ))
                new_id = cur.fetchone()[0]
                conn.commit()
                tx["id"] = str(new_id)
                return tx
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error adding transaction for {uid}: {e}")
        finally:
            self.put_conn(conn)

    def remove_transactions_by_source(self, uid: str, source_name: str, doc_id: Optional[str] = None):
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                if doc_id:
                    cur.execute("""
                        DELETE FROM transactions 
                        WHERE user_id = %s AND (source = %s OR source = %s);
                    """, (uid, source_name, doc_id))
                else:
                    cur.execute("""
                        DELETE FROM transactions 
                        WHERE user_id = %s AND source = %s;
                    """, (uid, source_name))
                conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error removing transactions by source {source_name}: {e}")
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # DOCUMENTS
    # --------------------------------------------------------------------------
    def get_documents(self, uid: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, uid)
                conn.commit()
                cur.execute("""
                    SELECT id, user_id, workspace_id, title, file_url, file_type,
                           ocr_status, extracted_vendor, extracted_amount,
                           raw_ocr_data, created_at
                    FROM documents
                    WHERE user_id = %s OR user_id = 'guest_user'
                    ORDER BY created_at DESC;
                """, (uid,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    doc = r["raw_ocr_data"] or {}
                    doc["id"] = str(r["id"])
                    doc["filename"] = r["title"]
                    doc["file_url"] = r["file_url"]
                    doc["type"] = r["file_type"]
                    doc["ocr_status"] = r["ocr_status"]
                    doc["total"] = float(r["extracted_amount"] or 0.0)
                    results.append(doc)
                return results
        except Exception as e:
            logger.error(f"Error fetching documents for {uid}: {e}")
            return []
        finally:
            self.put_conn(conn)

    def add_document(self, uid: str, doc: Dict[str, Any]):
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                cur.execute("""
                    INSERT INTO documents (
                        user_id, title, file_url, file_type, ocr_status,
                        extracted_amount, raw_ocr_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    uid, doc.get("filename", "Receipt Document"),
                    doc.get("file_url", ""), doc.get("type", "pdf"),
                    doc.get("ocr_status", "processed"),
                    abs(float(doc.get("total", 0.0))),
                    json.dumps(doc)
                ))
                new_id = cur.fetchone()[0]
                conn.commit()
                doc["id"] = str(new_id)
                return doc
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error adding document for {uid}: {e}")
        finally:
            self.put_conn(conn)

    def delete_document(self, uid: str, doc_id: str) -> Optional[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    DELETE FROM documents
                    WHERE user_id = %s AND (id::text = %s OR raw_ocr_data->>'id' = %s)
                    RETURNING id, raw_ocr_data;
                """, (uid, doc_id, doc_id))
                row = cur.fetchone()
                conn.commit()
                if row:
                    doc = row["raw_ocr_data"] or {}
                    doc["id"] = str(row["id"])
                    return doc
                return None
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error deleting document {doc_id}: {e}")
            return None
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # BALANCES & USER SETTINGS
    # --------------------------------------------------------------------------
    def get_balance(self, uid: str) -> float:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                conn.commit()
                cur.execute("SELECT monthly_budget_goal FROM user_settings WHERE user_id = %s;", (uid,))
                row = cur.fetchone()
                return float(row[0]) if row and row[0] is not None else 0.0
        except Exception as e:
            logger.error(f"Error getting balance for {uid}: {e}")
            return 0.0
        finally:
            self.put_conn(conn)

    def set_balance(self, uid: str, balance: float):
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                cur.execute("""
                    UPDATE user_settings SET monthly_budget_goal = %s WHERE user_id = %s;
                """, (balance, uid))
                conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error setting balance for {uid}: {e}")
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # CURRENCIES
    # --------------------------------------------------------------------------
    def get_currency(self, uid: str) -> Tuple[str, str]:
        if uid in self._currency_cache:
            return self._currency_cache[uid]
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                cur.execute("SELECT default_currency, currency_symbol FROM users WHERE id = %s;", (uid,))
                row = cur.fetchone()
                if row and row[0]:
                    res = (row[0], row[1] or "Rs ")
                    self._currency_cache[uid] = res
                    return res
                res = ("PKR", "Rs ")
                self._currency_cache[uid] = res
                return res
        except Exception as e:
            logger.error(f"Error getting currency for {uid}: {e}")
            return "PKR", "Rs "
        finally:
            self.put_conn(conn)

    def set_currency(self, uid: str, currency: str, symbol: str):
        self._currency_cache[uid] = (currency, symbol)
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                cur.execute("""
                    UPDATE users SET default_currency = %s, currency_symbol = %s WHERE id = %s;
                """, (currency, symbol, uid))
                conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error setting currency for {uid}: {e}")
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # RECURRING MONEY / BILLS / SUBSCRIPTIONS
    # --------------------------------------------------------------------------
    def get_recurring(self, uid: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, uid)
                conn.commit()
                cur.execute("""
                    SELECT id, title, amount, type, category, billing_cycle,
                           start_date, next_due_date, auto_pay, status, notes
                    FROM recurring_items
                    WHERE user_id = %s OR user_id = 'guest_user'
                    ORDER BY next_due_date ASC;
                """, (uid,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    amt = abs(float(r["amount"]))
                    is_income = (r["type"] == "income")
                    due_day = r["next_due_date"].day if r["next_due_date"] else 1
                    is_active = (r["status"] == "active")
                    results.append({
                        "id": str(r["id"]),
                        "name": r["title"],
                        "payee": r["notes"] or "Direct Payee",
                        "category": r["category"],
                        "amount": amt,
                        "isIncome": is_income,
                        "dueDay": due_day,
                        "frequency": r["billing_cycle"].capitalize(),
                        "nextDueDate": str(r["next_due_date"]) if r["next_due_date"] else "",
                        "autoDebit": r["auto_pay"],
                        "status": r["status"],
                        "isActive": is_active
                    })
                return results
        except Exception as e:
            logger.error(f"Error getting recurring for {uid}: {e}")
            return []
        finally:
            self.put_conn(conn)

    def add_recurring(self, uid: str, item: Dict[str, Any]):
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                self._ensure_user(cur, uid)
                abs_amt = abs(float(item.get("amount", 0.0)))
                if "isIncome" in item:
                    amt_type = "income" if item.get("isIncome") else "expense"
                else:
                    amt_type = "expense" if float(item.get("amount", 0.0)) < 0 else "income"
                freq = (item.get("frequency") or "monthly").lower()
                if freq not in ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']:
                    freq = 'monthly'

                cur.execute("""
                    INSERT INTO recurring_items (
                        user_id, title, amount, type, category, billing_cycle,
                        start_date, next_due_date, auto_pay, status, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', %s, %s, %s)
                    RETURNING id;
                """, (
                    uid, item.get("name", "Subscription"), abs_amt, amt_type,
                    item.get("category", "Subscriptions"), freq,
                    item.get("autoDebit", False), item.get("status", "active"),
                    item.get("payee", "")
                ))
                new_id = cur.fetchone()[0]
                conn.commit()
                item["id"] = str(new_id)
                item["isActive"] = True
                item["isIncome"] = (amt_type == "income")
                return item
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error adding recurring for {uid}: {e}")
        finally:
            self.put_conn(conn)

    def update_recurring(self, uid: str, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                fields = []
                params = []
                if "name" in updates:
                    fields.append("title = %s")
                    params.append(updates["name"])
                if "amount" in updates:
                    amt = abs(float(updates["amount"]))
                    fields.append("amount = %s")
                    params.append(amt)
                if "status" in updates:
                    fields.append("status = %s")
                    params.append(updates["status"])
                if "autoDebit" in updates:
                    fields.append("auto_pay = %s")
                    params.append(updates["autoDebit"])
                if "category" in updates:
                    fields.append("category = %s")
                    params.append(updates["category"])

                if not fields:
                    return None

                params.extend([uid, item_id])
                cur.execute(f"""
                    UPDATE recurring_items
                    SET {', '.join(fields)}
                    WHERE user_id = %s AND id::text = %s
                    RETURNING id, title, amount, status, auto_pay, category;
                """, tuple(params))
                row = cur.fetchone()
                conn.commit()
                if row:
                    return dict(row)
                return None
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error updating recurring item {item_id}: {e}")
            return None
        finally:
            self.put_conn(conn)

    def delete_recurring(self, uid: str, item_id: str) -> bool:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM recurring_items
                    WHERE user_id = %s AND id::text = %s;
                """, (uid, item_id))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error deleting recurring item {item_id}: {e}")
            return False
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # WORKSPACES / TEAMS (THEMES: PROJECT, FAMILY, FRIENDS, TEAM)
    # --------------------------------------------------------------------------
    def create_workspace(self, name: str, theme: str, created_by: str, currency: str = "PKR",
                         currency_symbol: str = "Rs ", description: str = "",
                         color_code: str = "#4F46E5", icon_name: str = "briefcase",
                         theme_settings: Optional[Dict[str, Any]] = None,
                         creator_email: Optional[str] = None,
                         creator_name: Optional[str] = None) -> Dict[str, Any]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                display_email = creator_email or "you@hissaby.pk"
                display_name = creator_name or "You (Creator)"

                # Ensure creator user profile has realistic email and display name
                cur.execute("""
                    INSERT INTO users (id, email, display_name, default_currency, currency_symbol)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        display_name = EXCLUDED.display_name;
                """, (created_by, display_email, display_name, currency, currency_symbol))
                
                # Theme specific default configurations
                default_settings = {
                    "allow_member_invites": True,
                    "require_receipts": theme == "project",
                    "allow_splits": theme in ["friends", "family"],
                    "milestones_enabled": theme == "project",
                    "billable_tracking": theme == "project",
                    "shared_allowances": theme == "family"
                }
                if theme_settings:
                    default_settings.update(theme_settings)

                cur.execute("""
                    INSERT INTO workspaces (
                        name, description, theme, currency, currency_symbol,
                        created_by, color_code, icon_name, theme_settings
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, name, description, theme, currency, currency_symbol,
                              color_code, icon_name, theme_settings, created_at;
                """, (
                    name, description, theme, currency, currency_symbol,
                    created_by, color_code, icon_name, json.dumps(default_settings)
                ))
                ws = dict(cur.fetchone())
                ws_id = ws["id"]

                # Automatically add creator as Owner with 'You (Creator)' custom title
                cur.execute("""
                    INSERT INTO workspace_members (workspace_id, user_id, role, custom_title)
                    VALUES (%s, %s, 'owner', %s);
                """, (ws_id, created_by, "You (Creator)"))

                # Seed theme-specific default extensible custom fields
                if theme == "project":
                    self._create_field_def_internal(cur, ws_id, created_by, "Billable Client", "client_name", "text", "Client company or name")
                    self._create_field_def_internal(cur, ws_id, created_by, "Project Milestone", "milestone", "text", "Milestone phase")
                    self._create_field_def_internal(cur, ws_id, created_by, "Tax Deductible", "tax_deductible", "boolean", "Is this expense tax deductible?")
                elif theme == "family":
                    self._create_field_def_internal(cur, ws_id, created_by, "Household Category", "household_cat", "select", "Category in home budget", options=["Groceries", "Utilities", "Kids & School", "Home Maintenance", "Healthcare"])
                    self._create_field_def_internal(cur, ws_id, created_by, "Purchased For", "purchased_for", "text", "Family member beneficiary")
                elif theme == "friends":
                    self._create_field_def_internal(cur, ws_id, created_by, "Trip or Event", "event_name", "text", "Name of outing or trip")
                    self._create_field_def_internal(cur, ws_id, created_by, "Split Method", "split_method", "select", "How to split", options=["Equal Split", "Exact Amount", "Percentage"])
                else: # team
                    self._create_field_def_internal(cur, ws_id, created_by, "Department", "department", "select", "Team department", options=["Engineering", "Design", "Marketing", "Operations", "Sales"])
                    self._create_field_def_internal(cur, ws_id, created_by, "Approved By", "approved_by", "text", "Manager approval name")

                # Log activity
                cur.execute("""
                    INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, details)
                    VALUES (%s, %s, 'workspace.created', 'workspace', %s, %s);
                """, (ws_id, created_by, ws_id, json.dumps({"theme": theme, "name": name})))

                conn.commit()
                ws["id"] = str(ws["id"])
                return ws
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error creating workspace: {e}")
            raise
        finally:
            self.put_conn(conn)

    def _create_field_def_internal(self, cur, ws_id, user_id, label, key, ftype, desc, options=None):
        cur.execute("""
            INSERT INTO custom_field_definitions (
                workspace_id, created_by, target_entity, field_name, field_key,
                field_type, description, options
            ) VALUES (%s, %s, 'transaction', %s, %s, %s, %s, %s)
            ON CONFLICT (workspace_id, target_entity, field_key) DO NOTHING;
        """, (ws_id, user_id, label, key, ftype, desc, json.dumps(options or [])))

    def get_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, user_id)
                conn.commit()
                cur.execute("""
                    SELECT w.id, w.name, w.description, w.theme, w.currency, w.currency_symbol,
                           w.color_code, w.icon_name, w.theme_settings, wm.role, wm.custom_title,
                           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
                           (SELECT COALESCE(SUM(amount), 0) FROM budgets WHERE workspace_id = w.id AND is_active = TRUE) as total_budget,
                           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE workspace_id = w.id AND type = 'expense') as total_spent
                    FROM workspaces w
                    JOIN workspace_members wm ON w.id = wm.workspace_id
                    WHERE wm.user_id = %s OR wm.user_id = 'guest_user'
                    ORDER BY w.created_at DESC;
                """, (user_id,))
                rows = cur.fetchall()
                results = []
                seen_ids = set()
                # Sort so user's direct membership is prioritized over guest_user fallback
                sorted_rows = sorted(rows, key=lambda r: 0 if r.get("user_id") == user_id else 1)
                for r in sorted_rows:
                    r_dict = dict(r)
                    ws_id = str(r_dict["id"])
                    if ws_id in seen_ids:
                        continue
                    seen_ids.add(ws_id)
                    r_dict["id"] = ws_id
                    r_dict["total_budget"] = float(r_dict["total_budget"])
                    r_dict["total_spent"] = float(r_dict["total_spent"])
                    results.append(r_dict)
                return results
        except Exception as e:
            logger.error(f"Error fetching workspaces for {user_id}: {e}")
            return []
        finally:
            self.put_conn(conn)

    def get_workspace(self, workspace_id: str) -> Optional[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT w.id, w.name, w.description, w.theme, w.currency, w.currency_symbol,
                           w.color_code, w.icon_name, w.theme_settings, w.created_by, w.created_at,
                           (SELECT COALESCE(SUM(amount), 0) FROM budgets WHERE workspace_id = w.id AND is_active = TRUE) as total_budget,
                           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE workspace_id = w.id AND type = 'expense') as total_spent
                    FROM workspaces w
                    WHERE w.id::text = %s;
                """, (workspace_id,))
                row = cur.fetchone()
                if not row:
                    return None
                r = dict(row)
                r["id"] = str(r["id"])
                r["total_budget"] = float(r["total_budget"])
                r["total_spent"] = float(r["total_spent"])
                return r
        except Exception as e:
            logger.error(f"Error fetching workspace {workspace_id}: {e}")
            return None
        finally:
            self.put_conn(conn)

    def add_workspace_member(self, workspace_id: str, user_id: str, role: str = "member",
                             spending_limit: Optional[float] = None, custom_title: str = "") -> Dict[str, Any]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, user_id)
                cur.execute("""
                    INSERT INTO workspace_members (workspace_id, user_id, role, spending_limit, custom_title)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (workspace_id, user_id) DO UPDATE
                    SET role = EXCLUDED.role, spending_limit = EXCLUDED.spending_limit, custom_title = EXCLUDED.custom_title
                    RETURNING id, workspace_id, user_id, role, spending_limit, custom_title, joined_at;
                """, (workspace_id, user_id, role, spending_limit, custom_title))
                member = dict(cur.fetchone())
                conn.commit()
                member["id"] = str(member["id"])
                member["workspace_id"] = str(member["workspace_id"])
                return member
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error adding workspace member: {e}")
            raise
        finally:
            self.put_conn(conn)

    def get_workspace_members(self, workspace_id: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.spending_limit,
                           COALESCE(NULLIF(wm.custom_title, ''), CASE WHEN wm.role = 'owner' THEN 'You (Creator)' ELSE 'Member' END) as custom_title,
                           wm.joined_at,
                           COALESCE(NULLIF(u.display_name, ''), CASE WHEN wm.role = 'owner' THEN 'Creator' ELSE 'Member' END) as display_name,
                           CASE
                               WHEN u.email IS NULL OR u.email LIKE '%%@hissaby.local' THEN 'you@hissaby.pk'
                               ELSE u.email
                           END as email,
                           u.avatar_url,
                           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE workspace_id = wm.workspace_id AND payer_id = wm.user_id) as total_spent
                    FROM workspace_members wm
                    JOIN users u ON wm.user_id = u.id
                    WHERE wm.workspace_id::text = %s
                    ORDER BY wm.joined_at ASC;
                """, (workspace_id,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["id"] = str(d["id"])
                    d["workspace_id"] = str(d["workspace_id"])
                    d["total_spent"] = float(d["total_spent"])
                    results.append(d)
                return results
        except Exception as e:
            logger.error(f"Error getting workspace members {workspace_id}: {e}")
            return []
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # BUDGETS & TEAM SPENDING
    # --------------------------------------------------------------------------
    def create_budget(self, workspace_id: str, name: str, amount: float, period: str = "monthly",
                      start_date: Optional[str] = None, end_date: Optional[str] = None,
                      alert_threshold_percent: int = 80, created_by: Optional[str] = None,
                      categories: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if created_by:
                    self._ensure_user(cur, created_by)
                cur.execute("""
                    INSERT INTO budgets (
                        workspace_id, user_id, name, amount, period,
                        start_date, end_date, alert_threshold_percent
                    ) VALUES (%s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE), %s::date, %s)
                    RETURNING id, workspace_id, name, amount, period, start_date, end_date, alert_threshold_percent, created_at;
                """, (
                    workspace_id, created_by, name, amount, period,
                    start_date, end_date, alert_threshold_percent
                ))
                b = dict(cur.fetchone())
                budget_id = b["id"]

                if categories:
                    for cat in categories:
                        cur.execute("""
                            INSERT INTO budget_category_allocations (budget_id, category, allocated_amount)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (budget_id, category) DO UPDATE
                            SET allocated_amount = EXCLUDED.allocated_amount;
                        """, (budget_id, cat["category"], cat["amount"]))

                cur.execute("""
                    INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, details)
                    VALUES (%s, %s, 'budget.created', 'budget', %s, %s);
                """, (workspace_id, created_by, budget_id, json.dumps({"name": name, "amount": amount})))

                conn.commit()
                b["id"] = str(b["id"])
                b["workspace_id"] = str(b["workspace_id"])
                b["amount"] = float(b["amount"])
                return b
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error creating budget: {e}")
            raise
        finally:
            self.put_conn(conn)

    def get_budgets(self, workspace_id: str) -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT b.id, b.workspace_id, b.name, b.amount, b.period, b.start_date,
                           b.end_date, b.alert_threshold_percent, b.is_active, b.created_at,
                           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE budget_id = b.id AND type = 'expense') as current_spent
                    FROM budgets b
                    WHERE b.workspace_id::text = %s
                    ORDER BY b.created_at DESC;
                """, (workspace_id,))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["id"] = str(d["id"])
                    d["workspace_id"] = str(d["workspace_id"])
                    d["amount"] = float(d["amount"])
                    d["current_spent"] = float(d["current_spent"])
                    d["remaining"] = max(d["amount"] - d["current_spent"], 0.0)
                    d["percentage_used"] = round((d["current_spent"] / d["amount"] * 100) if d["amount"] > 0 else 0, 1)
                    results.append(d)
                return results
        except Exception as e:
            logger.error(f"Error getting budgets for workspace {workspace_id}: {e}")
            return []
        finally:
            self.put_conn(conn)

    def add_team_spending(self, workspace_id: str, payer_id: str, user_id: str,
                          amount: float, category: str, description: str,
                          budget_id: Optional[str] = None, receipt_url: Optional[str] = None,
                          custom_fields: Optional[Dict[str, Any]] = None,
                          splits: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, user_id)
                if payer_id and payer_id != user_id:
                    self._ensure_user(cur, payer_id)

                cur.execute("""
                    INSERT INTO transactions (
                        workspace_id, user_id, payer_id, budget_id, amount,
                        type, category, description, receipt_url, source, status
                    ) VALUES (%s, %s, %s, %s, %s, 'expense', %s, %s, %s, 'team_expense', 'cleared')
                    RETURNING id, workspace_id, user_id, payer_id, budget_id, amount,
                              category, description, receipt_url, transaction_date;
                """, (
                    workspace_id, user_id, payer_id or user_id, budget_id,
                    amount, category, description, receipt_url
                ))
                tx = dict(cur.fetchone())
                tx_id = tx["id"]

                # Save dynamic custom field values
                if custom_fields:
                    for field_id, f_val in custom_fields.items():
                        self._set_field_value_internal(cur, field_id, tx_id, f_val)

                # Save splits if applicable
                if splits:
                    for s in splits:
                        self._ensure_user(cur, s["user_id"])
                        cur.execute("""
                            INSERT INTO transaction_splits (transaction_id, user_id, split_amount, split_percentage, notes)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (transaction_id, user_id) DO UPDATE
                            SET split_amount = EXCLUDED.split_amount;
                        """, (tx_id, s["user_id"], s["split_amount"], s.get("split_percentage"), s.get("notes")))

                # Log activity
                cur.execute("""
                    INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, details)
                    VALUES (%s, %s, 'spending.added', 'transaction', %s, %s);
                """, (workspace_id, user_id, tx_id, json.dumps({"amount": amount, "category": category, "description": description})))

                conn.commit()
                tx["id"] = str(tx["id"])
                tx["workspace_id"] = str(tx["workspace_id"])
                tx["amount"] = float(tx["amount"])
                return tx
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error adding team spending: {e}")
            raise
        finally:
            self.put_conn(conn)

    # --------------------------------------------------------------------------
    # DYNAMIC CUSTOM FIELDS (USER EXTENSIBILITY ENGINE)
    # --------------------------------------------------------------------------
    def create_custom_field(self, workspace_id: Optional[str], created_by: str,
                            field_name: str, field_key: str, field_type: str = "text",
                            target_entity: str = "transaction", description: str = "",
                            placeholder: str = "", is_required: bool = False,
                            options: Optional[List[str]] = None, display_order: int = 0) -> Dict[str, Any]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._ensure_user(cur, created_by)
                cur.execute("""
                    INSERT INTO custom_field_definitions (
                        workspace_id, created_by, target_entity, field_name, field_key,
                        field_type, description, placeholder, is_required, options, display_order
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, workspace_id, field_name, field_key, field_type,
                              target_entity, description, placeholder, is_required, options, display_order;
                """, (
                    workspace_id, created_by, target_entity, field_name, field_key,
                    field_type, description, placeholder, is_required,
                    json.dumps(options or []), display_order
                ))
                field = dict(cur.fetchone())
                conn.commit()
                field["id"] = str(field["id"])
                return field
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error creating custom field: {e}")
            raise
        finally:
            self.put_conn(conn)

    def get_custom_fields(self, workspace_id: Optional[str], target_entity: str = "transaction") -> List[Dict[str, Any]]:
        conn = None
        try:
            conn = self.get_conn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, workspace_id, target_entity, field_name, field_key, field_type,
                           description, placeholder, is_required, options, display_order
                    FROM custom_field_definitions
                    WHERE (workspace_id::text = %s OR workspace_id IS NULL)
                      AND target_entity = %s
                      AND is_active = TRUE
                    ORDER BY display_order ASC, created_at ASC;
                """, (workspace_id, target_entity))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["id"] = str(d["id"])
                    d["workspace_id"] = str(d["workspace_id"]) if d["workspace_id"] else None
                    results.append(d)
                return results
        except Exception as e:
            logger.error(f"Error getting custom fields: {e}")
            return []
        finally:
            self.put_conn(conn)

    def _set_field_value_internal(self, cur, field_id, target_id, value):
        text_v = None
        num_v = None
        date_v = None
        bool_v = None
        json_v = None

        if isinstance(value, bool):
            bool_v = value
        elif isinstance(value, (int, float)):
            num_v = float(value)
        elif isinstance(value, (dict, list)):
            json_v = json.dumps(value)
        else:
            text_v = str(value)

        cur.execute("""
            INSERT INTO custom_field_values (
                field_id, target_id, text_value, numeric_value, date_value, boolean_value, json_value
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (field_id, target_id) DO UPDATE
            SET text_value = EXCLUDED.text_value,
                numeric_value = EXCLUDED.numeric_value,
                date_value = EXCLUDED.date_value,
                boolean_value = EXCLUDED.boolean_value,
                json_value = EXCLUDED.json_value;
        """, (field_id, target_id, text_v, num_v, date_v, bool_v, json_v))

    def get_custom_field_values_for_target(self, target_id: str, existing_conn=None) -> Dict[str, Any]:
        conn = existing_conn or self.get_conn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT cfd.field_key, cfd.field_name, cfd.field_type,
                           cfv.text_value, cfv.numeric_value, cfv.date_value, cfv.boolean_value, cfv.json_value
                    FROM custom_field_values cfv
                    JOIN custom_field_definitions cfd ON cfv.field_id = cfd.id
                    WHERE cfv.target_id::text = %s;
                """, (target_id,))
                rows = cur.fetchall()
                result = {}
                for r in rows:
                    val = r["text_value"]
                    if r["numeric_value"] is not None:
                        val = float(r["numeric_value"])
                    elif r["boolean_value"] is not None:
                        val = r["boolean_value"]
                    elif r["date_value"] is not None:
                        val = str(r["date_value"])
                    elif r["json_value"] is not None:
                        val = r["json_value"]
                    result[r["field_key"]] = {
                        "name": r["field_name"],
                        "type": r["field_type"],
                        "value": val
                    }
                return result
        except Exception as e:
            logger.error(f"Error getting custom field values for {target_id}: {e}")
            return {}
        finally:
            if not existing_conn and conn:
                self.put_conn(conn)

    # --------------------------------------------------------------------------
    # PROXY DICTIONARIES FOR RETRO-COMPATIBILITY
    # --------------------------------------------------------------------------
    class _DictProxy:
        def __init__(self, service, entity_name):
            self.service = service
            self.entity_name = entity_name

        def get(self, uid, default=None):
            if self.entity_name == "transactions":
                return self.service.get_transactions(uid) or default
            elif self.entity_name == "documents":
                return self.service.get_documents(uid) or default
            elif self.entity_name == "balances":
                val = self.service.get_balance(uid)
                return val if val is not None else default
            elif self.entity_name == "currencies":
                curr, _ = self.service.get_currency(uid)
                return curr or default
            elif self.entity_name == "symbols":
                _, sym = self.service.get_currency(uid)
                return sym or default
            elif self.entity_name == "recurring":
                return self.service.get_recurring(uid) or default
            return default

        def __getitem__(self, uid):
            res = self.get(uid)
            if res is None:
                raise KeyError(uid)
            return res

        def __contains__(self, uid):
            return True

        def values(self):
            return []

    @property
    def transactions(self):
        return self._DictProxy(self, "transactions")

    @property
    def documents(self):
        return self._DictProxy(self, "documents")

    @property
    def balances(self):
        return self._DictProxy(self, "balances")

    @property
    def currencies(self):
        return self._DictProxy(self, "currencies")

    @property
    def symbols(self):
        return self._DictProxy(self, "symbols")

    @property
    def recurring(self):
        return self._DictProxy(self, "recurring")

    def save(self):
        # Database operations commit immediately; no-op for JSON file saving
        pass

# Singleton instance exported for application usage
storage_service = PostgresStorageService()
