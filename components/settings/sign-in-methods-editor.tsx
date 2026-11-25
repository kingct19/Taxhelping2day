"use client";

import { useState, useTransition } from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveSignInMethodsAction } from "@/lib/sign-in-actions";
import { signInMethodCopy, signInMethodIds, signInMethodsError, type SignInMethod, type SignInMethods } from "@/lib/sign-in-methods";

export function SignInMethodsEditor({ methods: initial }: { methods: SignInMethods }) {
  const [methods, setMethods] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = signInMethodIds.some((id) => methods[id] !== baseline[id]);
  const problem = signInMethodsError(methods);

  function patch(id: SignInMethod, checked: boolean) {
    setNotice(null);
    setError(null);
    setMethods((current) => ({ ...current, [id]: checked }));
  }

  function save() {
    if (problem) {
      setError(problem);
      setNotice(null);
      return;
    }
    startTransition(async () => {
      const result = await saveSignInMethodsAction(methods);
      setError(result.error);
      if (result.error) {
        setNotice(null);
        return;
      }
      setBaseline(methods);
      setNotice("Saved. Sign-in and invitations use these methods.");
    });
  }

  return (
    <SettingsSection
      title="Sign-in"
      description="Choose how people sign in after they are invited. Magic link and Google also have to be turned on in the Clerk dashboard. Saving here does not change that."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          {error ? <p role="alert" className="mr-auto text-sm text-destructive">{error}</p> : null}
          {!error && notice ? <p className="mr-auto text-sm text-muted-foreground">{notice}</p> : null}
          <Button type="button" onClick={save} disabled={pending || !dirty || Boolean(problem)}>
            {pending ? "Saving" : "Save sign-in"}
          </Button>
        </div>
      }
    >
      <ul className="flex flex-col gap-3">
        {signInMethodIds.map((id) => {
          const copy = signInMethodCopy(id);
          return (
            <li key={id} className="flex items-start gap-3">
              <Checkbox
                id={`sign-in-${id}`}
                checked={methods[id]}
                onCheckedChange={(checked) => patch(id, checked === true)}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`sign-in-${id}`}>{copy.label}</Label>
                <p className="text-xs text-muted-foreground">{copy.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {problem ? <p className="text-xs text-muted-foreground">{problem}</p> : null}
    </SettingsSection>
  );
}
