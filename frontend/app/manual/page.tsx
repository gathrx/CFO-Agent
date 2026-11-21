"use client";

import { useState } from "react";
import { PlusCircle, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { TransactionCategory, ALL_CATEGORIES, CATEGORY_SUBCATEGORIES, CATEGORY_LABELS } from "@/types";

const PAYMENT_METHODS = ["Cash", "Credit Card", "Debit Card", "Net Banking", "GPay", "PhonePe", "Paytm"];

export default function ManualPage() {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    merchant: "",
    amount: "",
    date: today,
    category: "Personal_Expenditure" as TransactionCategory,
    sub_category: "",
    payment_method: "Cash",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.merchant || !form.amount || !form.date) {
      setError("Please fill in all required fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addManual({
        merchant: form.merchant,
        amount: parseFloat(form.amount),
        date: form.date,
        category: form.category,
        sub_category: form.sub_category || undefined,
        payment_method: form.payment_method,
        notes: form.notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({
          merchant: "", amount: "", date: today,
          category: "Personal_Expenditure", sub_category: "",
          payment_method: "Cash", notes: "",
        });
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Add Expense</h1>
        <p className="text-slate-400 text-sm mt-1">Record cash, credit card, or any offline transaction</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-navy-800 border border-slate-700/50 p-6 space-y-5">
        {/* Merchant */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Merchant / Payee <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.merchant}
            onChange={(e) => set("merchant", e.target.value)}
            placeholder="e.g. BigBazaar, Restaurant Name"
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            required
          />
        </div>

        {/* Amount + Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Amount (₹) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              max={today}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => { set("category", e.target.value); set("sub_category", ""); }}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Sub-category */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Sub-category</label>
          <select
            value={form.sub_category}
            onChange={(e) => set("sub_category", e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">Select sub-category</option>
            {CATEGORY_SUBCATEGORIES[form.category].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("payment_method", m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.payment_method === m
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-slate-700/30 border-slate-600 text-slate-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            success
              ? "bg-emerald-600/50 text-emerald-300 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : success ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><PlusCircle className="w-4 h-4" /> Add Transaction</>
          )}
        </button>
      </form>
    </div>
  );
}

