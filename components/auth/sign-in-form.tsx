"use client";

import { useSignIn } from "@clerk/nextjs";
import type { SignInFutureResource } from "@clerk/shared/types";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { firm } from "@/lib/firm";

type Step = "email" | "code";
type Factor = "first" | "trust";

function clerkText(error: { longMessage?: string; message?: string } | null | undefined) {
  return error?.longMessage ?? error?.message ?? null;
}

function stepFor(status: SignInFutureResource["status"]): Step | "done" {
  switch (status) {
    case "needs_identifier":
    case "needs_new_password":
    case "needs_protect_check":
      return "email";
    case "needs_first_factor":
    case "needs_second_factor":
    case "needs_client_trust":
      return "code";
    case "complete":
      return "done";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

async function finish(signIn: SignInFutureResource, router: ReturnType<typeof useRouter>) {
  await signIn.finalize({
    navigate: ({ decorateUrl }) => {
      const url = decorateUrl("/auth/continue");
      if (url.startsWith("http")) {
        window.location.assign(url);
        return;
      }
      router.push(url);
    },
  });
}

export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [factor, setFactor] = useState<Factor>("first");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  if (!signIn) {
    return null;
  }

  const fieldError =
    clerkText(errors?.fields?.identifier) ?? clerkText(errors?.fields?.code) ?? clerkText(errors?.global?.[0]) ?? notice;

  async function continueFrom(current: SignInFutureResource) {
    const next = stepFor(current.status);
    if (next === "done") {
      await finish(current, router);
      return;
    }
    if (current.status === "needs_client_trust" || current.status === "needs_second_factor") {
      const sent = await current.mfa.sendEmailCode();
      if (sent.error) {
        setNotice(clerkText(sent.error) ?? "We could not send the next code.");
        return;
      }
      setFactor("trust");
      setCode("");
      setStep("code");
      setNotice(null);
      return;
    }
    if (current.status === "needs_new_password") {
      setNotice("This email is not set up for a code. Ask the practice to send a new invitation.");
      setStep("email");
      return;
    }
    setStep(next);
    setNotice(null);
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const sent = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
    if (sent.error) {
      setNotice(clerkText(sent.error) ?? "We could not send a code to that email.");
      return;
    }
    setFactor("first");
    await continueFrom(signIn);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const verified =
      factor === "trust"
        ? await signIn.mfa.verifyEmailCode({ code: code.trim() })
        : await signIn.emailCode.verifyCode({ code: code.trim() });
    if (verified.error) {
      setNotice(clerkText(verified.error) ?? "That code did not match.");
      return;
    }
    await continueFrom(signIn);
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode}>
        <FieldGroup className="gap-4">
          <Field className="gap-2">
            <FieldLabel htmlFor="signInCode" className="leading-5">
              Sign-in code*
            </FieldLabel>
            <Input
              id="signInCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-8"
              placeholder="Enter the code from your email"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-invalid={Boolean(fieldError)}
              required
            />
            <p className="text-xs text-muted-foreground">Sent to {email}</p>
            {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
          </Field>
          <Field>
            <Button className="h-8 w-full" type="submit" disabled={busy}>
              Sign in to {firm.name}
            </Button>
          </Field>
          <Button
            type="button"
            variant="link"
            className="h-auto self-center p-0 text-sm"
            onClick={() => {
              signIn.reset();
              setStep("email");
              setCode("");
              setNotice(null);
              setFactor("first");
            }}
          >
            Use a different email
          </Button>
        </FieldGroup>
        <div id="clerk-captcha" />
      </form>
    );
  }

  return (
    <form onSubmit={sendCode}>
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="userEmail" className="leading-5">
            Email address*
          </FieldLabel>
          <Input
            type="email"
            id="userEmail"
            className="h-8"
            placeholder="Enter your email address"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldError)}
            required
          />
          {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
        </Field>
        <Field>
          <Button className="h-8 w-full" type="submit" disabled={busy}>
            Sign in to {firm.name}
          </Button>
        </Field>
      </FieldGroup>
      <div id="clerk-captcha" />
    </form>
  );
}
