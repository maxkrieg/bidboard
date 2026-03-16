"use client";

import { useEffect, useState } from "react";
import { Globe, Phone, Mail, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contractor } from "@/types";

interface ContractorCardProps {
  contractor: Contractor;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function bbbBadgeClass(rating: string): string {
  if (rating === "A+" || rating === "A") return "bg-green-100 text-green-700";
  if (rating === "B") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function SkeletonPulse() {
  return (
    <div className="animate-pulse flex flex-col items-center gap-1.5">
      <div className="h-3 w-10 rounded bg-zinc-100" />
    </div>
  );
}

export function ContractorCard({ contractor: initial }: ContractorCardProps) {
  const [contractor, setContractor] = useState<Contractor>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`contractor-${contractor.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contractors",
          filter: `id=eq.${contractor.id}`,
        },
        (payload) => {
          setContractor(payload.new as Contractor);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractor.id]);

  const enriched = !!contractor.enriched_at;
  const displayAddress = contractor.address ?? contractor.location;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-base font-semibold text-zinc-900 mb-3">
        {contractor.name}
      </h3>

      <ul className="space-y-1.5 text-sm text-zinc-600">
        {contractor.phone && (
          <li className="flex items-center gap-2">
            <Phone size={13} className="text-zinc-400 shrink-0" />
            <a href={`tel:${contractor.phone}`} className="hover:text-indigo-600">
              {contractor.phone}
            </a>
          </li>
        )}
        {contractor.email && (
          <li className="flex items-center gap-2">
            <Mail size={13} className="text-zinc-400 shrink-0" />
            <a
              href={`mailto:${contractor.email}`}
              className="hover:text-indigo-600 truncate"
            >
              {contractor.email}
            </a>
          </li>
        )}
        {contractor.website && (
          <li className="flex items-center gap-2">
            <Globe size={13} className="text-zinc-400 shrink-0" />
            <a
              href={contractor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 truncate"
            >
              {contractor.website.replace(/^https?:\/\//, "")}
            </a>
          </li>
        )}
        {displayAddress && (
          <li className="flex items-center gap-2">
            <MapPin size={13} className="text-zinc-400 shrink-0" />
            <span>{displayAddress}</span>
          </li>
        )}
      </ul>

      {/* Enrichment section */}
      <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-3 text-center">
        {/* Google */}
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">Google</p>
          {!enriched ? (
            <SkeletonPulse />
          ) : contractor.google_rating !== null ? (
            <div>
              <p className="text-sm font-medium text-zinc-800">
                ★ {contractor.google_rating}
              </p>
              <p className="text-xs text-zinc-400">
                ({contractor.google_review_count ?? 0} reviews)
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Not found</p>
          )}
        </div>

        {/* BBB */}
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">BBB</p>
          {!enriched ? (
            <SkeletonPulse />
          ) : contractor.bbb_rating ? (
            <div className="flex flex-col items-center gap-1">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${bbbBadgeClass(contractor.bbb_rating)}`}
              >
                {contractor.bbb_rating}
              </span>
              {contractor.bbb_accredited && (
                <p className="text-xs text-green-600">Accredited</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Not listed</p>
          )}
        </div>

        {/* License */}
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">License</p>
          {!enriched ? (
            <SkeletonPulse />
          ) : contractor.license_status === "active" ? (
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-xs font-medium text-green-600">✓ Active</p>
              {contractor.license_number && (
                <p className="text-xs text-zinc-400">{contractor.license_number}</p>
              )}
            </div>
          ) : contractor.license_status ? (
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-xs font-medium text-red-500">
                ✗ {contractor.license_status}
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Not verified</p>
          )}
        </div>
      </div>

      {enriched && (
        <p className="mt-3 text-xs text-zinc-400 text-right">
          Updated {formatRelativeDate(contractor.enriched_at!)}
        </p>
      )}
    </div>
  );
}
