from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import date, time, datetime
import uuid


class TransactionCategory(str, Enum):
    Investment = "Investment"
    Insurance = "Insurance"
    Loan_Repay = "Loan_Repay"
    Personal_Expenditure = "Personal_Expenditure"
    Others = "Others"


CATEGORY_SUBCATEGORIES = {
    TransactionCategory.Investment: ["SIP", "Mutual Fund", "PPF", "Stocks", "NPS", "FD"],
    TransactionCategory.Insurance: ["Health Insurance", "Life Insurance", "Vehicle Insurance"],
    TransactionCategory.Loan_Repay: ["Home Loan", "Personal Loan", "EMI", "Bank Repayment"],
    TransactionCategory.Personal_Expenditure: [
        "Food & Dining", "Shopping", "Entertainment", "Travel",
        "Utilities", "Groceries", "Fuel", "Medical", "Education"
    ],
    TransactionCategory.Others: ["Miscellaneous", "Transfer", "Unknown"],
}

CATEGORY_COLORS = {
    TransactionCategory.Investment: "#10b981",
    TransactionCategory.Insurance: "#6366f1",
    TransactionCategory.Loan_Repay: "#f59e0b",
    TransactionCategory.Personal_Expenditure: "#ef4444",
    TransactionCategory.Others: "#94a3b8",
}


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    merchant: str
    amount: float
    date: str  # ISO date string YYYY-MM-DD
    time: Optional[str] = None  # HH:MM
    payment_method: str = "GPay"
    category: TransactionCategory = TransactionCategory.Others
    sub_category: Optional[str] = None
    confidence: float = 0.0
    reasoning: str = ""
    reviewed: bool = False
    needs_review: bool = False
    source: Literal["screenshot", "manual"] = "manual"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Transaction":
        return cls(**data)


class TransactionCreate(BaseModel):
    merchant: str
    amount: float
    date: str  # YYYY-MM-DD
    category: TransactionCategory
    sub_category: Optional[str] = None
    payment_method: str = "Cash"
    notes: Optional[str] = None


class CategoryReview(BaseModel):
    transaction_id: str
    new_category: TransactionCategory
    new_sub_category: Optional[str] = None


class RawExtractedTransaction(BaseModel):
    merchant_name: str
    amount: float
    date: str
    time: Optional[str] = None
    transaction_type: str = "debit"


class CategorizationResult(BaseModel):
    category: TransactionCategory
    sub_category: Optional[str]
    confidence: float
    reasoning: str


class NightlyAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    total_spent: float
    by_category: dict
    top_merchants: list
    investment_ratio: float
    goal_gap: float  # positive = below goal, negative = above goal
    recommendations: list
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return self.model_dump()

