"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DailyDataPoint, CATEGORY_COLORS, ALL_CATEGORIES } from "@/types";
import { formatINR, formatShortDate } from "@/lib/utils";

interface Props {
  data: DailyDataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="custom-tooltip">
      <div className="font-semibold text-white mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6 text-xs py-0.5">
          <span style={{ color: p.fill }}>{p.name.replace("_", " ")}</span>
          <span className="text-white font-medium">{formatINR(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-slate-600 mt-2 pt-2 flex justify-between text-xs">
        <span className="text-slate-400">Total</span>
        <span className="text-white font-bold">{formatINR(total)}</span>
      </div>
    </div>
  );
};

export default function DailyStackedBar({ data, height = 320 }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    date: formatShortDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-slate-300">{value.replace("_", " ")}</span>
          )}
        />
        {ALL_CATEGORIES.map((cat) => (
          <Bar
            key={cat}
            dataKey={cat}
            name={cat}
            stackId="a"
            fill={CATEGORY_COLORS[cat]}
            radius={cat === "Others" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

