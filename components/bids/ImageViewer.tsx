"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ImageViewerProps {
  url: string;
  filename: string;
}

export function ImageViewer({ url, filename }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex flex-col h-full border border-zinc-200 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0">
        <button
          onClick={() => setZoom((z) => Math.max(25, z - 25))}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5 text-zinc-600" />
        </button>
        <span className="text-xs text-zinc-600 w-10 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 25))}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5 text-zinc-600" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-auto bg-zinc-100 flex items-start justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename}
          style={{ width: `${zoom}%`, maxWidth: "none" }}
          className="rounded shadow-sm"
        />
      </div>
    </div>
  );
}
