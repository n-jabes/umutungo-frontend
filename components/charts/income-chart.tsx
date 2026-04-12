"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactMoney } from "@/lib/format";

export type IncomePoint = { month: string; income: number };

export function IncomeChart({ data }: { data: IncomePoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.month.slice(5),
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14532d" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#14532d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v) => formatCompactMoney(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            width={72}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.06)",
            }}
            formatter={(value) => [
              formatCompactMoney(Number(value ?? 0)),
              "Income",
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { month?: string } | undefined;
              return row?.month ?? "";
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#14532d"
            strokeWidth={2}
            fill="url(#incomeFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
