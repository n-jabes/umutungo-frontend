"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/contexts/auth-context";
import { deleteMyAccount, updateMyAccountProfile } from "@/lib/account-client";
import { getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  isValidRwandaPhoneInput,
  normalizeRwandaPhone,
  rwandaPhoneErrorMessage,
} from "@/lib/phone";
import type { UserPublic } from "@/lib/types";

type ProfileRole = "owner" | "agent" | "admin";

export function ProfileAccountPanel({ role }: { role: ProfileRole }) {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  useEffect(() => {
    const t = phone.trim();
    if (!t) {
      setPhoneHint(null);
      return;
    }
    setPhoneHint(isValidRwandaPhoneInput(t) ? null : rwandaPhoneErrorMessage());
  }, [phone]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const normalizedPhone = phone.trim() ? normalizeRwandaPhone(phone) : "";
      if (phone.trim() && !normalizedPhone) {
        throw new Error(rwandaPhoneErrorMessage());
      }
      const emailTrim = email.trim();
      const phoneOut = normalizedPhone || null;
      const emailOut = emailTrim ? emailTrim.toLowerCase() : null;
      if (!emailOut && !phoneOut) {
        throw new Error("Either email or phone is required.");
      }
      return updateMyAccountProfile({
        name: name.trim(),
        email: emailOut,
        phone: phoneOut,
      });
    },
    onSuccess: async (updated: UserPublic) => {
      await refreshUser();
      await qc.invalidateQueries({ queryKey: queryKeys.users });
      await qc.invalidateQueries({ queryKey: queryKeys.agents });
      if (role === "admin") {
        await qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey as string[];
            return k[0] === "platform" && k[1] === "admin" && k[2] === "users";
          },
        });
      }
      setName(updated.name ?? "");
      setEmail(updated.email ?? "");
      setPhone(updated.phone ?? "");
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteAccount = useMutation({
    mutationFn: () => deleteMyAccount({ password: deletePassword }),
    onSuccess: async () => {
      setDeleteModalOpen(false);
      setDeletePassword("");
      await logout();
      await qc.clear();
      toast.success("Your account has been deleted.");
      router.replace("/");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!user) return null;

  const ownerDeleteNote =
    role === "owner"
      ? "This permanently deletes your workspace: assets, tenants, leases, payments, subscription, and team agent accounts."
      : null;

  function closeDeleteModal() {
    if (deleteAccount.isPending) return;
    setDeleteModalOpen(false);
    setDeletePassword("");
  }

  return (
    <div className="space-y-8">
      <Modal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete your account?"
        description={
          role === "agent"
            ? "Your agent login will be removed. Your owner’s data stays in Umutungo."
            : "This permanently removes your owner workspace and all linked agent accounts."
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {role === "owner" && ownerDeleteNote ? (
              <>
                {ownerDeleteNote}{" "}
              </>
            ) : null}
            This cannot be undone. Enter your current password to confirm.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="modal-delete-password" className="text-xs font-medium text-muted">
              Password
            </label>
            <input
              id="modal-delete-password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDeleteModal} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteAccount.isPending || !deletePassword.trim()}
              onClick={() => deleteAccount.mutate()}
            >
              {deleteAccount.isPending ? "Deleting…" : "Yes, delete my account"}
            </Button>
          </div>
        </div>
      </Modal>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Profile</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Update how you sign in and how we display your name. If you change your email, you may need to verify it
          again before some notices arrive reliably.
        </p>
      </div>

      <form
        className="max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile.mutate();
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="text-xs font-medium text-muted">
            Full name
          </label>
          <input
            id="profile-name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="profile-phone" className="text-xs font-medium text-muted">
            Phone <span className="font-normal text-muted">(Rwanda formats)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+250788123456 or 0788123456"
          />
          {phoneHint ? <p className="text-xs text-amber-700 dark:text-amber-500">{phoneHint}</p> : null}
        </div>
        <p className="text-xs text-muted">At least one of email or phone must remain on the account.</p>
        <Button type="submit" disabled={saveProfile.isPending}>
          {saveProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Card className="border-red-200/80 bg-red-50/40 p-6 dark:border-red-900/50 dark:bg-red-950/20">
        <h3 className="text-sm font-semibold text-foreground">Danger zone</h3>
        {role === "admin" ? (
          <p className="mt-2 text-sm text-muted">
            Platform admin accounts cannot be deleted from the app (avoids locking everyone out). Ask another operator
            or use controlled database procedures if an admin account must be removed.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              {role === "agent"
                ? "Deleting removes only your agent login. Your owner’s portfolio is unchanged."
                : ownerDeleteNote}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4 border-red-200 text-red-800 hover:bg-red-100 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/60"
              onClick={() => {
                setDeletePassword("");
                setDeleteModalOpen(true);
              }}
            >
              Delete my account…
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
