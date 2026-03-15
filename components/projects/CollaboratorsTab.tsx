"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CollaboratorWithUser } from "@/types";

interface CollaboratorsTabProps {
  projectId: string;
  isOwner: boolean;
  ownerEmail: string;
  ownerName: string | null;
  collaborators: CollaboratorWithUser[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function CollaboratorsTab({
  isOwner,
  ownerEmail,
  ownerName,
  collaborators,
}: CollaboratorsTabProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const atLimit = collaborators.length >= 3;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Owner row */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
          Owner
        </p>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
              {getInitials(ownerName, ownerEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {ownerName ?? ownerEmail}
            </p>
            {ownerName && (
              <p className="text-xs text-zinc-500 truncate">{ownerEmail}</p>
            )}
          </div>
          <span className="text-xs font-medium text-indigo-600">Owner</span>
        </div>
      </div>

      {collaborators.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
              Collaborators
            </p>
            <ul className="space-y-3">
              {collaborators.map((c) => {
                const displayName = c.users?.full_name ?? c.invited_email;
                const displayEmail = c.users?.email ?? c.invited_email;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs">
                        {getInitials(c.users?.full_name ?? null, displayEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {displayName}
                      </p>
                      {c.users?.full_name && (
                        <p className="text-xs text-zinc-500 truncate">
                          {displayEmail}
                        </p>
                      )}
                    </div>
                    <StatusBadge
                      status={c.status === "accepted" ? "accepted" : "pending"}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {isOwner && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
              Invite Collaborator
            </p>
            {atLimit ? (
              <p className="text-sm text-zinc-500">
                Maximum of 3 collaborators reached.
              </p>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  disabled
                  className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                  title="Invites are enabled in a later phase"
                >
                  Send Invite
                </Button>
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-2">
              Invite sending will be available soon.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
