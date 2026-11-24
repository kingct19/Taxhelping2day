"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, FileIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadField({
  action,
  fields,
  label,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(next: File) {
    if (disabled || pending) return;
    if (next.size > 15 * 1024 * 1024) {
      setError("Choose a file up to 15 MB.");
      return;
    }
    setFile(next);
    setError(null);
    setPending(true);
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    data.set("file", next);
    try {
      await action(data);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload did not finish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-center text-sm transition-colors",
          drag ? "border-primary bg-primary/5" : "border-border",
          disabled && "pointer-events-none opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          const next = event.dataTransfer.files[0];
          if (next) void send(next);
        }}
      >
        <UploadIcon className="size-4 text-muted-foreground" />
        <span>{pending ? "Uploading…" : label}</span>
        <span className="text-xs text-muted-foreground">Drop a file here, or choose one below.</span>
        <div className="flex flex-wrap justify-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
            Choose file
            <input
              className="sr-only"
              type="file"
              accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
              disabled={disabled || pending}
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) void send(next);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs ring-1 ring-foreground/15"
            disabled={disabled || pending}
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon className="size-3.5" />
            Camera
          </button>
        </div>
      </div>
      <input
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || pending}
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next) void send(next);
          event.target.value = "";
        }}
      />
      {pending ? (
        <div className="h-1 overflow-hidden rounded-full bg-muted" role="status" aria-label="Uploading">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      ) : null}
      {file && !pending ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileIcon className="size-3.5 shrink-0" />
          <span className="truncate">{file.name}</span>
        </p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
