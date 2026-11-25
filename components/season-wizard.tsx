import Link from "next/link";
import type { ReactNode } from "react";
import { LiniqoArt } from "@/components/liniqo-empty";
import { cn } from "@/lib/utils";

const onboardingSteps = [
  { id: "details", label: "Your details", art: "person-with-checklist", href: "/portal/profile" },
  { id: "scope", label: "What you file", art: "tax-form-stamp", href: "/portal/documents#filing" },
  { id: "documents", label: "Documents", art: "shared-folder-with-members", href: "/portal/documents" },
  { id: "letter", label: "Agreement", art: "contract-redlines", href: "/portal/engagement" },
] as const;

type StepId = (typeof onboardingSteps)[number]["id"];

function stepById(id: StepId) {
  switch (id) {
    case "details":
      return onboardingSteps[0];
    case "scope":
      return onboardingSteps[1];
    case "documents":
      return onboardingSteps[2];
    case "letter":
      return onboardingSteps[3];
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function OnboardingWizard({
  stepId,
  title,
  detail,
  action,
}: {
  stepId: StepId;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  const current = stepById(stepId);
  const stepIndex = onboardingSteps.findIndex((step) => step.id === stepId);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      <ol className="flex gap-1 overflow-x-auto border-b border-border px-3 py-3">
        {onboardingSteps.map((step, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "later";
          const chip = (
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1 text-xs whitespace-nowrap",
                state === "current" && "bg-secondary text-secondary-foreground",
                state !== "current" && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[10px] font-medium",
                  state === "current" && "bg-blue-600 text-white",
                  state === "done" && "bg-secondary text-secondary-foreground",
                  state === "later" && "border border-border",
                )}
              >
                {index + 1}
              </span>
              {step.label}
            </span>
          );
          return (
            <li key={step.id} aria-current={state === "current" ? "step" : undefined}>
              {state === "later" ? chip : <Link href={step.href}>{chip}</Link>}
            </li>
          );
        })}
      </ol>
      <div className="grid gap-2 p-6 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center md:gap-6">
        <LiniqoArt id={current.art} className="mx-auto size-40 md:size-44" />
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Step {stepIndex + 1} of {onboardingSteps.length} · {current.label}
          </p>
          <h1 className="font-serif text-3xl text-card-foreground">{title}</h1>
          <p className="max-w-xl text-muted-foreground">{detail}</p>
          {action}
        </div>
      </div>
    </section>
  );
}
