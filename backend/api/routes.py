"""
FastAPI Routes — All API endpoints for the Personal CFO system.
"""
import logging
from typing import Optional, List
from datetime import date, timedelta

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Body
from fastapi.responses import JSONResponse

from models.transaction import (
    Transaction,
    TransactionCreate,
    CategoryReview,
    TransactionCategory,
    CATEGORY_SUBCATEGORIES,
    CATEGORY_COLORS,
)
from orchestrator.agent_runner import orchestrator
from agents.persistence_agent import persistence_agent
from agents.analytics_agent import analytics_agent
from agents.alert_agent import alert_agent

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Utility ─────────────────────────────────────────────────────────────────

def _date_range(days: int = 30):
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=days)).isoformat()
    return start, end


# ─── Screenshot Upload ────────────────────────────────────────────────────────

@router.post("/api/transactions/upload-screenshot")
async def upload_screenshot(file: UploadFile = File(...)):
    """Upload a GPay screenshot; returns extracted + categorized transactions."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (PNG, JPG, WebP, etc.)")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Image too large. Max 10MB.")

    confirmed, pending = orchestrator.process_screenshot(contents)

    return {
        "confirmed": [t.to_dict() for t in confirmed],
        "pending_review": [t.to_dict() for t in pending],
        "summary": {
            "total_extracted": len(confirmed) + len(pending),
            "auto_confirmed": len(confirmed),
            "needs_review": len(pending),
        },
    }


# ─── Pending Review ───────────────────────────────────────────────────────────

@router.get("/api/transactions/pending-review")
async def get_pending_review():
    """Get all transactions pending human review."""
    try:
        pending = persistence_agent.get_pending_transactions()
        return {"transactions": [t.to_dict() for t in pending], "count": len(pending)}
    except Exception as e:
        logger.error(f"Error fetching pending: {e}")
        raise HTTPException(500, str(e))


@router.post("/api/transactions/confirm-review")
async def confirm_review(review: CategoryReview):
    """Human confirms or corrects a transaction category."""
    try:
        txn = orchestrator.confirm_pending_transaction(
            review.transaction_id,
            review.new_category,
            review.new_sub_category,
        )
        if not txn:
            raise HTTPException(404, f"Transaction {review.transaction_id} not found in pending queue")
        return {"success": True, "transaction": txn.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming review: {e}")
        raise HTTPException(500, str(e))


# ─── Manual Entry ─────────────────────────────────────────────────────────────

@router.post("/api/transactions/manual")
async def add_manual_transaction(data: TransactionCreate):
    """Add a transaction manually (cash, credit card, etc.)."""
    try:
        txn = Transaction(
            merchant=data.merchant,
            amount=data.amount,
            date=data.date,
            payment_method=data.payment_method,
            category=data.category,
            sub_category=data.sub_category,
            confidence=1.0,
            reasoning="Manual entry by user",
            reviewed=True,
            needs_review=False,
            source="manual",
            notes=data.notes,
        )
        persistence_agent.save_transaction(txn)
        return {"success": True, "transaction": txn.to_dict()}
    except Exception as e:
        logger.error(f"Error adding manual transaction: {e}")
        raise HTTPException(500, str(e))


# ─── Transactions List ────────────────────────────────────────────────────────

@router.get("/api/transactions")
async def get_transactions(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    days: Optional[int] = Query(30),
):
    """Get transactions with optional filters."""
    try:
        if not start_date and not end_date:
            start_date, end_date = _date_range(days)

        txns = persistence_agent.get_transactions(
            start_date=start_date, end_date=end_date, category=category
        )
        return {
            "transactions": [t.to_dict() for t in txns],
            "count": len(txns),
            "start_date": start_date,
            "end_date": end_date,
        }
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        raise HTTPException(500, str(e))


@router.patch("/api/transactions/{transaction_id}/category")
async def update_category(
    transaction_id: str,
    review: CategoryReview,
):
    """Update category of a confirmed transaction."""
    try:
        success = persistence_agent.update_transaction_category(
            transaction_id, review.new_category, review.new_sub_category
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/api/analytics/daily")
async def get_daily_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    days: int = Query(30),
):
    """Daily spending by category for the stacked bar chart."""
    try:
        if not start_date:
            start_date, end_date = _date_range(days)
        txns = persistence_agent.get_transactions(start_date=start_date, end_date=end_date)
        data = analytics_agent.get_daily_distribution(txns)
        return {"data": data, "start_date": start_date, "end_date": end_date}
    except Exception as e:
        logger.error(f"Error in daily analytics: {e}")
        raise HTTPException(500, str(e))


@router.get("/api/analytics/cumulative")
async def get_cumulative_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    days: int = Query(30),
):
    """Cumulative spending by category over time."""
    try:
        if not start_date:
            start_date, end_date = _date_range(days)
        txns = persistence_agent.get_transactions(start_date=start_date, end_date=end_date)
        data = analytics_agent.get_cumulative_by_category(txns)
        return {"data": data, "start_date": start_date, "end_date": end_date}
    except Exception as e:
        logger.error(f"Error in cumulative analytics: {e}")
        raise HTTPException(500, str(e))


@router.get("/api/analytics/summary")
async def get_summary(days: int = Query(30)):
    """Overall summary: totals, investment ratio, goal progress."""
    try:
        start_date, end_date = _date_range(days)
        txns = persistence_agent.get_transactions(start_date=start_date, end_date=end_date)
        summary = analytics_agent.get_summary(txns)
        return summary
    except Exception as e:
        logger.error(f"Error in summary: {e}")
        raise HTTPException(500, str(e))


# ─── Nightly Alerts ───────────────────────────────────────────────────────────

@router.get("/api/alerts")
async def get_alerts(limit: int = Query(30)):
    """Get nightly alert history."""
    try:
        alerts = persistence_agent.get_nightly_alerts(limit=limit)
        return {"alerts": alerts, "count": len(alerts)}
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        raise HTTPException(500, str(e))


@router.post("/api/alerts/generate")
async def generate_alert(target_date: Optional[str] = Body(None, embed=True)):
    """Manually trigger nightly alert generation."""
    try:
        alert = await alert_agent.generate_nightly_alert(target_date)
        return {"success": True, "alert": alert.to_dict()}
    except Exception as e:
        logger.error(f"Error generating alert: {e}")
        raise HTTPException(500, str(e))


# ─── Metadata ─────────────────────────────────────────────────────────────────

@router.get("/api/categories")
async def get_categories():
    """Return all categories, sub-categories, and colors."""
    return {
        "categories": [
            {
                "value": cat.value,
                "label": cat.value.replace("_", " "),
                "color": CATEGORY_COLORS[cat],
                "sub_categories": CATEGORY_SUBCATEGORIES[cat],
            }
            for cat in TransactionCategory
        ]
    }

