"use client";

import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LineItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface LineItemsTableProps {
  items: LineItemInput[];
  onChange?: (items: LineItemInput[]) => void;
  readonly?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function LineItemsTable({
  items,
  onChange,
  readonly = false,
}: LineItemsTableProps) {
  function update(index: number, field: keyof LineItemInput, value: string) {
    if (!onChange) return;
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      if (field === "quantity" || field === "unit_price") {
        return { ...item, [field]: parseFloat(value) || 0 };
      }
      return { ...item, [field]: value };
    });
    onChange(updated);
  }

  function addRow() {
    if (!onChange) return;
    onChange([
      ...items,
      { description: "", quantity: 1, unit: "", unit_price: 0 },
    ]);
  }

  function removeRow(index: number) {
    if (!onChange) return;
    onChange(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  if (readonly && items.length === 0) {
    return (
      <p className="text-sm text-zinc-400 italic">No line items recorded.</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 uppercase tracking-wide">
            <th className="pb-2 pr-3 font-medium w-1/2">Description</th>
            <th className="pb-2 pr-3 font-medium w-16">Qty</th>
            <th className="pb-2 pr-3 font-medium w-20">Unit</th>
            <th className="pb-2 pr-3 font-medium w-28 text-right">
              Unit Price
            </th>
            <th className="pb-2 font-medium w-28 text-right">Total</th>
            {!readonly && <th className="pb-2 w-8" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const rowTotal = item.quantity * item.unit_price;
            return (
              <tr key={i} className="border-b border-zinc-100">
                <td className="py-1.5 pr-3">
                  {readonly ? (
                    <span className="text-zinc-700">{item.description}</span>
                  ) : (
                    <Input
                      value={item.description}
                      onChange={(e) => update(i, "description", e.target.value)}
                      placeholder="Description"
                      className="h-8 text-sm"
                    />
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {readonly ? (
                    <span className="text-zinc-700">{item.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => update(i, "quantity", e.target.value)}
                      className="h-8 text-sm w-16"
                      min="0"
                      step="0.01"
                    />
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {readonly ? (
                    <span className="text-zinc-500">{item.unit || "—"}</span>
                  ) : (
                    <Input
                      value={item.unit}
                      onChange={(e) => update(i, "unit", e.target.value)}
                      placeholder="ea"
                      className="h-8 text-sm w-20"
                    />
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right">
                  {readonly ? (
                    <span className="text-zinc-700">
                      {formatCurrency(item.unit_price)}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => update(i, "unit_price", e.target.value)}
                      className="h-8 text-sm w-28 text-right"
                      min="0"
                      step="0.01"
                    />
                  )}
                </td>
                <td className="py-1.5 text-right font-medium text-zinc-800">
                  {formatCurrency(rowTotal)}
                </td>
                {!readonly && (
                  <td className="py-1.5 pl-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={readonly ? 4 : 4}
              className="pt-3 text-xs text-zinc-500 uppercase tracking-wide font-medium"
            >
              Subtotal
            </td>
            <td className="pt-3 text-right font-semibold text-zinc-900">
              {formatCurrency(subtotal)}
            </td>
            {!readonly && <td />}
          </tr>
        </tfoot>
      </table>

      {!readonly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={addRow}
        >
          <Plus size={13} className="mr-1" />
          Add Row
        </Button>
      )}
    </div>
  );
}
