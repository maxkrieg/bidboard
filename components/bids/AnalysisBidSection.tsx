import { CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import type { BidAnalysisBid } from "@/types";

interface AnalysisBidSectionProps {
  bid: BidAnalysisBid;
  totalPrice: number;
}

export function AnalysisBidSection({ bid, totalPrice }: AnalysisBidSectionProps) {
  return (
    <div className="border border-zinc-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-zinc-900">{bid.contractor_name}</h4>
        <span className="text-sm text-zinc-500">
          ${totalPrice.toLocaleString()}
        </span>
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
