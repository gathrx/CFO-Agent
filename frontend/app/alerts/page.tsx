"use client";

import { useState, useEffect } from "react";
import { Bell, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { NightlyAlert, CATEGORY_COLORS } from "@/types";
import { formatINR, formatDate } from "@/lib/utils";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NightlyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts();
      setAlerts(res.alerts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateNow = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateAlert();
      setAlerts((a) => [res.alert, ...a]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nightly Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">Your daily spending digest and AI recommendations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={generateNow}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Now
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-start gap-3">
        <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300">
          Nightly alerts are automatically generated every day at <strong>9:00 PM IST</strong>.
          They summarize your day&apos;s spending and provide AI recommendations to optimize your finances.
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-navy-800 border border-slate-700/50 h-48 animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white mb-1">No alerts yet</div>
          <div className="text-slate-400 text-sm mb-4">Generate your first alert to see spending insights</div>
          <button
            onClick={generateNow}
            disabled={generating}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all"
          >
            {generating ? "Generating..." : "Generate First Alert"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const isGoalMet = alert.goal_gap <= 0;
            const totalSpent = alert.total_spent;
            const categories = Object.entries(alert.by_category || {}).filter(([, v]) => v > 0);

            return (
              <div
                key={alert.id}
                className={`rounded-xl bg-navy-800 border overflow-hidden ${
                  isGoalMet ? "border-emerald-500/30" : "border-slate-700/50"
                }`}
              >
                {/* Alert Header */}
                <div className={`px-5 py-4 flex items-center justify-between border-b border-slate-700/50 ${
                  isGoalMet ? "bg-emerald-500/5" : ""
                }`}>
                  <div>
                    <div className="font-semibold text-white">{formatDate(alert.date)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Daily spending digest</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{formatINR(totalSpent)}</div>
                    <div className={`text-xs flex items-center gap-1 justify-end ${
                      isGoalMet ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {isGoalMet
                        ? <><TrendingUp className="w-3 h-3" /> Investment goal met</>
                        : <><AlertTriangle className="w-3 h-3" /> {alert.goal_gap.toFixed(1)}% below investment goal</>
                      }
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                {categories.length > 0 && (
                  <div className="px-5 py-4 border-b border-slate-700/50">
                    <div className="text-xs font-medium text-slate-400 mb-3">Spending by Category</div>
                    <div className="space-y-2">
                      {categories.map(([cat, amount]) => {
                        const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                        const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || "#94a3b8";
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color }}>{cat.replace("_", " ")}</span>
                              <span className="text-white font-medium">{formatINR(amount)} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Investment Ratio */}
                <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="text-xs text-slate-400">30-day Investment Ratio</div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(alert.investment_ratio / 30 * 100, 100)}%`,
                          backgroundColor: isGoalMet ? "#10b981" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${isGoalMet ? "text-emerald-400" : "text-amber-400"}`}>
                      {alert.investment_ratio.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                {alert.recommendations?.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      AI Recommendations
                    </div>
                    <ul className="space-y-2">
                      {alert.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-slate-300 flex gap-2 leading-relaxed">
                          <span className="text-emerald-400 flex-shrink-0 font-bold">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

