"use client";

import { useState, useRef } from "react";
import { Paperclip, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { BidExtractionResult } from "@/types";

type UploadZoneState = "idle" | "dragging" | "extracting" | "complete" | "error";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "application/pdf",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface DocumentUploadZoneProps {
  projectId: string;
  onExtracted: (result: BidExtractionResult, filename: string, tempStoragePath: string | null) => void;
  disabled?: boolean;
}

export function DocumentUploadZone({
  projectId,
  onExtracted,
  disabled,
}: DocumentUploadZoneProps) {
  const [state, setState] = useState<UploadZoneState>("idle");
  const [filename, setFilename] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    const mediaType = ACCEPTED_TYPES[file.type];
    if (!mediaType) {
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState("error");
      return;
    }

    setState("extracting");
    setFilename(file.name);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/extract-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_base64: base64,
          media_type: mediaType,
          project_id: projectId,
          filename: file.name,
        }),
      });
      const json = await res.json();

      if (json.success) {
        onExtracted(json.data as BidExtractionResult, file.name, json.temp_storage_path ?? null);
        setState("complete");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (state === "idle") setState("dragging");
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState("idle");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
    else setState("idle");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const isActive = state === "idle" || state === "dragging";

  const containerClass = [
    "border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-150",
    state === "idle" && !disabled
      ? "border-zinc-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50"
      : "",
    state === "dragging" ? "border-indigo-400 bg-indigo-50" : "",
    state === "extracting" ? "border-indigo-300 bg-indigo-50" : "",
    state === "complete" ? "border-emerald-300 bg-emerald-50" : "",
    state === "error" ? "border-red-300 bg-red-50" : "",
    disabled ? "opacity-50 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClass}
      onDragOver={isActive && !disabled ? handleDragOver : undefined}
      onDragLeave={isActive && !disabled ? handleDragLeave : undefined}
      onDrop={isActive && !disabled ? handleDrop : undefined}
      onClick={
        isActive && !disabled ? () => inputRef.current?.click() : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || !isActive}
      />

      {state === "idle" || state === "dragging" ? (
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <Paperclip size={20} className="text-zinc-400" />
          <p className="text-sm font-medium">Upload bid document to auto-fill</p>
          <p className="text-xs text-zinc-400">
            PDF or image · Up to 10MB · Drag and drop or click to browse
          </p>
        </div>
      ) : state === "extracting" ? (
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-sm font-medium">Reading your bid document...</p>
        </div>
      ) : state === "complete" ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Extracted from {filename}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setState("idle");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-700 underline"
          >
            Change document
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-red-600">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">
            Couldn&apos;t read this document. Fill in the fields manually.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setState("idle");
            }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
