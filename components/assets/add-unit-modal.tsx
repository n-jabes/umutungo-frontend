"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { filterMoneyInput } from "@/lib/decimal-input";
import { api, getErrorMessage } from "@/lib/api";
import { entitlementsToQuotaBars } from "@/lib/plan-usage";
import { queryKeys } from "@/lib/query-keys";
import type { Unit } from "@/lib/types";

const UNIT_TYPES: NonNullable<Unit["type"]>[] = ["room", "shop", "apartment", "whole"];

type Preset = "custom" | "whole";

export function AddUnitModal({
  open,
  onClose,
  assetId,
  assetName,
  assetType,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  assetType: "property" | "land";
  preset: Preset;
}) {
  const qc = useQueryClient();
  const entitlements = useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: () => api.getMeEntitlements(),
    enabled: open,
    staleTime: 60_000,
  });
  const unitsQuota = entitlements.data ? entitlementsToQuotaBars(entitlements.data).units : null;
  const unitGrowthLikelyBlocked = !!(unitsQuota?.atOrOverLimit && !unitsQuota.overLimit);
  const unitOverPlan = !!unitsQuota?.overLimit;

  const [name, setName] = useState("");
  const [type, setType] = useState<NonNullable<Unit["type"]>>("apartment");
  const [rentAmount, setRentAmount] = useState("");
  const [status, setStatus] = useState<Unit["status"]>("vacant");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (preset === "whole") {
      setName(assetName.trim() || "Entire property");
      setType("whole");
      setRentAmount("");
      setStatus("vacant");
    } else {
      setName("");
      setType("apartment");
      setRentAmount("");
      setStatus("vacant");
    }
  }, [open, preset, assetName]);

  const mutation = useMutation({
    mutationFn: () =>
      api.createUnit({
        assetId,
        name: name.trim() || undefined,
        type,
        rentAmount: rentAmount.trim() || undefined,
        status,
      }),
    onSuccess: () => {
      toast.success(preset === "whole" ? "Single unit created" : "Unit added");
      onClose();
      void Promise.all([
        qc.invalidateQueries({ queryKey: ["units"] }),
        qc.invalidateQueries({ queryKey: queryKeys.assets }),
        qc.invalidateQueries({ queryKey: queryKeys.leases }),
        qc.invalidateQueries({ queryKey: queryKeys.leasesActive }),
        qc.invalidateQueries({ queryKey: queryKeys.occupancy }),
        qc.invalidateQueries({ queryKey: ["analytics", "rent-status", "asset", assetId] }),
        qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot }),
        qc.invalidateQueries({ queryKey: queryKeys.entitlements }),
      ]);
    },
    onError: (e: unknown) => {
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    },
  });

  const title = preset === "whole" ? "Single unit (whole)" : "Add unit";
  const description =
    preset === "whole"
      ? assetType === "land"
        ? "Creates one rentable unit for the full parcel. Use this when you do not split the land into multiple spaces."
        : "Creates one rentable unit for the entire building or plot. Use this when the asset is not split into rooms or apartments."
      : "Add a rentable space linked to this asset.";

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Unit name</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={preset === "whole" ? "e.g. Entire building" : "e.g. Unit 2A"}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Type</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={type ?? "apartment"}
            onChange={(e) => setType(e.target.value as NonNullable<Unit["type"]>)}
            disabled={preset === "whole"}
          >
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "whole" ? "Whole property / parcel" : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          {preset === "whole" ? (
            <p className="mt-1 text-[11px] text-muted">Type is fixed to “whole” for a single-unit asset.</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Monthly rent (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={rentAmount}
            onChange={(e) => setRentAmount(filterMoneyInput(e.target.value))}
            placeholder="0"
            inputMode="decimal"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Status</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as Unit["status"])}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {unitOverPlan ? (
          <p className="text-sm text-red-700 dark:text-red-300">
            You are over your plan&apos;s unit limit. Remove units elsewhere first, then try again — or upgrade your
            plan from Settings → Plan & usage.
          </p>
        ) : unitGrowthLikelyBlocked ? (
          <p className="text-sm text-amber-800 dark:text-amber-200/90">
            You are at your plan&apos;s unit cap. Adding a unit may still succeed if it replaces a placeholder whole unit
            without increasing your total. If the save is blocked, free a unit or upgrade under Settings → Plan & usage.
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : preset === "whole" ? "Create single unit" : "Add unit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
