"use client";

import { useEffect, useRef, useState } from "react";
import { recordSavedTemplate } from "@/lib/signing-actions";

const builderScript = "https://cdn.docuseal.com/js/builder.js";

function templateIdFrom(event: Event): number | null {
  const detail = (event as CustomEvent<{ id?: unknown; template_id?: unknown; template?: { id?: unknown } }>).detail;
  const id = Number(detail?.id ?? detail?.template_id ?? detail?.template?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function SmartdocBuilder({ templateId, token, savedDocusealId }: { templateId: string; token: string; savedDocusealId: number | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(token);
  const recordedId = useRef(savedDocusealId);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!document.querySelector(`script[src="${builderScript}"]`)) {
      const script = document.createElement("script");
      script.src = builderScript;
      script.async = true;
      document.body.appendChild(script);
    }
    const builder = document.createElement("docuseal-builder");
    builder.setAttribute("data-token", tokenRef.current);
    builder.setAttribute("data-background-color", "#ffffff");
    builder.setAttribute(
      "data-custom-css",
      ".ds { background: #ffffff; color: #18181b; color-scheme: light; } .fields-grid-item, .fields-list-item, .default-field { color: #18181b; background: #ffffff; border-color: #d4d4d8; }",
    );
    builder.style.display = "block";
    builder.style.minHeight = "70vh";
    builder.style.backgroundColor = "#ffffff";
    builder.style.color = "#18181b";
    builder.style.colorScheme = "light";
    const onSave = (event: Event) => {
      const id = templateIdFrom(event);
      if (!id) {
        setNote("DocuSeal saved the document without a template id. Save again.");
        return;
      }
      if (recordedId.current === id) return;
      const previous = recordedId.current;
      recordedId.current = id;
      void recordSavedTemplate(templateId, id).then((result) => {
        if (result.error) {
          recordedId.current = previous;
          setNote(result.error);
          return;
        }
        setNote("Saved.");
      });
    };
    builder.addEventListener("save", onSave);
    host.replaceChildren(builder);
    return () => {
      builder.removeEventListener("save", onSave);
      builder.remove();
    };
  }, [templateId]);

  return (
    <div className="grid gap-2">
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <div ref={hostRef} className="overflow-hidden rounded-lg bg-white text-zinc-900" style={{ colorScheme: "light" }} />
    </div>
  );
}
