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

function GoogleGLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span className="text-sm leading-none tracking-tight">
      <span className="text-amber-400">{"★".repeat(filled)}</span>
      <span className="text-zinc-200">{"★".repeat(5 - filled)}</span>
    </span>
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

  const googleUrl = contractor.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contractor.name)}&query_place_id=${contractor.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contractor.name)}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-[var(--shadow-card)] p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
        Contractor
      </h3>
      <p className="text-base font-semibold text-zinc-900 mb-3">{contractor.name}</p>

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
        <li className="flex items-center gap-2">
          <GoogleGLogo className="h-3.5 w-3.5 shrink-0" />
          {!enriched ? (
            <div className="animate-pulse h-3 w-32 rounded bg-zinc-100" />
          ) : contractor.google_rating !== null ? (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-indigo-600"
            >
              <span className="font-medium">{contractor.google_rating.toFixed(1)}</span>
              <Stars rating={contractor.google_rating} />
              <span className="text-zinc-400 text-xs">
                ({(contractor.google_review_count ?? 0).toLocaleString()} reviews)
              </span>
            </a>
          ) : (
            <span className="text-zinc-400">Not found on Google</span>
          )}
        </li>
      </ul>

      {enriched && (
        <p className="mt-3 text-xs text-zinc-400 text-right">
          Updated {formatRelativeDate(contractor.enriched_at!)}
        </p>
      )}
    </div>
  );
}
