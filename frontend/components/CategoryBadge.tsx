import { TransactionCategory, CATEGORY_COLORS, CATEGORY_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: TransactionCategory;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

