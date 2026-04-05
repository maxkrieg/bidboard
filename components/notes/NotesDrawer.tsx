"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectNotes, upsertNote } from "@/actions/notes";
import type { UserNote } from "@/types";

interface BidEntry {
  id: string;
  contractorName: string;
}

interface NotesDrawerProps {
  projectId: string;
  projectName: string;
  bids: BidEntry[];
  defaultScope: "project" | string; // "project" or a bid ID
}

type SaveStatus = "idle" | "saving" | "saved";

export function NotesDrawer({
  projectId,
  projectName,
  bids,
  defaultScope,
}: NotesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<string>(defaultScope);
  const [notes, setNotes] = useState<Record<string, string>>({}); // scope key → body
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all notes when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getProjectNotes(projectId).then((result) => {
      if (result.success) {
        const map: Record<string, string> = {};
        for (const note of result.data) {
          const key = note.bid_id ?? "project";
          map[key] = note.body;
        }
        setNotes(map);
      }
      setIsLoading(false);
    });
  }, [isOpen, projectId]);

  // Esc key closes drawer
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleOpen() {
    setActiveScope(defaultScope);
    setIsOpen(true);
  }

  function handleTextChange(value: string) {
    setNotes((prev) => ({ ...prev, [activeScope]: value }));
    setSaveStatus("saving");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    debounceRef.current = setTimeout(async () => {
      const bidId = activeScope === "project" ? null : activeScope;
      const result = await upsertNote(projectId, bidId, value);
      if (result.success) {
        setSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    }, 800);
  }

  const currentBody = notes[activeScope] ?? "";

  const scopeLabel =
    activeScope === "project"
      ? projectName
      : (bids.find((b) => b.id === activeScope)?.contractorName ?? "Bid");

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <NotebookPen size={13} className="mr-1.5" />
        Notes
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-[800px] max-w-full bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
              <div className="flex items-center gap-2">
                <NotebookPen size={15} className="text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-900">Notes</span>
                <span className="text-xs text-zinc-400">— private to you</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Left nav */}
              <nav className="w-44 shrink-0 border-r border-zinc-100 overflow-y-auto py-2">
                <button
                  onClick={() => setActiveScope("project")}
                  className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                    activeScope === "project"
                      ? "border-l-2 border-indigo-500 text-indigo-700 font-medium bg-indigo-50/60 pl-[10px]"
                      : "border-l-2 border-transparent text-zinc-600 hover:bg-zinc-50 pl-[10px]"
                  }`}
                >
                  Project
                </button>

                {bids.length > 0 && (
                  <div className="mt-2 mb-1 px-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Bids
                    </p>
                  </div>
                )}

                {bids.map((bid) => (
                  <button
                    key={bid.id}
                    onClick={() => setActiveScope(bid.id)}
                    className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                      activeScope === bid.id
                        ? "border-l-2 border-indigo-500 text-indigo-700 font-medium bg-indigo-50/60 pl-[10px]"
                        : "border-l-2 border-transparent text-zinc-600 hover:bg-zinc-50 pl-[10px]"
                    }`}
                    title={bid.contractorName}
                  >
                    {bid.contractorName}
                  </button>
                ))}
              </nav>

              {/* Note content */}
              <div className="flex flex-col flex-1 min-w-0 p-4">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <p className="text-xs font-medium text-zinc-500 truncate">
                    {scopeLabel}
                  </p>
                  <span className="text-xs text-zinc-400 ml-2 shrink-0">
                    {saveStatus === "saving" && "Saving…"}
                    {saveStatus === "saved" && "Saved ✓"}
                  </span>
                </div>

                {isLoading ? (
                  <div className="flex-1 animate-pulse">
                    <div className="h-3 bg-zinc-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-zinc-100 rounded w-1/2" />
                  </div>
                ) : (
                  <textarea
                    className="flex-1 w-full resize-none text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none leading-relaxed"
                    placeholder="Add your private notes here…"
                    value={currentBody}
                    onChange={(e) => handleTextChange(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
