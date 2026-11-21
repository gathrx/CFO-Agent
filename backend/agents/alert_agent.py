"""
Alert Agent — Generates nightly expenditure alerts and schedules them via APScheduler.
Runs every night at 9 PM IST by default.
"""
import logging
from typing import Optional
from datetime import date, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config.settings import settings
from models.transaction import NightlyAlert
from agents.persistence_agent import persistence_agent
from agents.analytics_agent import analytics_agent
from agents.recommendation_agent import recommendation_agent

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


class AlertAgent:

    async def generate_nightly_alert(self, alert_date: Optional[str] = None) -> NightlyAlert:
        """Generate a nightly alert for a given date (defaults to today)."""
        from typing import Optional
        target_date = alert_date or date.today().isoformat()

        # Fetch today's transactions
        try:
            today_transactions = persistence_agent.get_transactions(
                start_date=target_date, end_date=target_date
            )
        except Exception as e:
            logger.error(f"Failed to fetch transactions for alert: {e}")
            today_transactions = []

        # Compute summary for today
        summary = analytics_agent.get_summary(today_transactions)

        # Fetch last 30 days for recommendations
        try:
            from datetime import timedelta
            start_30d = (
                date.fromisoformat(target_date) - timedelta(days=30)
            ).isoformat()
            transactions_30d = persistence_agent.get_transactions(
                start_date=start_30d, end_date=target_date
            )
        except Exception as e:
            logger.error(f"Failed to fetch 30d transactions: {e}")
            transactions_30d = today_transactions

        summary_30d = analytics_agent.get_summary(transactions_30d)
        investment_ratio = summary_30d.get("investment_ratio", 0)
        goal_gap = settings.MONTHLY_INVESTMENT_GOAL_PCT - investment_ratio

        # Generate recommendations
        recommendations = recommendation_agent.generate_recommendations(
            transactions_30d, summary_30d
        )

        # Build alert
        alert = NightlyAlert(
            date=target_date,
            total_spent=summary.get("today_total", 0),
            by_category=summary.get("by_category", {}),
            top_merchants=summary.get("top_merchants", [])[:5],
            investment_ratio=investment_ratio,
            goal_gap=round(goal_gap, 2),
            recommendations=recommendations,
        )

        # Persist
        try:
            persistence_agent.save_nightly_alert(alert)
        except Exception as e:
            logger.error(f"Failed to save nightly alert: {e}")

        logger.info(
            f"🌙 Nightly alert generated for {target_date}: "
            f"₹{alert.total_spent} spent, {investment_ratio:.1f}% invested"
        )
        return alert

    def start_scheduler(self):
        """Start the APScheduler for nightly alerts."""
        hour = settings.NIGHTLY_ALERT_HOUR
        scheduler.add_job(
            self.generate_nightly_alert,
            CronTrigger(hour=hour, minute=0, timezone="Asia/Kolkata"),
            id="nightly_alert",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"⏰ Nightly alert scheduled at {hour}:00 IST")

    def stop_scheduler(self):
        if scheduler.running:
            scheduler.shutdown()


# Singleton
alert_agent = AlertAgent()
