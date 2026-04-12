"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, ChevronRight, MapPin, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { currentMonth, formatCompactMoney, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Asset } from "@/lib/types";

function typeLabel(t: Asset["type"]) {
  return t === "land" ? "Land" : "Property";
}

export default function AssetsPage() {
  const month = currentMonth();
  const { data: assets, isLoading } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const { data: perf } = useQuery({
    queryKey: queryKeys.assetPerformance(month),
    queryFn: () => api.assetPerformance(month),
  });

  const incomeByAsset = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of perf?.assets ?? []) {
      m.set(row.assetId, row.incomeForMonth);
    }
    return m;
  }, [perf]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Portfolio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Properties and land you track on Umutungo. Select an asset for units, cash flow, and
          investment context.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading assets…</p>
      ) : !assets?.length ? (
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted" strokeWidth={1.5} />
          <p className="mt-4 text-sm font-medium text-foreground">No assets yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first property or parcel from the dashboard quick actions.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-main-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-main-blue/90"
          >
            Go to dashboard
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((a) => (
            <Link key={a.id} href={`/assets/${a.id}`} className="group block">
              <Card className="h-full p-0 transition duration-200 group-hover:border-main-blue/25 group-hover:shadow-card-hover">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-muted-bg px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        {typeLabel(a.type)}
                      </span>
                      <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground group-hover:text-main-blue">
                        {a.name}
                      </h2>
                      {a.location ? (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                          <span className="line-clamp-2">{a.location}</span>
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight
                      className="mt-1 h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-main-blue"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted">Book value</p>
                      <p className="mt-1 font-semibold tabular-nums-fin text-foreground">
                        {a.purchasePrice ? formatCompactMoney(a.purchasePrice) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Income ({month})</p>
                      <p className="mt-1 flex items-center gap-1.5 font-semibold tabular-nums-fin text-main-green">
                        <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {formatMoney(incomeByAsset.get(a.id) ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Units</p>
                      <p className="mt-1 font-semibold text-foreground">{a._count?.units ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted">Status</p>
                      <p className="mt-1 font-medium text-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
