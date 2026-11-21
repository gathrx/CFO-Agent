"""
Agent Orchestrator — Pipeline runner connecting all agents for the screenshot upload flow.
OCR → Categorize → Split (high-confidence → save | low-confidence → pending review)
"""
import logging
from typing import List, Tuple

from models.transaction import (
    Transaction,
    TransactionCategory,
    RawExtractedTransaction,
)
from agents.ocr_agent import ocr_agent
from agents.categorization_agent import categorization_agent
from agents.persistence_agent import persistence_agent
from config.settings import settings

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Runs the full pipeline for screenshot-based transaction ingestion:
    1. OCR extraction (Gemini Vision)
    2. Categorization (Gemini LLM + keyword rules)
    3. Route: high-confidence → persist; low-confidence → pending review queue
    """

    def process_screenshot(
        self, image_bytes: bytes, default_date: str = None
    ) -> Tuple[List[Transaction], List[Transaction]]:
        """
        Process a GPay screenshot end-to-end.
        Returns: (confirmed_transactions, pending_review_transactions)
        """
        from datetime import date as dt_date
        today = default_date or dt_date.today().isoformat()

        # Step 1: OCR
        logger.info("Step 1: Running OCR extraction...")
        raw_transactions: List[RawExtractedTransaction] = ocr_agent.extract_transactions(image_bytes)
        logger.info(f"Extracted {len(raw_transactions)} transactions from screenshot")

        if not raw_transactions:
            logger.warning("No transactions found in screenshot")
            return [], []

        # Step 2: Categorize
        logger.info("Step 2: Categorizing transactions...")
        confirmed = []
        pending_review = []

        for raw in raw_transactions:
            cat_result = categorization_agent.categorize(raw.merchant_name, raw.amount)

            txn_date = raw.date if raw.date else today
            needs_review = cat_result.confidence < settings.LOW_CONFIDENCE_THRESHOLD

            txn = Transaction(
                merchant=raw.merchant_name,
                amount=raw.amount,
                date=txn_date,
                time=raw.time,
                payment_method="GPay",
                category=cat_result.category,
                sub_category=cat_result.sub_category,
                confidence=cat_result.confidence,
                reasoning=cat_result.reasoning,
                reviewed=not needs_review,
                needs_review=needs_review,
                source="screenshot",
            )

            # Step 3: Route
            if needs_review:
                persistence_agent.save_pending_transaction(txn)
                pending_review.append(txn)
                logger.info(
                    f"→ Pending review: {txn.merchant} (confidence={cat_result.confidence:.2f})"
                )
            else:
                persistence_agent.save_transaction(txn)
                confirmed.append(txn)
                logger.info(
                    f"→ Confirmed: {txn.merchant} → {txn.category.value} (confidence={cat_result.confidence:.2f})"
                )

        logger.info(
            f"Pipeline complete: {len(confirmed)} confirmed, {len(pending_review)} pending review"
        )
        return confirmed, pending_review

    def confirm_pending_transaction(
        self,
        transaction_id: str,
        new_category: TransactionCategory = None,
        new_sub_category: str = None,
    ) -> Transaction:
        """Human confirms or corrects a pending transaction."""
        txn = persistence_agent.confirm_transaction(
            transaction_id, new_category, new_sub_category
        )
        if txn:
            logger.info(
                f"Human confirmed {transaction_id} as {txn.category.value}"
            )
        return txn


# Singleton
orchestrator = AgentOrchestrator()

