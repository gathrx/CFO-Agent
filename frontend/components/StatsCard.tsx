import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  highlight?: "green" | "red" | "amber" | "blue";
}

const highlightClasses = {
  green: "border-emerald-500/30 bg-emerald-500/5",
  red: "border-red-500/30 bg-red-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
  blue: "border-blue-500/30 bg-blue-500/5",
};

export default function StatsCard({
  label,
  value,
  sub,
  icon,
  trend,
  trendValue,
  highlight,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 bg-navy-800 border-slate-700/50 flex flex-col gap-3",
        highlight && highlightClasses[highlight]
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400">
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {trendValue && (
        <div
          className={cn(
            "text-xs font-medium",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400",
            trend === "neutral" && "text-slate-400"
          )}
        >
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "●"} {trendValue}
        </div>
      )}
    </div>
  );
}

