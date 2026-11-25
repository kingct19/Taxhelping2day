"use client";

import { useSignIn } from "@clerk/nextjs";
import type { SignInFutureResource } from "@clerk/shared/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { firm } from "@/lib/firm";
import type { SignInMethods } from "@/lib/sign-in-methods";

type Step = "email" | "code" | "link";
type Factor = "first" | "trust";
type EmailChoice = "email_code" | "email_link";

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

function linkProblem(status: "expired" | "failed" | "client_mismatch"): string {
  switch (status) {
    case "expired":
      return "That link expired. Request a new one.";
    case "failed":
      return "That link did not work. Request a new one.";
    case "client_mismatch":
      return "Open the link on the device where you requested it.";
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

export function SignInForm({ methods }: { methods: SignInMethods }) {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [factor, setFactor] = useState<Factor>("first");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const verified = useRef(false);
  const busy = fetchStatus === "fetching";
  const hasEmail = methods.email_code || methods.email_link;
  const returnedLink = signIn?.emailLink.verification ?? null;
  const returnedLinkNotice = returnedLink && returnedLink.status !== "verified" ? linkProblem(returnedLink.status) : null;

  useEffect(() => {
    if (!signIn || verified.current) return;
    if (returnedLink?.status !== "verified") return;
    verified.current = true;
    void finish(signIn, router);
  }, [returnedLink, signIn, router]);

  useEffect(() => {
    if (!signIn || step !== "link") return;
    let cancelled = false;
    void signIn.emailLink.waitForVerification().then(async (waited) => {
      if (cancelled || verified.current) return;
      if (waited.error) {
        setNotice(clerkText(waited.error) ?? "That link did not work. Request a new one.");
        return;
      }
      verified.current = true;
      await finish(signIn, router);
    });
    return () => {
      cancelled = true;
    };
  }, [signIn, router, step]);

  if (!signIn) {
    return null;
  }

  const fieldError =
    clerkText(errors?.fields?.identifier) ?? clerkText(errors?.fields?.code) ?? clerkText(errors?.global?.[0]) ?? notice ?? returnedLinkNotice;

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

  function reset() {
    signIn.reset();
    verified.current = false;
    setStep("email");
    setCode("");
    setNotice(null);
    setFactor("first");
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const value = submitter instanceof HTMLButtonElement ? submitter.value : "";
    const choice: EmailChoice = value === "email_link" || (!methods.email_code && methods.email_link) ? "email_link" : "email_code";
    if (choice === "email_link") {
      const sent = await signIn.emailLink.sendLink({
        emailAddress: email.trim(),
        verificationUrl: `${window.location.origin}/sign-in`,
      });
      if (sent.error) {
        setNotice(clerkText(sent.error) ?? "We could not send a link to that email. Turn magic link on in the Clerk dashboard, then try again.");
        return;
      }
      setStep("link");
      setNotice(null);
      return;
    }
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
    const verifiedCode =
      factor === "trust"
        ? await signIn.mfa.verifyEmailCode({ code: code.trim() })
        : await signIn.emailCode.verifyCode({ code: code.trim() });
    if (verifiedCode.error) {
      setNotice(clerkText(verifiedCode.error) ?? "That code did not match.");
      return;
    }
    await continueFrom(signIn);
  }

  async function continueWithGoogle() {
    setNotice(null);
    const started = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/auth/continue",
      redirectCallbackUrl: "/sign-in/sso-callback",
    });
    if (started.error) {
      setNotice(clerkText(started.error) ?? "Google sign-in did not start. Turn it on in the Clerk dashboard, then try again.");
    }
  }

  const googleButton = methods.google && step === "email" ? (
    <Button className="h-8 w-full" type="button" variant={hasEmail ? "outline" : "default"} disabled={busy} onClick={() => void continueWithGoogle()}>
      Continue with Google
    </Button>
  ) : null;

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
          <Button type="button" variant="link" className="h-auto self-center p-0 text-sm" onClick={reset}>
            Use a different email
          </Button>
        </FieldGroup>
        <div id="clerk-captcha" />
      </form>
    );
  }

  if (step === "link") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">We sent a link to {email}. Open it to finish signing in.</p>
        {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
        <Button type="button" variant="link" className="h-auto self-center p-0 text-sm" onClick={reset}>
          Use a different email
        </Button>
        <div id="clerk-captcha" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasEmail ? (
        <form onSubmit={sendEmail}>
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
            {methods.email_code ? (
              <Field>
                <Button className="h-8 w-full" type="submit" value="email_code" disabled={busy}>
                  {methods.email_link ? "Email me a code" : `Sign in to ${firm.name}`}
                </Button>
              </Field>
            ) : null}
            {methods.email_link ? (
              <Field>
                <Button className="h-8 w-full" type="submit" value="email_link" variant={methods.email_code ? "outline" : "default"} disabled={busy}>
                  {methods.email_code ? "Email me a link" : `Sign in to ${firm.name}`}
                </Button>
              </Field>
            ) : null}
          </FieldGroup>
        </form>
      ) : null}
      {hasEmail && googleButton ? <p className="text-center text-xs text-muted-foreground">or</p> : null}
      {googleButton}
      {!hasEmail && fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
      <div id="clerk-captcha" />
    </div>
  );
}
