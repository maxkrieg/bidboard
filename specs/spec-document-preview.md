# spec-document-preview.md — Bid Document Preview

## Overview
On the bid detail page, uploaded bid documents (PDFs and images) can be previewed inline without leaving the app. The preview lives in the right column of the bid detail page, as a tab alongside comments. Users can browse all uploaded documents for a bid, view them at a readable size, and download them.

---

## User Stories
- As a project member, I can preview an uploaded PDF bid document inline on the bid detail page
- As a project member, I can preview an uploaded image bid document inline
- As a project member, I can switch between multiple uploaded documents for a bid
- As a project member, I can switch between the document preview and the comments panel
- As a project member, I can download any uploaded document
- As a project member, I can view the document at a comfortable reading size with zoom controls

---

## Layout Change — Bid Detail Page

The right column of `/projects/[id]/bids/[bidId]` currently contains a full-height comments panel. This gets updated to a **tabbed panel** with two tabs:

```
┌──────────────────────────────────────────────────────────────────┐
│  LEFT COLUMN (bid details, contractor card, line items)          │
│                              │  RIGHT COLUMN                     │
│                              │  ┌────────────────────────────┐  │
│                              │  │ [Documents]  [Comments]    │  │
│                              │  │                            │  │
│                              │  │  [document preview area]   │  │
│                              │  │  or                        │  │
│                              │  │  [comments panel]          │  │
│                              │  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Tab defaults:**
- If the bid has uploaded documents → default to Documents tab
- If no documents → default to Comments tab
- Tab selection persists in local component state (not URL)

**Tab styling** — consistent with existing project tab pattern:
```
border-b border-zinc-200 flex gap-1
tab: px-3 py-2 text-sm font-medium
inactive: text-zinc-500 hover:text-zinc-700
active: text-indigo-600 border-b-2 border-indigo-600
```

Badge on Documents tab showing document count:
```
[Documents  2]
```
Badge: `bg-zinc-100 text-zinc-600 text-xs rounded px-1.5 py-0.5 ml-1.5`

---

## Documents Tab UI

### No Documents State

```
┌─────────────────────────────────┐
│                                 │
│    [Paperclip icon - large]     │
│    No documents uploaded        │
│    Upload a bid document to     │
│    preview it here              │
│                                 │
└─────────────────────────────────┘
```

### Single Document

```
┌─────────────────────────────────┐
│  bid-proposal.pdf    [↓ Download]│
│  ─────────────────────────────  │
│                                 │
│  [PDF / Image viewer]           │
│                                 │
│  [−]  75%  [+]     [⛶ Expand]  │
└─────────────────────────────────┘
```

### Multiple Documents

Document selector at the top — horizontal scrollable pill list:

```
┌─────────────────────────────────────────┐
│  [bid-proposal.pdf ✓] [site-photos.jpg] │
│  ─────────────────────────────────────  │
│                                         │
│  [PDF / Image viewer]                   │
│                                         │
│  [−]  75%  [+]     [⛶ Expand]         │
└─────────────────────────────────────────┘
```

Document selector pills:
```
px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer
inactive: bg-zinc-100 text-zinc-600 hover:bg-zinc-200
active: bg-indigo-100 text-indigo-700 border border-indigo-200
truncate max-w-[140px]  // truncate long filenames
```

---

## PDF Viewer

Use **`@react-pdf-viewer/core`** with the default layout plugin for PDF rendering. It handles multi-page PDFs, zoom, and scroll natively.

### Installation
```bash
npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout pdfjs-dist
```

### Setup
Configure the PDF.js worker in `next.config.ts`:
```ts
// next.config.ts
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/legacy/build/pdf'
    return config
  }
}
```

### Component — `components/bids/PdfViewer.tsx`

```tsx
'use client'

import { Worker, Viewer } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

type PdfViewerProps = {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],  // hide sidebar tabs for cleaner look
    toolbarPlugin: {
      fullScreenPlugin: { enableShortcuts: false }
    }
  })

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
      <div className="h-full w-full rounded-md overflow-hidden border border-zinc-200">
        <Viewer
          fileUrl={url}
          plugins={[defaultLayoutPluginInstance]}
          theme={{ theme: 'light' }}
        />
      </div>
    </Worker>
  )
}
```

### Toolbar Customization
Override `@react-pdf-viewer` default toolbar styles to match BidBoard design:
- Toolbar background: `white` with `border-b border-zinc-200`
- Buttons: match BidBoard ghost button style
- Hide unnecessary toolbar items: annotations, print (keep: zoom in/out, zoom level, page navigation, full screen)

---

## Image Viewer

For JPG, PNG, and WEBP documents — a simpler custom viewer since react-pdf-viewer only handles PDFs.

### Component — `components/bids/ImageViewer.tsx`

```tsx
'use client'

import { useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

type ImageViewerProps = {
  url: string
  filename: string
}

export function ImageViewer({ url, filename }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100)

  return (
    <div className="flex flex-col h-full border border-zinc-200 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 bg-zinc-50">
        <button
          onClick={() => setZoom(z => Math.max(25, z - 25))}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-200"
        >
          <ZoomOut className="h-3.5 w-3.5 text-zinc-600" />
        </button>
        <span className="text-xs text-zinc-600 w-10 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom(z => Math.min(200, z + 25))}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-200"
        >
          <ZoomIn className="h-3.5 w-3.5 text-zinc-600" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-auto bg-zinc-100 flex items-start justify-center p-4">
        <img
          src={url}
          alt={filename}
          style={{ width: `${zoom}%`, maxWidth: 'none' }}
          className="rounded shadow-sm"
        />
      </div>
    </div>
  )
}
```

---

## Document Viewer Wrapper — `components/bids/DocumentViewer.tsx`

This component determines whether to render `PdfViewer` or `ImageViewer` based on file type:

```tsx
type DocumentViewerProps = {
  document: {
    file_name: string
    file_type: string
    storage_path: string
  }
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    // Generate a signed URL from Supabase Storage
    async function getUrl() {
      const { data } = await supabase.storage
        .from('bid-documents')
        .createSignedUrl(document.storage_path, 3600) // 1 hour expiry
      if (data) setSignedUrl(data.signedUrl)
    }
    getUrl()
  }, [document.storage_path])

  if (!signedUrl) return <DocumentViewerSkeleton />

  const isPdf = document.file_type === 'application/pdf'

  return isPdf
    ? <PdfViewer url={signedUrl} />
    : <ImageViewer url={signedUrl} filename={document.file_name} />
}
```

---

## Supabase Storage — Signed URLs

Bid documents are stored in a private Supabase Storage bucket (`bid-documents`). They are **not** publicly accessible — a signed URL must be generated for each viewing session.

- Signed URLs expire after **1 hour**
- Generate a fresh signed URL each time the Documents tab is opened or a document is selected
- Do not cache signed URLs in localStorage — regenerate on each session

**Storage bucket policy:**
```sql
-- Only project members can read documents
create policy "bid documents: read"
on storage.objects for select
using (
  bucket_id = 'bid-documents' and
  exists (
    select 1 from bid_documents bd
    join bids b on b.id = bd.bid_id
    join projects p on p.id = b.project_id
    left join project_collaborators pc on pc.project_id = p.id
    where bd.storage_path = name
      and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
  )
);
```

---

## Expand to Full Screen

The `⛶ Expand` button in the viewer toolbar opens the document in a full-screen modal overlay for easier reading:

```
Modal: fixed inset-0 z-50 bg-white flex flex-col
Header: px-6 py-4 border-b border-zinc-200
  - filename on left
  - [Download] button + [✕ Close] button on right
Body: flex-1 overflow-hidden p-4
  - Full PdfViewer or ImageViewer at 100% height
```

This gives users who need to read the document carefully a distraction-free full-screen view.

---

## Download Button

Each document has a download button in the viewer header:

```tsx
<a
  href={signedUrl}
  download={document.file_name}
  className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
>
  <Download className="h-4 w-4" />
  Download
</a>
```

---

## Right Column Height

The right column panel needs a fixed height to make the PDF viewer work properly (it needs a constrained container to scroll within):

```
Desktop: h-[calc(100vh-14rem)] sticky top-[5.5rem]
```

This keeps the panel in view as the user scrolls the left column, matching the behavior of the current comments panel.

---

## Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `app/(app)/projects/[id]/bids/[bidId]/page.tsx` | Modify | Add tab switcher to right column |
| `components/bids/DocumentsTab.tsx` | Create | Documents tab with selector + viewer |
| `components/bids/DocumentViewer.tsx` | Create | Wrapper — routes to PDF or image viewer |
| `components/bids/PdfViewer.tsx` | Create | PDF viewer using react-pdf-viewer |
| `components/bids/ImageViewer.tsx` | Create | Image viewer with zoom controls |
| `components/bids/DocumentViewerModal.tsx` | Create | Full-screen expand modal |
| `components/bids/DocumentViewerSkeleton.tsx` | Create | Loading skeleton for viewer |
