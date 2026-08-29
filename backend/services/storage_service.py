import json
import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("hisaaby.storage")

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
STORE_FILE = os.path.join(DATA_DIR, "hisaaby_store.json")

class StorageService:
    def __init__(self):
        self._ensure_dir()
        self.transactions: Dict[str, List[Dict[str, Any]]] = {}
        self.balances: Dict[str, float] = {}
        self.documents: Dict[str, List[Dict[str, Any]]] = {}
        self.currencies: Dict[str, str] = {}
        self.symbols: Dict[str, str] = {}
        self.recurring: Dict[str, List[Dict[str, Any]]] = {}
        self.load()

    def _ensure_dir(self):
        os.makedirs(DATA_DIR, exist_ok=True)

    def load(self):
        if not os.path.exists(STORE_FILE):
            logger.info("No existing persistent storage file found. Starting fresh.")
            return
        try:
            with open(STORE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.transactions = data.get("transactions", {})
                self.balances = data.get("balances", {})
                self.documents = data.get("documents", {})
                self.currencies = data.get("currencies", {})
                self.symbols = data.get("symbols", {})
                self.recurring = data.get("recurring", {})
                tx_count = sum(len(v) for v in self.transactions.values())
                doc_count = sum(len(v) for v in self.documents.values())
                rec_count = sum(len(v) for v in self.recurring.values())
                logger.info(f"Loaded persistent storage: {tx_count} txs, {doc_count} docs, {rec_count} recurring items from {STORE_FILE}")
        except Exception as e:
            logger.error(f"Error loading persistent storage: {e}")

    def save(self):
        try:
            self._ensure_dir()
            data = {
                "transactions": self.transactions,
                "balances": self.balances,
                "documents": self.documents,
                "currencies": self.currencies,
                "symbols": self.symbols,
                "recurring": self.recurring
            }
            temp_file = STORE_FILE + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(temp_file, STORE_FILE)
        except Exception as e:
            logger.error(f"Error saving persistent storage: {e}")

    def _resolve_uid(self, uid: str) -> str:
        if uid and uid != "guest_user" and uid not in self.transactions and "guest_user" in self.transactions:
            self.migrate_guest_data(uid)
        return uid

    def migrate_guest_data(self, new_uid: str):
        if "guest_user" in self.transactions:
            self.transactions[new_uid] = self.transactions.get(new_uid, []) + self.transactions.pop("guest_user")
        if "guest_user" in self.documents:
            self.documents[new_uid] = self.documents.get(new_uid, []) + self.documents.pop("guest_user")
        if "guest_user" in self.balances:
            self.balances[new_uid] = max(self.balances.get(new_uid, 0.0), self.balances.pop("guest_user"))
        if "guest_user" in self.currencies:
            self.currencies[new_uid] = self.currencies.pop("guest_user")
        if "guest_user" in self.symbols:
            self.symbols[new_uid] = self.symbols.pop("guest_user")
        if "guest_user" in self.recurring:
            self.recurring[new_uid] = self.recurring.get(new_uid, []) + self.recurring.pop("guest_user")
        self.save()
        logger.info(f"Migrated guest_user records to user {new_uid}")

    # Transactions
    def get_transactions(self, uid: str) -> List[Dict[str, Any]]:
        self._resolve_uid(uid)
        if uid not in self.transactions and "guest_user" in self.transactions:
            return self.transactions["guest_user"]
        return self.transactions.get(uid, [])

    def add_transaction(self, uid: str, tx: Dict[str, Any], prepend: bool = True):
        self._resolve_uid(uid)
        if uid not in self.transactions:
            self.transactions[uid] = []
        if prepend:
            self.transactions[uid].insert(0, tx)
        else:
            self.transactions[uid].append(tx)
        self.save()

    def remove_transactions_by_source(self, uid: str, source_name: str, doc_id: Optional[str] = None):
        if uid in self.transactions:
            self.transactions[uid] = [
                tx for tx in self.transactions[uid]
                if tx.get("source") != source_name and (not doc_id or tx.get("source") != doc_id)
            ]
            self.save()

    # Documents
    def get_documents(self, uid: str) -> List[Dict[str, Any]]:
        self._resolve_uid(uid)
        if uid not in self.documents and "guest_user" in self.documents:
            return self.documents["guest_user"]
        return self.documents.get(uid, [])

    def add_document(self, uid: str, doc: Dict[str, Any]):
        self._resolve_uid(uid)
        if uid not in self.documents:
            self.documents[uid] = []
        self.documents[uid].insert(0, doc)
        self.save()

    def delete_document(self, uid: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if uid in self.documents:
            for idx, d in enumerate(self.documents[uid]):
                if d.get("id") == doc_id:
                    removed = self.documents[uid].pop(idx)
                    self.save()
                    return removed
        return None

    # Balances
    def get_balance(self, uid: str) -> float:
        self._resolve_uid(uid)
        if uid not in self.balances and "guest_user" in self.balances:
            return self.balances["guest_user"]
        return self.balances.get(uid, 0.0)

    def set_balance(self, uid: str, balance: float):
        self.balances[uid] = balance
        self.save()

    # Currencies
    def get_currency(self, uid: str):
        self._resolve_uid(uid)
        curr = self.currencies.get(uid) or self.currencies.get("guest_user") or "PKR"
        sym = self.symbols.get(uid) or self.symbols.get("guest_user") or "Rs "
        return curr, sym

    def set_currency(self, uid: str, currency: str, symbol: str):
        self.currencies[uid] = currency
        self.symbols[uid] = symbol
        self.save()

    # Recurring Money / Subscriptions / Bills
    def get_recurring(self, uid: str) -> List[Dict[str, Any]]:
        self._resolve_uid(uid)
        if uid not in self.recurring and "guest_user" in self.recurring:
            return self.recurring["guest_user"]
        return self.recurring.get(uid, [])

    def add_recurring(self, uid: str, item: Dict[str, Any]):
        self._resolve_uid(uid)
        if uid not in self.recurring:
            self.recurring[uid] = []
        self.recurring[uid].insert(0, item)
        self.save()

    def update_recurring(self, uid: str, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self._resolve_uid(uid)
        items = self.get_recurring(uid)
        for item in items:
            if item.get("id") == item_id:
                item.update(updates)
                self.save()
                return item
        return None

    def delete_recurring(self, uid: str, item_id: str) -> bool:
        self._resolve_uid(uid)
        if uid in self.recurring:
            initial_len = len(self.recurring[uid])
            self.recurring[uid] = [i for i in self.recurring[uid] if i.get("id") != item_id]
            if len(self.recurring[uid]) < initial_len:
                self.save()
                return True
        return False

storage_service = StorageService()
