"use client";

import { useState, useRef, useTransition } from "react";
import { FileText, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBidDocument, deleteBidDocument } from "@/actions/bids";
import { DocumentViewer } from "./DocumentViewer";
import type { BidDocument } from "@/types";

interface BidDocumentsProps {
  bidId: string;
  projectId: string;
  documents: BidDocument[];
  isOwner: boolean;
}

export function BidDocuments({
  bidId,
  projectId,
  documents: initialDocuments,
  isOwner,
}: BidDocumentsProps) {
  const [documents, setDocuments] = useState<BidDocument[]>(initialDocuments);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const previewDoc = documents.find((d) => d.id === previewDocId) ?? null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadBidDocument(bidId, projectId, formData);
      if (result.success) {
        const newDoc: BidDocument = {
          id: result.data.id,
          bid_id: bidId,
          filename: result.data.filename,
          storage_path: result.data.storage_path,
          created_at: new Date().toISOString(),
        };
        setDocuments((prev) => [...prev, newDoc]);
        setPreviewDocId(result.data.id);
      } else {
        setUploadError(result.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  async function handleDelete(documentId: string) {
    startTransition(async () => {
      const result = await deleteBidDocument(documentId, projectId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        if (previewDocId === documentId) setPreviewDocId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              onClick={() => setPreviewDocId(doc.id === previewDocId ? null : doc.id)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                doc.id === previewDocId
                  ? "bg-indigo-50 border-indigo-200"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center gap-2 text-zinc-700 min-w-0">
                <FileText size={14} className="shrink-0 text-zinc-400" />
                <span className="truncate">{doc.filename}</span>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  disabled={isPending}
                  className="ml-3 shrink-0 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Inline preview */}
      {previewDoc && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="h-80">
            <DocumentViewer document={previewDoc} />
          </div>
        </div>
      )}

      {isOwner && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleUpload}
            disabled={isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            <Upload size={13} className="mr-1.5" />
            {isPending ? "Uploading…" : "Upload Document"}
          </Button>
          <p className="mt-1 text-xs text-zinc-400">
            PDF, JPG, or PNG — max 10MB
          </p>
          {uploadError && (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
