"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { DocumentViewerSkeleton } from "./DocumentViewerSkeleton";
import type { BidDocument } from "@/types";

interface DocumentViewerModalProps {
  document: BidDocument;
  onClose: () => void;
}

export function DocumentViewerModal({
  document,
  onClose,
}: DocumentViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isPdf = /\.(pdf)$/i.test(document.filename);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("bid-documents")
      .createSignedUrl(document.storage_path, 3600)
      .then(({ data }) => {
        if (data) setSignedUrl(data.signedUrl);
      });
  }, [document.storage_path]);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-zinc-900 truncate max-w-xs">
          {document.filename}
        </span>
        <div className="flex items-center gap-3">
          {signedUrl && (
            <a
              href={signedUrl}
              download={document.filename}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden p-4">
        {!signedUrl ? (
          <DocumentViewerSkeleton />
        ) : isPdf ? (
          <PdfViewer url={signedUrl} />
        ) : (
          <ImageViewer url={signedUrl} filename={document.filename} />
        )}
      </div>
    </div>
  );
}
