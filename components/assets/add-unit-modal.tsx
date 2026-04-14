"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.units(assetId) });
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.occupancy });
      toast.success(preset === "whole" ? "Single unit created" : "Unit added");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
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
            onChange={(e) => setRentAmount(e.target.value)}
            placeholder="0"
            inputMode="decimal"
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
