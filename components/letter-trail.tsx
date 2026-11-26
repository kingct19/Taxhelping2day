import type { LetterPhase } from "@/lib/engagement";
import { shortDateTime } from "@/lib/return-progress";
import type { PacketSigner } from "@/lib/smartdoc-prefill";
import { cn } from "@/lib/utils";

export function signingPhase(status: string, signer: PacketSigner | undefined): Exclude<LetterPhase, "unsigned"> {
  if (status === "completed" || signer?.status === "completed" || signer?.completedAt) return "signed";
  if (status === "declined" || signer?.status === "declined") return "declined";
  if (signer?.status === "opened" || signer?.openedAt) return "opened";
  return "sent";
}

function phaseLabel(phase: Exclude<LetterPhase, "unsigned">): string {
  switch (phase) {
    case "sent":
      return "Sent";
    case "opened":
      return "Opened";
    case "signed":
      return "Signed";
    case "declined":
      return "Declined";
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

export function letterPhaseLabel(phase: Exclude<LetterPhase, "unsigned">): string {
  return phaseLabel(phase);
}

export function LetterTrail({
  phase,
  sentAt,
  openedAt,
  signedAt,
}: {
  phase: Exclude<LetterPhase, "unsigned">;
  sentAt: string | null;
  openedAt: string | null;
  signedAt: string | null;
}) {
  const opened = phase === "opened" || phase === "signed" || (phase === "declined" && Boolean(openedAt));
  const steps = [
    { label: "Sent", at: sentAt, done: true },
    { label: "Opened", at: openedAt, done: opened },
    { label: "Signed", at: signedAt, done: phase === "signed" },
  ];

  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step) => (
        <li key={step.label} className="grid gap-0.5">
          <span className={cn("text-sm font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>
            {step.done ? "✓" : "·"} {step.label}
          </span>
          <span className="text-xs text-muted-foreground">{step.at ? shortDateTime(step.at) : "Not yet"}</span>
        </li>
      ))}
      {phase === "declined" ? <li className="text-sm text-destructive sm:col-span-3">The client declined this copy.</li> : null}
    </ol>
  );
}
