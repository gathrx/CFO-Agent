"""
Categorization Agent — Classifies transactions into 5 major categories using Gemini LLM.
Includes keyword-based fallback for high-confidence cases.
"""
import json
import logging
import re
from typing import Optional

import google.generativeai as genai

from config.settings import settings
from models.transaction import (
    TransactionCategory,
    CategorizationResult,
    RawExtractedTransaction,
    CATEGORY_SUBCATEGORIES,
)

logger = logging.getLogger(__name__)

# Keyword rules for fast, high-confidence classification
KEYWORD_RULES = {
    TransactionCategory.Investment: [
        r"\bsip\b", r"mutual fund", r"\bmf\b", r"\bppf\b", r"\bnps\b",
        r"zerodha", r"groww", r"kuvera", r"coin by zerodha", r"paytm money",
        r"5paisa", r"angel broking", r"upstox", r"hdfc securities",
        r"icicidirect", r"nippon india", r"axis mutual", r"sbi mutual",
        r"mirae asset", r"kotak mahindra bank.*invest",
    ],
    TransactionCategory.Insurance: [
        r"lic\b", r"life insurance", r"health insurance", r"star health",
        r"niva bupa", r"max bupa", r"hdfc ergo", r"bajaj allianz",
        r"tata aig", r"reliance general", r"icici prudential.*insurance",
        r"policybazaar", r"acko",
    ],
    TransactionCategory.Loan_Repay: [
        r"\bemi\b", r"loan repay", r"home loan", r"personal loan",
        r"hdfc bank.*emi", r"sbi.*emi", r"icici.*emi", r"axis.*emi",
        r"bajaj finserv", r"home credit", r"fullerton india",
        r"indiabulls", r"l&t finance", r"piramal finance",
    ],
    TransactionCategory.Personal_Expenditure: [
        r"swiggy", r"zomato", r"dominos", r"mcdonald", r"kfc", r"pizza hut",
        r"starbucks", r"cafe coffee day", r"amazon", r"flipkart", r"myntra",
        r"ajio", r"nykaa", r"meesho", r"netflix", r"hotstar", r"spotify",
        r"prime video", r"ola", r"uber", r"rapido", r"irctc", r"makemytrip",
        r"goibibo", r"bigbasket", r"grofers", r"blinkit", r"zepto",
        r"electricity", r"gas bill", r"water bill", r"airtel", r"jio",
        r"vodafone", r"vi\b", r"bsnl", r"petrol", r"fuel",
    ],
}

CATEGORIZATION_PROMPT = """
You are a personal finance AI assistant for an Indian user. Classify this transaction into exactly ONE category.

Transaction:
- Merchant/Payee: {merchant}
- Amount: ₹{amount}

Categories (choose exactly one):
1. Investment — SIP, Mutual Funds, PPF, NPS, stocks, Zerodha, Groww, Kuvera, etc.
2. Insurance — LIC, health insurance, life insurance, vehicle insurance premiums
3. Loan_Repay — EMI payments, home loan, personal loan repayments to banks
4. Personal_Expenditure — Food, shopping, entertainment, travel, utilities, groceries, fuel, medical bills
5. Others — Transfers between own accounts, unknown merchants, miscellaneous

Also provide:
- sub_category: specific sub-type (e.g., "SIP" for Investment, "Food & Dining" for Personal_Expenditure)
- confidence: float 0.0 to 1.0 (how confident are you?)
- reasoning: one sentence explanation

Return ONLY valid JSON:
{{"category": "...", "sub_category": "...", "confidence": 0.95, "reasoning": "..."}}
"""


class CategorizationAgent:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def _keyword_classify(self, merchant: str) -> Optional[CategorizationResult]:
        """Fast keyword-based classification for well-known merchants."""
        merchant_lower = merchant.lower()
        for category, patterns in KEYWORD_RULES.items():
            for pattern in patterns:
                if re.search(pattern, merchant_lower):
                    # Pick a default sub-category
                    sub_cats = CATEGORY_SUBCATEGORIES.get(category, [])
                    sub_cat = sub_cats[0] if sub_cats else None
                    return CategorizationResult(
                        category=category,
                        sub_category=sub_cat,
                        confidence=0.95,
                        reasoning=f"Matched keyword pattern for {category.value}",
                    )
        return None

    def categorize(self, merchant: str, amount: float) -> CategorizationResult:
        """Categorize a single transaction."""
        # Try keyword rules first
        keyword_result = self._keyword_classify(merchant)
        if keyword_result and keyword_result.confidence >= settings.LOW_CONFIDENCE_THRESHOLD:
            return keyword_result

        # Fall back to LLM
        try:
            prompt = CATEGORIZATION_PROMPT.format(merchant=merchant, amount=amount)
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:-1])

            data = json.loads(raw)
            category_str = data.get("category", "Others")
            # Map to enum
            try:
                category = TransactionCategory(category_str)
            except ValueError:
                category = TransactionCategory.Others

            return CategorizationResult(
                category=category,
                sub_category=data.get("sub_category"),
                confidence=float(data.get("confidence", 0.5)),
                reasoning=data.get("reasoning", "LLM classification"),
            )
        except Exception as e:
            logger.error(f"Categorization LLM error for '{merchant}': {e}")
            return CategorizationResult(
                category=TransactionCategory.Others,
                sub_category="Unknown",
                confidence=0.3,
                reasoning=f"Classification failed: {e}",
            )

    def categorize_batch(self, transactions: list) -> list:
        """Categorize a list of RawExtractedTransaction objects."""
        results = []
        for txn in transactions:
            result = self.categorize(txn.merchant_name, txn.amount)
            results.append(result)
        return results


# Singleton
categorization_agent = CategorizationAgent()

