import { FileClockIcon, FileSpreadsheetIcon, FolderOpenIcon, IdCardIcon, ReceiptIcon, type LucideIcon } from "lucide-react";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { UploadField } from "@/components/portal/upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { advanceRequest, uploadDocument } from "@/lib/actions";
import { requirementStatusLabel, requirementTone, type RequirementCardModel } from "@/lib/client-home";
import type { DocumentKind, DocumentRecord } from "@/lib/types";

function FilePreview({ file }: { file: DocumentRecord }) {
  const image = file.contentType.startsWith("image/");
  if (image) {
    return (
      <a href={`/files/documents/${file.id}?preview=1`} className="grid w-fit gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/files/documents/${file.id}?preview=1`} alt={file.filename} className="max-h-48 max-w-full rounded-lg border object-cover" />
        <span className="text-xs text-muted-foreground break-all">{file.filename}</span>
      </a>
    );
  }
  return (
    <a className="text-sm underline break-all" href={`/files/documents/${file.id}`}>
      {file.filename}
    </a>
  );
}

function documentIcon(kind: DocumentKind | null): LucideIcon {
  switch (kind) {
    case "w2":
      return ReceiptIcon;
    case "1099":
      return FileSpreadsheetIcon;
    case "prior_return":
      return FileClockIcon;
    case "photo_id":
      return IdCardIcon;
    case "other":
    case null:
      return FolderOpenIcon;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function RequirementCards({ cards, readOnly = false }: { cards: RequirementCardModel[]; readOnly?: boolean }) {
  if (cards.length === 0) {
    return (
      <LiniqoEmpty id={liniqo.folder.id} title="No documents yet">
        When the firm asks for a document, it will show up here.
      </LiniqoEmpty>
    );
  }
  return (
    <ul className="grid gap-2">
      {cards.map((card) => {
        const Icon = documentIcon(card.kind);
        return (
          <li key={card.id} className="relative grid gap-2 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
            {card.anchors.map((anchor) => (
              <span key={anchor} id={`request-${anchor}`} className="absolute" />
            ))}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{card.title}</p>
                  <span className="flex flex-wrap justify-end gap-1">
                    <Badge variant={card.required ? "attention" : "neutral"}>{card.required ? "Required" : "Optional"}</Badge>
                    <Badge variant={requirementTone(card.status)}>{requirementStatusLabel(card.status)}</Badge>
                  </span>
                </div>
                {card.detail ? <p className="text-sm text-muted-foreground">{card.detail}</p> : null}
              </div>
            </div>
            {card.correction ? <p className="text-sm">Correction requested: {card.correction}</p> : null}
            {card.status === "under_review" ? (
              <p className="text-sm text-muted-foreground">Uploaded. The firm still needs to review this. An upload is not an acceptance.</p>
            ) : null}
            {card.files.length > 0 ? (
              <ul className="grid gap-2">
                {card.files.map((file) => (
                  <li key={file.id}>
                    <FilePreview file={file} />
                  </li>
                ))}
              </ul>
            ) : null}
            {card.respond && !readOnly ? (
              <div className="grid gap-3">
                <UploadField
                  action={advanceRequest.bind(null, card.respond.profileId, card.respond.latestId)}
                  label={card.files.length > 0 ? "Replace file" : "Upload"}
                  fields={{ kind: card.kind ?? "other" }}
                />
                {card.allowUnavailable ? (
                  <form action={advanceRequest.bind(null, card.respond.profileId, card.respond.latestId)} className="grid gap-2">
                    <Input name="reason" required maxLength={1000} aria-label="Why you cannot send it" placeholder="Not issued, or when you can send it" />
                    <Button className="w-fit" size="sm" variant="outline" name="decision" value="unavailable">
                      I don&apos;t have this
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
            {card.upload && !readOnly ? (
              <UploadField
                action={uploadDocument}
                label={card.files.length > 0 ? "Add another file" : "Upload"}
                fields={{ kind: card.upload.kind, title: card.upload.title, returnId: card.upload.returnId }}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
