"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BidLineItem } from "@/types";

interface LineItemBreakdownChartProps {
  lineItems: BidLineItem[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Labor: [
    "labor",
    "labour",
    "installation",
    "install",
    "demo",
    "demolition",
    "framing",
    "drywall",
    "painting",
    "paint",
    "finish",
    "finishing",
    "excavat",
    "grading",
    "carpentry",
    "plumbing",
    "electrical",
    "hvac",
  ],
  Materials: [
    "material",
    "lumber",
    "concrete",
    "tile",
    "flooring",
    "floor",
    "roofing",
    "siding",
    "insulation",
    "sheetrock",
    "wood",
    "steel",
    "pipe",
    "wire",
    "fixture",
    "supply",
    "supplies",
  ],
  Permits: ["permit", "inspection", "fee", "license"],
  Equipment: [
    "equipment",
    "rental",
    "crane",
    "scaffold",
    "lift",
    "machinery",
    "tool",
  ],
};

const COLORS: Record<string, string> = {
  Labor: "#6366f1",
  Materials: "#22c55e",
  Permits: "#f59e0b",
  Equipment: "#0ea5e9",
  Other: "#a1a1aa",
};

function categorize(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Other";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LineItemBreakdownChart({
  lineItems,
}: LineItemBreakdownChartProps) {
  if (lineItems.length === 0) return null;

  const totals: Record<string, number> = {};
  for (const item of lineItems) {
    const category = categorize(item.description);
    totals[category] = (totals[category] ?? 0) + item.quantity * item.unit_price;
  }

  const data = Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Only render if there are at least 2 distinct categories
  if (data.length < 2) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-700 mb-2">
        Cost Breakdown
      </h3>
      <p className="text-xs text-zinc-400 mb-4">
        Estimated by line-item keywords
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name] ?? COLORS["Other"]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? [formatCurrency(value), "Cost"]
                : [String(value), "Cost"]
            }
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e4e4e7",
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 12, color: "#52525b" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
