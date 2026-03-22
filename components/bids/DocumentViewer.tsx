"use client";

import { useEffect, useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { DocumentViewerSkeleton } from "./DocumentViewerSkeleton";
import { DocumentViewerModal } from "./DocumentViewerModal";
import type { BidDocument } from "@/types";

interface DocumentViewerProps {
  document: BidDocument;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const isPdf = /\.(pdf)$/i.test(document.filename);

  useEffect(() => {
    setSignedUrl(null);
    const supabase = createClient();
    supabase.storage
      .from("bid-documents")
      .createSignedUrl(document.storage_path, 3600)
      .then(({ data }) => {
        if (data) setSignedUrl(data.signedUrl);
      });
  }, [document.storage_path]);

  return (
    <div className="flex flex-col h-full">
      {/* Document header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 shrink-0">
        <span className="text-sm font-medium text-zinc-700 truncate">
          {document.filename}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {signedUrl && (
            <a
              href={signedUrl}
              download={document.filename}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            aria-label="Expand to full screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {!signedUrl ? (
          <DocumentViewerSkeleton />
        ) : isPdf ? (
          <PdfViewer url={signedUrl} />
        ) : (
          <ImageViewer url={signedUrl} filename={document.filename} />
        )}
      </div>

      {showModal && (
        <DocumentViewerModal
          document={document}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
