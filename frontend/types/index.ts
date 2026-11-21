// Transaction Categories
export type TransactionCategory =
  | "Investment"
  | "Insurance"
  | "Loan_Repay"
  | "Personal_Expenditure"
  | "Others";

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Investment: "#10b981",
  Insurance: "#6366f1",
  Loan_Repay: "#f59e0b",
  Personal_Expenditure: "#ef4444",
  Others: "#94a3b8",
};

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  Investment: "Investment",
  Insurance: "Insurance",
  Loan_Repay: "Loan Repayment",
  Personal_Expenditure: "Personal Expenditure",
  Others: "Others",
};

export const CATEGORY_SUBCATEGORIES: Record<TransactionCategory, string[]> = {
  Investment: ["SIP", "Mutual Fund", "PPF", "Stocks", "NPS", "FD"],
  Insurance: ["Health Insurance", "Life Insurance", "Vehicle Insurance"],
  Loan_Repay: ["Home Loan", "Personal Loan", "EMI", "Bank Repayment"],
  Personal_Expenditure: [
    "Food & Dining",
    "Shopping",
    "Entertainment",
    "Travel",
    "Utilities",
    "Groceries",
    "Fuel",
    "Medical",
    "Education",
  ],
  Others: ["Miscellaneous", "Transfer", "Unknown"],
};

export const ALL_CATEGORIES: TransactionCategory[] = [
  "Investment",
  "Insurance",
  "Loan_Repay",
  "Personal_Expenditure",
  "Others",
];

// Transaction
export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  time?: string;
  payment_method: string;
  category: TransactionCategory;
  sub_category?: string;
  confidence: number;
  reasoning: string;
  reviewed: boolean;
  needs_review: boolean;
  source: "screenshot" | "manual";
  created_at: string;
  notes?: string;
}

export interface TransactionCreate {
  merchant: string;
  amount: number;
  date: string;
  category: TransactionCategory;
  sub_category?: string;
  payment_method: string;
  notes?: string;
}

export interface CategoryReview {
  transaction_id: string;
  new_category: TransactionCategory;
  new_sub_category?: string;
}

// Analytics
export interface DailyDataPoint {
  date: string;
  Investment: number;
  Insurance: number;
  Loan_Repay: number;
  Personal_Expenditure: number;
  Others: number;
}

export interface CumulativeDataPoint {
  date: string;
  Investment: number;
  Insurance: number;
  Loan_Repay: number;
  Personal_Expenditure: number;
  Others: number;
}

export interface DashboardSummary {
  total_spent: number;
  today_total: number;
  investment_amount: number;
  investment_ratio: number;
  personal_expenditure: number;
  goal_pct: number;
  goal_gap: number;
  by_category: Record<TransactionCategory, number>;
  top_merchants: TopMerchant[];
  transaction_count: number;
}

export interface TopMerchant {
  merchant: string;
  total: number;
  count: number;
  category: TransactionCategory;
}

// Nightly Alert
export interface NightlyAlert {
  id: string;
  date: string;
  total_spent: number;
  by_category: Record<TransactionCategory, number>;
  top_merchants: TopMerchant[];
  investment_ratio: number;
  goal_gap: number;
  recommendations: string[];
  created_at: string;
}

// Upload result
export interface UploadResult {
  confirmed: Transaction[];
  pending_review: Transaction[];
  summary: {
    total_extracted: number;
    auto_confirmed: number;
    needs_review: number;
  };
}

