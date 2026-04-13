"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, ChevronRight, MapPin, Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddAssetModal } from "@/components/dashboard/quick-dialogs";
import { RowActions } from "@/components/ui/row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import { currentMonth, formatCompactMoney, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Asset } from "@/lib/types";

function typeLabel(t: Asset["type"]) {
  return t === "land" ? "Land" : "Property";
}

export default function AssetsPage() {
  const qc = useQueryClient();
  const month = currentMonth();
  const [typeFilter, setTypeFilter] = useState<"all" | Asset["type"]>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
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
  const pageSize = 10;

  const filtered = useMemo(() => {
    return (assets ?? []).filter((a) => {
      const byType = typeFilter === "all" || a.type === typeFilter;
      const byLocation =
        !locationFilter.trim() ||
        (a.location ?? "").toLowerCase().includes(locationFilter.trim().toLowerCase());
      return byType && byLocation;
    });
  }, [assets, typeFilter, locationFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <AddAssetModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Portfolio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Properties and land you track on Umutungo. Select an asset for units, cash flow, and
          investment context.
        </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-main-blue px-4 py-2 text-sm font-medium text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New asset
        </button>
      </div>
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "all" | Asset["type"]);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value="property">Property</option>
            <option value="land">Land</option>
          </select>
          <input
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by location"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
      </Card>

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
          {paginated.map((a) => (
            <div key={a.id} className="group block">
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
                    <div className="flex items-center gap-2">
                      <Link href={`/assets/${a.id}`}>
                        <ChevronRight
                          className="mt-1 h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-main-blue"
                          strokeWidth={1.75}
                        />
                      </Link>
                      <RowActions
                        onView={() => (window.location.href = `/assets/${a.id}`)}
                        onEdit={() => toast.info("Edit asset form can be added in this screen")}
                        onDelete={() =>
                          toast.promise(deleteMutation.mutateAsync(a.id), {
                            loading: "Deleting asset...",
                            success: "Asset deleted successfully",
                            error: "Error deleting asset",
                          })
                        }
                      />
                    </div>
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
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          Showing {paginated.length} of {filtered.length} assets
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
