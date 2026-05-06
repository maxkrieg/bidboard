"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Camera, Upload, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadProjectPhoto,
  deleteProjectPhoto,
  setBannerPhoto,
  updatePhotoCaption,
} from "@/actions/project-photos";
import type { ProjectPhoto } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function photoUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/project-photos/${storagePath}`;
}

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: ProjectPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 left-4 text-sm text-white/70 tabular-nums select-none">
        {index + 1} / {photos.length}
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
      >
        <X size={18} />
      </button>
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div
        className="flex flex-col items-center gap-3 px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photoUrl(photo.storage_path)}
          alt={photo.filename}
          className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
        />
        {photo.caption && (
          <p className="text-sm text-white/80 text-center max-w-lg">{photo.caption}</p>
        )}
      </div>
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>,
    document.body
  );
}

interface Props {
  photos: ProjectPhoto[];
  isOwner: boolean;
  projectId: string;
  bannerPhotoId: string | null;
}

export function ProjectPhotosTab({ photos, isOwner, projectId, bannerPhotoId }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length]
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const fd = new FormData();
    fd.append("photo", file);
    startTransition(async () => {
      const result = await uploadProjectPhoto(projectId, fd);
      if (!result.success) alert(result.error);
      router.refresh();
    });
  };

  const handleDelete = (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    startTransition(async () => {
      await deleteProjectPhoto(photoId);
      router.refresh();
    });
  };

  const handleSetBanner = (photoId: string) => {
    const newId = bannerPhotoId === photoId ? null : photoId;
    startTransition(async () => {
      await setBannerPhoto(projectId, newId);
      router.refresh();
    });
  };

  const handleCaptionBlur = (photoId: string, caption: string) => {
    startTransition(async () => {
      await updatePhotoCaption(photoId, caption);
    });
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        {isOwner && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              className="mb-6"
            >
              <Upload size={14} className="mr-1.5" />
              Upload Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}
        <Camera size={36} className="mb-3" />
        <p className="text-sm font-medium text-zinc-500">No photos yet</p>
        {isOwner && (
          <p className="text-xs mt-1">Upload photos to document your project.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {isOwner && (
        <div className="flex justify-end mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-1.5" />
            Upload Photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, i) => {
          const isBanner = photo.id === bannerPhotoId;
          return (
            <div key={photo.id} className="flex flex-col gap-1.5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenIndex(i)}
                onKeyDown={(e) => e.key === "Enter" && setOpenIndex(i)}
                className="group relative overflow-hidden rounded-lg aspect-video bg-zinc-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <img
                  src={photoUrl(photo.storage_path)}
                  alt={photo.caption ?? photo.filename}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                {isOwner ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title={isBanner ? "Remove banner" : "Set as banner"}
                      onClick={(e) => { e.stopPropagation(); handleSetBanner(photo.id); }}
                      className="rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors"
                    >
                      <Star
                        size={14}
                        className={isBanner ? "fill-indigo-500 text-indigo-500" : "text-zinc-600"}
                      />
                    </button>
                    <button
                      type="button"
                      title="Delete photo"
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                      className="rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                ) : (
                  photo.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white truncate">{photo.caption}</p>
                    </div>
                  )
                )}

                {isBanner && (
                  <div className="absolute top-1.5 left-1.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                    Banner
                  </div>
                )}
              </div>

              {isOwner && (
                <input
                  type="text"
                  defaultValue={photo.caption ?? ""}
                  placeholder="Add caption…"
                  onBlur={(e) => handleCaptionBlur(photo.id, e.target.value)}
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox photos={photos} index={openIndex} onClose={close} onPrev={prev} onNext={next} />
      )}
    </>
  );
}
