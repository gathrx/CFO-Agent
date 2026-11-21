import {
  Transaction,
  TransactionCreate,
  CategoryReview,
  DailyDataPoint,
  CumulativeDataPoint,
  DashboardSummary,
  NightlyAlert,
  UploadResult,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error ${res.status}: ${error}`);
  }
  return res.json();
}

export const api = {
  // Screenshot upload
  uploadScreenshot: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/transactions/upload-screenshot`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Pending review
  getPendingReview: (): Promise<{ transactions: Transaction[]; count: number }> =>
    fetchJSON("/api/transactions/pending-review"),

  confirmReview: (review: CategoryReview): Promise<{ success: boolean; transaction: Transaction }> =>
    fetchJSON("/api/transactions/confirm-review", {
      method: "POST",
      body: JSON.stringify(review),
    }),

  // Manual entry
  addManual: (data: TransactionCreate): Promise<{ success: boolean; transaction: Transaction }> =>
    fetchJSON("/api/transactions/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Transactions list
  getTransactions: (params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    days?: number;
  }): Promise<{ transactions: Transaction[]; count: number }> => {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set("start_date", params.start_date);
    if (params?.end_date) qs.set("end_date", params.end_date);
    if (params?.category) qs.set("category", params.category);
    if (params?.days) qs.set("days", String(params.days));
    return fetchJSON(`/api/transactions?${qs}`);
  },

  updateCategory: (id: string, review: CategoryReview) =>
    fetchJSON(`/api/transactions/${id}/category`, {
      method: "PATCH",
      body: JSON.stringify(review),
    }),

  // Analytics
  getDailyAnalytics: (params?: {
    start_date?: string;
    end_date?: string;
    days?: number;
  }): Promise<{ data: DailyDataPoint[] }> => {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set("start_date", params.start_date);
    if (params?.end_date) qs.set("end_date", params.end_date);
    if (params?.days) qs.set("days", String(params.days));
    return fetchJSON(`/api/analytics/daily?${qs}`);
  },

  getCumulativeAnalytics: (params?: {
    start_date?: string;
    end_date?: string;
    days?: number;
  }): Promise<{ data: CumulativeDataPoint[] }> => {
    const qs = new URLSearchParams();
    if (params?.days) qs.set("days", String(params.days));
    return fetchJSON(`/api/analytics/cumulative?${qs}`);
  },

  getSummary: (days = 30): Promise<DashboardSummary> =>
    fetchJSON(`/api/analytics/summary?days=${days}`),

  // Alerts
  getAlerts: (limit = 30): Promise<{ alerts: NightlyAlert[]; count: number }> =>
    fetchJSON(`/api/alerts?limit=${limit}`),

  generateAlert: (targetDate?: string): Promise<{ success: boolean; alert: NightlyAlert }> =>
    fetchJSON("/api/alerts/generate", {
      method: "POST",
      body: JSON.stringify(targetDate ? { target_date: targetDate } : {}),
    }),

  // Categories metadata
  getCategories: () => fetchJSON("/api/categories"),
};

