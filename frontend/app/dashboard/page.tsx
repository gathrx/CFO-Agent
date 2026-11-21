"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, IndianRupee, Target, RefreshCw,
} from "lucide-react";
import StatsCard from "@/components/StatsCard";
import DailyStackedBar from "@/components/charts/DailyStackedBar";
import CumulativeAreaChart from "@/components/charts/CumulativeAreaChart";
import InvestmentDonut from "@/components/charts/InvestmentDonut";
import { api } from "@/lib/api";
import {
  DashboardSummary, DailyDataPoint, CumulativeDataPoint, CATEGORY_COLORS,
} from "@/types";
import { formatINR, formatDate } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, c] = await Promise.all([
        api.getSummary(days),
        api.getDailyAnalytics({ days }),
        api.getCumulativeAnalytics({ days }),
      ]);
      setSummary(s);
      setDailyData(d.data);
      setCumulativeData(c.data);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [days]);

  const Skeleton = () => (
    <div className="h-6 bg-slate-700 rounded animate-pulse" />
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-navy-800 border border-slate-700/50 rounded-lg p-1 gap-1">
            {RANGE_OPTIONS.map(({ label, days: d }) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  days === d
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Today's Spending"
          value={loading ? "—" : formatINR(summary?.today_total || 0)}
          icon={<IndianRupee className="w-4 h-4" />}
          highlight={
            (summary?.today_total || 0) > 2000 ? "red" : "green"
          }
        />
        <StatsCard
          label={`Investment (${days}d)`}
          value={loading ? "—" : formatINR(summary?.investment_amount || 0)}
          sub={`${summary?.investment_ratio?.toFixed(1) || 0}% of total`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          highlight="green"
          trend={
            (summary?.investment_ratio || 0) >= (summary?.goal_pct || 30) ? "up" : "down"
          }
          trendValue={
            (summary?.investment_ratio || 0) >= (summary?.goal_pct || 30)
              ? "Above Goal 🎉"
              : `${summary?.goal_gap?.toFixed(1) || 0}% below goal`
          }
        />
        <StatsCard
          label="Investment Goal"
          value={`${summary?.goal_pct || 30}%`}
          sub={
            (summary?.goal_gap || 0) > 0
              ? `Need ${formatINR(((summary?.goal_gap || 0) / 100) * (summary?.total_spent || 0))} more`
              : "Goal achieved! 🎯"
          }
          icon={<Target className="w-4 h-4" />}
          highlight={(summary?.goal_gap || 0) <= 0 ? "green" : "amber"}
        />
        <StatsCard
          label={`Personal Expenses (${days}d)`}
          value={loading ? "—" : formatINR(summary?.personal_expenditure || 0)}
          icon={<TrendingDown className="w-4 h-4 text-red-400" />}
          highlight="red"
          sub={`${summary ? ((summary.personal_expenditure / summary.total_spent) * 100).toFixed(1) : 0}% of total`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Daily Stacked Bar */}
        <div className="xl:col-span-2 rounded-xl bg-navy-800 border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Daily Expenditure Distribution
          </h2>
          {loading ? (
            <div className="h-64 bg-slate-700/30 rounded animate-pulse" />
          ) : dailyData.length > 0 ? (
            <DailyStackedBar data={dailyData} height={280} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No data for this period
            </div>
          )}
        </div>

        {/* Investment Donut */}
        <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-2">
            Spending Breakdown
          </h2>
          {loading ? (
            <div className="h-64 bg-slate-700/30 rounded animate-pulse" />
          ) : (
            <InvestmentDonut
              byCategory={summary?.by_category || {}}
              goalPct={summary?.goal_pct || 30}
              height={240}
            />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          Cumulative Expenditure by Category
        </h2>
        {loading ? (
          <div className="h-64 bg-slate-700/30 rounded animate-pulse" />
        ) : cumulativeData.length > 0 ? (
          <CumulativeAreaChart data={cumulativeData} height={280} />
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            No data for this period
          </div>
        )}
      </div>

      {/* Top Merchants Table */}
      <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          Top Merchants This Period
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Merchant", "Category", "Total Spent", "Transactions"].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {(summary?.top_merchants || []).map((m, i) => (
                  <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 font-medium text-white">{m.merchant}</td>
                    <td className="py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            `${CATEGORY_COLORS[m.category as keyof typeof CATEGORY_COLORS] || "#94a3b8"}20`,
                          color:
                            CATEGORY_COLORS[m.category as keyof typeof CATEGORY_COLORS] || "#94a3b8",
                        }}
                      >
                        {m.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-white font-medium">{formatINR(m.total)}</td>
                    <td className="py-3 text-slate-400">{m.count}</td>
                  </tr>
                ))}
                {(!summary?.top_merchants?.length) && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

