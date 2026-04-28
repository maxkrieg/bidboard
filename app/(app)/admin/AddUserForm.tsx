"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addUser } from "@/actions/admin";
import type { ActionResult } from "@/types";

export function AddUserForm() {
  const [state, formAction, isPending] = useActionState<
    ActionResult<null> | null,
    FormData
  >(addUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Add User</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Sends the user a magic link and pre-approves their account.
      </p>

      <form ref={formRef} action={formAction} className="flex gap-2">
        <Input
          type="email"
          name="email"
          placeholder="user@example.com"
          required
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Inviting…" : "Invite & Approve"}
        </Button>
      </form>

      {state && !state.success && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-2 text-sm text-emerald-600">
          Invitation sent successfully.
        </p>
      )}
    </div>
  );
}
