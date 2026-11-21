"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CumulativeDataPoint, CATEGORY_COLORS, ALL_CATEGORIES } from "@/types";
import { formatINR, formatShortDate } from "@/lib/utils";

interface Props {
  data: CumulativeDataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="font-semibold text-white mb-2">{label}</div>
      {[...payload].reverse().map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6 text-xs py-0.5">
          <span style={{ color: p.stroke }}>{p.name.replace("_", " ")}</span>
          <span className="text-white font-medium">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function CumulativeAreaChart({ data, height = 320 }: Props) {
  const formatted = data.map((d) => ({ ...d, date: formatShortDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          {ALL_CATEGORIES.map((cat) => (
            <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.0} />
            </linearGradient>
          ))}
        </defs>
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
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            name={cat}
            stackId="1"
            stroke={CATEGORY_COLORS[cat]}
            fill={`url(#grad-${cat})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

