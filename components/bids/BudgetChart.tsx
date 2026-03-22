"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BidWithMeta } from "@/types";

interface BudgetChartProps {
  bids: BidWithMeta[];
  targetBudget: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function barFill(status: string): string {
  if (status === "accepted") return "#6366f1";
  if (status === "rejected") return "#f87171";
  return "#94a3b8";
}

export function BudgetChart({ bids, targetBudget }: BudgetChartProps) {
  if (bids.length === 0) return null;

  const data = bids.map((bid) => ({
    name: bid.contractor.name,
    total: bid.total_price,
    status: bid.status,
  }));

  const chartHeight = Math.max(100, bids.length * 52);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-700">Budget Overview</h3>
        {targetBudget !== null && (
          <span className="text-xs text-zinc-400">
            Target:{" "}
            <span className="font-medium text-zinc-600">
              {formatCurrency(targetBudget)}
            </span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#f4f4f5"
          />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 12, fill: "#52525b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? [formatCurrency(value), "Total"]
                : [String(value), "Total"]
            }
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e4e4e7",
            }}
            cursor={{ fill: "#f4f4f5" }}
          />
          {targetBudget !== null && (
            <ReferenceLine
              x={targetBudget}
              stroke="#6366f1"
              strokeDasharray="5 3"
              label={{
                value: "Budget",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#6366f1",
              }}
            />
          )}
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={30}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barFill(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {targetBudget !== null && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-zinc-100">
          {bids.map((bid) => {
            const pct = Math.round((bid.total_price / targetBudget) * 100);
            const over = pct > 100;
            return (
              <span key={bid.id} className="text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">
                  {bid.contractor.name}
                </span>
                {": "}
                <span className={over ? "text-red-500" : "text-emerald-600"}>
                  {pct}% of budget
                </span>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#6366f1]" />
          Accepted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#94a3b8]" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f87171]" />
          Rejected
        </span>
      </div>
    </div>
  );
}
