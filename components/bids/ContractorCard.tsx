import { Globe, Phone, Mail, MapPin } from "lucide-react";
import type { Contractor } from "@/types";

interface ContractorCardProps {
  contractor: Contractor;
}

export function ContractorCard({ contractor }: ContractorCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-base font-semibold text-zinc-900 mb-3">
        {contractor.name}
      </h3>

      <ul className="space-y-1.5 text-sm text-zinc-600">
        {contractor.phone && (
          <li className="flex items-center gap-2">
            <Phone size={13} className="text-zinc-400 shrink-0" />
            <a
              href={`tel:${contractor.phone}`}
              className="hover:text-indigo-600"
            >
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
        {contractor.location && (
          <li className="flex items-center gap-2">
            <MapPin size={13} className="text-zinc-400 shrink-0" />
            <span>{contractor.location}</span>
          </li>
        )}
      </ul>

      {/* Enrichment section — populated in Phase 4 */}
      <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-3 text-center">
        {(["Google", "BBB", "License"] as const).map((label) => (
          <div key={label}>
            <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
            <div className="animate-pulse space-y-1.5 flex flex-col items-center">
              <div className="h-3 w-10 rounded bg-zinc-100" />
            </div>
            <p className="text-xs text-zinc-300 mt-1">Pending research</p>
          </div>
        ))}
      </div>
    </div>
  );
}
