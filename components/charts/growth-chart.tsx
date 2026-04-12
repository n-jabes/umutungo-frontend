"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactMoney } from "@/lib/format";

export type GrowthPoint = { month: string; income: number };

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: d.month.slice(5) }));
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              "Paid rent",
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { month?: string } | undefined;
              return row?.month ?? "";
            }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#1e3a8a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#1e3a8a", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
