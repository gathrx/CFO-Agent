"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import {
  Transaction, TransactionCategory, ALL_CATEGORIES,
  CATEGORY_SUBCATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS,
} from "@/types";
import { formatINR, formatDate, confidenceColor } from "@/lib/utils";
import CategoryBadge from "@/components/CategoryBadge";

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, TransactionCategory>>({});
  const [subOverrides, setSubOverrides] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingReview();
      setTransactions(res.transactions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirmOne = async (txn: Transaction) => {
    setConfirming((s) => new Set([...s, txn.id]));
    try {
      await api.confirmReview({
        transaction_id: txn.id,
        new_category: overrides[txn.id] || txn.category,
        new_sub_category: subOverrides[txn.id],
      });
      setTransactions((t) => t.filter((x) => x.id !== txn.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming((s) => { const n = new Set(s); n.delete(txn.id); return n; });
    }
  };

  const confirmAll = async () => {
    for (const txn of transactions) await confirmOne(txn);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">
            {transactions.length > 0
              ? `${transactions.length} transaction${transactions.length > 1 ? "s" : ""} need your review`
              : "All transactions reviewed"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {transactions.length > 0 && (
            <button
              onClick={confirmAll}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all"
            >
              Confirm All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-navy-800 border border-slate-700/50 h-24 animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mb-1">All caught up! 🎉</div>
          <div className="text-slate-400 text-sm">No transactions pending review</div>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => {
            const selectedCat = overrides[txn.id] || txn.category;
            const isConfirming = confirming.has(txn.id);
            const isExpanded = expanded[txn.id];

            return (
              <div key={txn.id} className="rounded-xl bg-navy-800 border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[selectedCat]}20`,
                        color: CATEGORY_COLORS[selectedCat],
                      }}
                    >
                      {txn.merchant.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{txn.merchant}</div>
                      <div className="text-xs text-slate-400">{formatDate(txn.date)} · {txn.payment_method}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(txn.confidence)}`}>
                      {(txn.confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-white font-semibold">{formatINR(txn.amount)}</span>
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [txn.id]: !e[txn.id] }))}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-4 space-y-3 bg-slate-800/30">
                    <div className="text-xs text-slate-400 italic">
                      💬 AI reasoning: &ldquo;{txn.reasoning}&rdquo;
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>AI suggested:</span>
                      <CategoryBadge category={txn.category} size="sm" />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 px-4 pb-4">
                  <select
                    value={selectedCat}
                    onChange={(e) => setOverrides((o) => ({ ...o, [txn.id]: e.target.value as TransactionCategory }))}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                  <select
                    value={subOverrides[txn.id] || ""}
                    onChange={(e) => setSubOverrides((s) => ({ ...s, [txn.id]: e.target.value }))}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sub-category</option>
                    {CATEGORY_SUBCATEGORIES[selectedCat].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => confirmOne(txn)}
                    disabled={isConfirming}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-1.5 transition-all flex-shrink-0"
                  >
                    {isConfirming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Confirm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

