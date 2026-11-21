"""
Analytics Agent — Computes metrics and aggregates for the dashboard.
"""
import logging
from typing import List, Dict
from collections import defaultdict
from datetime import datetime, date, timedelta

from models.transaction import Transaction, TransactionCategory, CATEGORY_COLORS

logger = logging.getLogger(__name__)


class AnalyticsAgent:

    def get_daily_distribution(self, transactions: List[Transaction]) -> List[dict]:
        """
        Returns daily spending by category for Stacked Bar Chart.
        Output: [{"date": "2024-11-01", "Investment": 5000, "Personal_Expenditure": 1200, ...}, ...]
        """
        daily: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

        for txn in transactions:
            daily[txn.date][txn.category] += txn.amount

        # Build sorted list
        sorted_dates = sorted(daily.keys())
        result = []
        for d in sorted_dates:
            row = {"date": d}
            for cat in TransactionCategory:
                row[cat.value] = round(daily[d].get(cat.value, 0), 2)
            result.append(row)
        return result

    def get_cumulative_by_category(self, transactions: List[Transaction]) -> List[dict]:
        """
        Returns cumulative spending per category over time.
        Output: [{"date": "2024-11-01", "Investment": 5000, "Personal_Expenditure": 1200, ...}, ...]
        """
        # Group by date first
        daily = defaultdict(lambda: defaultdict(float))
        for txn in transactions:
            daily[txn.date][txn.category] += txn.amount

        sorted_dates = sorted(daily.keys())
        cumulative = defaultdict(float)
        result = []

        for d in sorted_dates:
            for cat in TransactionCategory:
                cumulative[cat.value] += daily[d].get(cat.value, 0)
            row = {"date": d}
            for cat in TransactionCategory:
                row[cat.value] = round(cumulative[cat.value], 2)
            result.append(row)

        return result

    def get_category_totals(self, transactions: List[Transaction]) -> Dict[str, float]:
        """Sum of spending per category."""
        totals: Dict[str, float] = defaultdict(float)
        for txn in transactions:
            totals[txn.category] += txn.amount
        return dict(totals)

    def get_investment_ratio(self, transactions: List[Transaction]) -> float:
        """Investment as a % of total spending."""
        totals = self.get_category_totals(transactions)
        total = sum(totals.values())
        if total == 0:
            return 0.0
        inv = totals.get(TransactionCategory.Investment.value, 0)
        return round((inv / total) * 100, 2)

    def get_top_merchants(
        self, transactions: List[Transaction], limit: int = 10
    ) -> List[dict]:
        """Top merchants by total amount spent."""
        merchant_totals: Dict[str, dict] = defaultdict(
            lambda: {"total": 0, "count": 0, "category": "Others"}
        )
        for txn in transactions:
            merchant_totals[txn.merchant]["total"] += txn.amount
            merchant_totals[txn.merchant]["count"] += 1
            merchant_totals[txn.merchant]["category"] = txn.category

        sorted_merchants = sorted(
            merchant_totals.items(), key=lambda x: x[1]["total"], reverse=True
        )

        return [
            {
                "merchant": m,
                "total": round(d["total"], 2),
                "count": d["count"],
                "category": d["category"],
            }
            for m, d in sorted_merchants[:limit]
        ]

    def get_summary(self, transactions: List[Transaction]) -> dict:
        """High-level summary for the dashboard stats cards."""
        from config.settings import settings

        totals = self.get_category_totals(transactions)
        total_spent = sum(totals.values())
        investment_amount = totals.get(TransactionCategory.Investment.value, 0)
        personal_exp = totals.get(TransactionCategory.Personal_Expenditure.value, 0)
        investment_ratio = self.get_investment_ratio(transactions)
        goal = settings.MONTHLY_INVESTMENT_GOAL_PCT
        goal_gap = goal - investment_ratio  # positive = below goal

        # Today's spend
        today_str = date.today().isoformat()
        today_transactions = [t for t in transactions if t.date == today_str]
        today_total = sum(t.amount for t in today_transactions)

        return {
            "total_spent": round(total_spent, 2),
            "today_total": round(today_total, 2),
            "investment_amount": round(investment_amount, 2),
            "investment_ratio": investment_ratio,
            "personal_expenditure": round(personal_exp, 2),
            "goal_pct": goal,
            "goal_gap": round(goal_gap, 2),
            "by_category": {k: round(v, 2) for k, v in totals.items()},
            "top_merchants": self.get_top_merchants(transactions, limit=5),
            "transaction_count": len(transactions),
        }


# Singleton
analytics_agent = AnalyticsAgent()

