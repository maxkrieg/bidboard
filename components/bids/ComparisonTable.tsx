import type { BidWithMeta } from "@/types";

interface ComparisonTableProps {
  bids: BidWithMeta[];
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function ComparisonTable({ bids }: ComparisonTableProps) {
  // Union of all line item descriptions across all bids
  const allDescriptions = Array.from(
    new Set(
      bids.flatMap((bid) => bid.line_items.map((li) => li.description))
    )
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-1/4">
              Item
            </th>
            {bids.map((bid) => (
              <th
                key={bid.id}
                className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide"
              >
                <div className="font-semibold text-zinc-700 normal-case text-sm">
                  {bid.contractor.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allDescriptions.map((description) => {
            // Prices per bid for this line item
            const prices = bids.map((bid) => {
              const item = bid.line_items.find(
                (li) => li.description === description
              );
              if (!item) return null;
              return item.quantity * item.unit_price;
            });

            const numericPrices = prices.filter((p): p is number => p !== null);
            const minPrice =
              numericPrices.length > 0 ? Math.min(...numericPrices) : null;
            const maxPrice =
              numericPrices.length > 1 ? Math.max(...numericPrices) : null;

            return (
              <tr
                key={description}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-4 py-3 text-zinc-700">{description}</td>
                {prices.map((price, i) => {
                  let cellClass = "px-4 py-3 text-right text-zinc-700";
                  if (price !== null && numericPrices.length > 1) {
                    if (price === minPrice)
                      cellClass += " bg-emerald-50 text-emerald-700 font-medium";
                    else if (price === maxPrice)
                      cellClass += " bg-red-50 text-red-600";
                  }
                  return (
                    <td key={i} className={cellClass}>
                      {formatCurrency(price)}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Total row */}
          <tr className="border-t-2 border-zinc-200 bg-zinc-50">
            <td className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Total Price
            </td>
            {bids.map((bid) => {
              const allTotals = bids.map((b) => b.total_price);
              const minTotal = Math.min(...allTotals);
              const maxTotal = bids.length > 1 ? Math.max(...allTotals) : null;
              let cellClass =
                "px-4 py-3 text-right font-semibold text-zinc-900";
              if (bids.length > 1) {
                if (bid.total_price === minTotal)
                  cellClass +=
                    " bg-emerald-50 text-emerald-700";
                else if (bid.total_price === maxTotal)
                  cellClass += " bg-red-50 text-red-600";
              }
              return (
                <td key={bid.id} className={cellClass}>
                  {formatCurrency(bid.total_price)}
                </td>
              );
            })}
          </tr>

          {/* Avg. User Rating row */}
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Avg. User Rating
            </td>
            {bids.map((bid) => {
              const ratings = bid.ratings ?? [];
              const avg =
                ratings.length > 0
                  ? ratings.reduce((sum, r) => sum + r.rating, 0) /
                    ratings.length
                  : null;
              return (
                <td
                  key={bid.id}
                  className="px-4 py-3 text-right text-sm text-zinc-700"
                >
                  {avg !== null ? (
                    <span>
                      <span className="text-amber-400">★</span>{" "}
                      {avg.toFixed(1)}{" "}
                      <span className="text-zinc-400 text-xs">
                        ({ratings.length})
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-xs">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
