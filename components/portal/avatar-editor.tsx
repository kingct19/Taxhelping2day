"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeAvatar, saveAvatar } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const accepted = ["image/jpeg", "image/png", "image/webp"];

export function AvatarEditor({ name, src }: { name: string; src: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const initials = name.trim().slice(0, 1).toUpperCase() || "?";

  function choose(file: File | undefined) {
    if (!file) return;
    if (!accepted.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose an image under 8 MB. It will be cropped to a square.");
      return;
    }
    setError(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setPreview(URL.createObjectURL(file));
  }

  async function save() {
    const image = imageRef.current;
    if (!image) return;
    if (!image.naturalWidth || !image.naturalHeight) {
      setError("That image could not be read. Try a different photo.");
      return;
    }
    const frame = 224;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = size / frame;
    const cover = Math.max(size / image.naturalWidth, size / image.naturalHeight) * scale;
    const width = image.naturalWidth * cover;
    const height = image.naturalHeight * cover;
    context.drawImage(image, (size - width) / 2 + offset.x * ratio, (size - height) / 2 + offset.y * ratio, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) {
      setError("Could not crop that image.");
      return;
    }
    setPending(true);
    const data = new FormData();
    data.set("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    const result = await saveAvatar(data);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPreview(null);
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const result = await removeAvatar();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {src && !preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-lg font-medium">{initials}</span>
        )}
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
            {src ? "Replace photo" : "Upload photo"}
          </Button>
          {src ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void remove()}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Cropped to a square before it is saved.</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="grid w-full max-w-sm gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-sm font-medium">Crop photo</p>
            <div
              className="mx-auto size-56 cursor-grab overflow-hidden rounded-full bg-muted active:cursor-grabbing"
              onPointerDown={(event) => {
                drag.current = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                setOffset((current) => ({ x: current.x + event.clientX - drag.current!.x, y: current.y + event.clientY - drag.current!.y }));
                drag.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={preview}
                alt=""
                draggable={false}
                className="size-full object-cover"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
              />
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Zoom
              <input type="range" min="1" max="2.4" step="0.02" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>Cancel</Button>
              <Button type="button" size="sm" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save photo"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
