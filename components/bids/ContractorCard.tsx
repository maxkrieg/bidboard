import { Globe, Phone, Mail, MapPin } from "lucide-react";
import type { Contractor } from "@/types";

interface ContractorCardProps {
  contractor: Contractor;
}

export function ContractorCard({ contractor }: ContractorCardProps) {
  const displayAddress = contractor.address ?? contractor.location;

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
              className="hover:text-indigo-600"
            >
              Website
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
    </div>
  );
}
