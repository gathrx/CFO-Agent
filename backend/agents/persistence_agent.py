"""
Persistence Agent — Firestore CRUD for transactions and alerts.
"""
import logging
from typing import List, Optional
from datetime import datetime, date

from google.cloud import firestore

from config.settings import settings
from models.transaction import Transaction, NightlyAlert, TransactionCategory

logger = logging.getLogger(__name__)

_db: Optional[firestore.Client] = None


def get_db() -> firestore.Client:
    global _db
    if _db is None:
        _db = firestore.Client(project=settings.GCP_PROJECT_ID)
    return _db


class PersistenceAgent:
    def __init__(self):
        self.col_txn = settings.FIRESTORE_COLLECTION_TRANSACTIONS
        self.col_alerts = settings.FIRESTORE_COLLECTION_ALERTS
        self.col_pending = settings.FIRESTORE_COLLECTION_PENDING

    @property
    def db(self) -> firestore.Client:
        return get_db()

    # ─── Transactions ────────────────────────────────────────────────────────

    def save_transaction(self, transaction: Transaction) -> str:
        """Save a transaction to Firestore."""
        doc_ref = self.db.collection(self.col_txn).document(transaction.id)
        doc_ref.set(transaction.to_dict())
        logger.info(f"Saved transaction {transaction.id} — {transaction.merchant} ₹{transaction.amount}")
        return transaction.id

    def save_pending_transaction(self, transaction: Transaction) -> str:
        """Save a transaction pending human review."""
        doc_ref = self.db.collection(self.col_pending).document(transaction.id)
        doc_ref.set(transaction.to_dict())
        return transaction.id

    def get_pending_transactions(self) -> List[Transaction]:
        """Get all transactions pending human review."""
        docs = self.db.collection(self.col_pending).stream()
        return [Transaction.from_dict(doc.to_dict()) for doc in docs]

    def confirm_transaction(
        self,
        transaction_id: str,
        new_category: Optional[TransactionCategory] = None,
        new_sub_category: Optional[str] = None,
    ) -> Optional[Transaction]:
        """Move transaction from pending to confirmed collection."""
        pending_ref = self.db.collection(self.col_pending).document(transaction_id)
        doc = pending_ref.get()
        if not doc.exists:
            logger.warning(f"Pending transaction {transaction_id} not found")
            return None

        data = doc.to_dict()
        data["reviewed"] = True
        data["needs_review"] = False
        if new_category:
            data["category"] = new_category.value
        if new_sub_category:
            data["sub_category"] = new_sub_category

        # Move to main collection
        self.db.collection(self.col_txn).document(transaction_id).set(data)
        pending_ref.delete()

        return Transaction.from_dict(data)

    def update_transaction_category(
        self,
        transaction_id: str,
        new_category: TransactionCategory,
        new_sub_category: Optional[str] = None,
    ) -> bool:
        """Update category of an existing confirmed transaction."""
        doc_ref = self.db.collection(self.col_txn).document(transaction_id)
        update_data = {"category": new_category.value, "reviewed": True}
        if new_sub_category:
            update_data["sub_category"] = new_sub_category
        doc_ref.update(update_data)
        return True

    def get_transactions(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[Transaction]:
        """Query transactions with optional filters."""
        query = self.db.collection(self.col_txn)
        if start_date:
            query = query.where("date", ">=", start_date)
        if end_date:
            query = query.where("date", "<=", end_date)
        if category:
            query = query.where("category", "==", category)

        docs = query.order_by("date", direction=firestore.Query.DESCENDING).stream()
        return [Transaction.from_dict(doc.to_dict()) for doc in docs]

    def get_today_transactions(self) -> List[Transaction]:
        today = date.today().isoformat()
        return self.get_transactions(start_date=today, end_date=today)

    # ─── Alerts ──────────────────────────────────────────────────────────────

    def save_nightly_alert(self, alert: NightlyAlert) -> str:
        doc_ref = self.db.collection(self.col_alerts).document(alert.id)
        doc_ref.set(alert.to_dict())
        logger.info(f"Saved nightly alert for {alert.date}")
        return alert.id

    def get_nightly_alerts(self, limit: int = 30) -> List[dict]:
        docs = (
            self.db.collection(self.col_alerts)
            .order_by("date", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        return [doc.to_dict() for doc in docs]


# Singleton
persistence_agent = PersistenceAgent()

