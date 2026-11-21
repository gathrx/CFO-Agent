"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CATEGORY_COLORS, CATEGORY_LABELS, TransactionCategory } from "@/types";
import { formatINR } from "@/lib/utils";

interface Props {
  byCategory: Record<string, number>;
  goalPct?: number;
  height?: number;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function InvestmentDonut({ byCategory, goalPct = 30, height = 260 }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key as TransactionCategory] || key,
      value,
      category: key as TransactionCategory,
    }));

  const total = data.reduce((s, d) => s + d.value, 0);
  const investmentPct = total > 0
    ? ((byCategory["Investment"] || 0) / total) * 100
    : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_COLORS[entry.category] || "#94a3b8"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: investmentPct >= goalPct ? "#10b981" : "#ef4444" }}
            >
              {investmentPct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Invested</div>
          </div>
        </div>
      </div>

      {/* Goal bar */}
      <div className="w-full mt-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Investment Goal</span>
          <span className={investmentPct >= goalPct ? "text-emerald-400" : "text-red-400"}>
            {investmentPct.toFixed(1)}% / {goalPct}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((investmentPct / goalPct) * 100, 100)}%`,
              backgroundColor: investmentPct >= goalPct ? "#10b981" : "#f59e0b",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
        {data.map((d) => (
          <div key={d.category} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[d.category] || "#94a3b8" }}
            />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

