import { CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import type { BidAnalysisBid } from "@/types";

interface AnalysisBidSectionProps {
  bid: BidAnalysisBid;
  totalPrice: number;
  rank: number;
}

const rankLabels: Record<number, { label: string; className: string }> = {
  1: { label: "#1 Best", className: "bg-indigo-100 text-indigo-700" },
  2: { label: "#2", className: "bg-zinc-100 text-zinc-600" },
  3: { label: "#3", className: "bg-zinc-100 text-zinc-600" },
};

function StarRating({ score }: { score: number }) {
  return (
    <span className="text-amber-400 text-base tracking-tight">
      {"★".repeat(score)}
      {"☆".repeat(5 - score)}
    </span>
  );
}

export function AnalysisBidSection({ bid, totalPrice, rank }: AnalysisBidSectionProps) {
  const rankLabel = rankLabels[rank];
  return (
    <div className="border border-zinc-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {rankLabel && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${rankLabel.className}`}
            >
              {rankLabel.label}
            </span>
          )}
          <h4 className="font-semibold text-zinc-900">{bid.contractor_name}</h4>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StarRating score={bid.score ?? 0} />
          <span className="text-sm text-zinc-500">
            ${totalPrice.toLocaleString()}
          </span>
        </div>
      </div>

      {bid.highlights.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-green-700 mb-1.5">
            <CheckCircle size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Highlights
            </span>
          </div>
          <ul className="space-y-1">
            {bid.highlights.map((item, i) => (
              <li key={i} className="text-sm text-zinc-700 flex gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bid.red_flags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-amber-700 mb-1.5">
            <AlertTriangle size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Red Flags
            </span>
          </div>
          <ul className="space-y-1">
            {bid.red_flags.map((item, i) => (
              <li key={i} className="text-sm text-zinc-700 flex gap-2">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bid.questions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-blue-700 mb-1.5">
            <HelpCircle size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Questions to Ask
            </span>
          </div>
          <ul className="space-y-1">
            {bid.questions.map((item, i) => (
              <li key={i} className="text-sm text-zinc-700 flex gap-2">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
