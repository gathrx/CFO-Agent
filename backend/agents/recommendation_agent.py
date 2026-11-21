"""
Recommendation Agent — Generates actionable financial recommendations using Gemini LLM.
Goal: Increase Investment, Reduce Personal Expenditure.
"""
import json
import logging
from typing import List

import google.generativeai as genai

from config.settings import settings
from models.transaction import Transaction

logger = logging.getLogger(__name__)

RECOMMENDATION_PROMPT = """
You are a personal CFO (Chief Financial Officer) assistant for an Indian professional.
Your primary goal is to help them INCREASE their investment and REDUCE personal expenditure.

Here is their spending summary for the last 30 days (in Indian Rupees ₹):

Total Spent: ₹{total_spent}
Investment: ₹{investment} ({investment_ratio:.1f}% of total — Target: {goal_pct}%)
Insurance: ₹{insurance}
Loan Repayment: ₹{loan_repay}
Personal Expenditure: ₹{personal_exp}
Others: ₹{others}

Top spending merchants (Personal Expenditure): {top_merchants}

Investment Gap: {gap_description}

Provide exactly 5 specific, actionable recommendations:
1. If investment is below {goal_pct}% target, calculate exact SIP amount to add
2. Identify specific personal expenditure categories to cut
3. Suggest specific merchants or habits to reduce spending
4. One positive reinforcement if they're on track
5. One long-term wealth building tip

Be specific with Indian Rupee amounts. Be concise (1-2 sentences each).
Return as JSON array of strings:
["Recommendation 1...", "Recommendation 2...", ...]
"""


class RecommendationAgent:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def generate_recommendations(
        self, transactions: List[Transaction], summary: dict
    ) -> List[str]:
        """Generate 5 actionable recommendations based on spending patterns."""
        try:
            goal_pct = settings.MONTHLY_INVESTMENT_GOAL_PCT
            investment_ratio = summary.get("investment_ratio", 0)
            gap = goal_pct - investment_ratio

            gap_description = (
                f"You are ₹{summary.get('gap_amount', 0):.0f} SHORT of your {goal_pct}% investment goal"
                if gap > 0
                else f"You are EXCEEDING your {goal_pct}% investment target by {abs(gap):.1f}%"
            )

            top_merchants = summary.get("top_merchants", [])
            top_merchants_str = ", ".join(
                [f"{m['merchant']} (₹{m['total']:.0f})" for m in top_merchants[:5]]
            )

            prompt = RECOMMENDATION_PROMPT.format(
                total_spent=summary.get("total_spent", 0),
                investment=summary.get("investment_amount", 0),
                investment_ratio=investment_ratio,
                goal_pct=goal_pct,
                insurance=summary.get("by_category", {}).get("Insurance", 0),
                loan_repay=summary.get("by_category", {}).get("Loan_Repay", 0),
                personal_exp=summary.get("personal_expenditure", 0),
                others=summary.get("by_category", {}).get("Others", 0),
                top_merchants=top_merchants_str,
                gap_description=gap_description,
            )

            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    response_mime_type="application/json"
                )
            )

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:-1])

            recommendations = json.loads(raw)
            if isinstance(recommendations, list):
                return [str(r) for r in recommendations[:5]]
            return [str(recommendations)]

        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            return self._fallback_recommendations(summary)

    def _fallback_recommendations(self, summary: dict) -> List[str]:
        """Static fallback recommendations when LLM is unavailable."""
        goal_pct = settings.MONTHLY_INVESTMENT_GOAL_PCT
        investment_ratio = summary.get("investment_ratio", 0)
        recs = []

        if investment_ratio < goal_pct:
            gap = goal_pct - investment_ratio
            total = summary.get("total_spent", 0)
            needed = (gap / 100) * total
            recs.append(
                f"💡 Increase your monthly SIP by ₹{needed:.0f} to reach the {goal_pct}% investment target."
            )

        personal_exp = summary.get("personal_expenditure", 0)
        if personal_exp > 0:
            recs.append(
                f"✂️ Your Personal Expenditure is ₹{personal_exp:.0f}. Try reducing food delivery and shopping by 20% = ₹{personal_exp * 0.2:.0f} savings."
            )

        recs.append("📊 Review your 'Others' category transactions to find hidden expenses.")
        recs.append("🎯 Set up auto-debit for SIP on salary day to pay yourself first.")
        recs.append("📈 Consider increasing SIP by 10% every year (step-up SIP) to build long-term wealth.")

        return recs[:5]


# Singleton
recommendation_agent = RecommendationAgent()

