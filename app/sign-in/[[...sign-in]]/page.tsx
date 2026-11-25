import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { firm } from "@/lib/firm";
import { signInSubtitle } from "@/lib/sign-in-methods";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const methods = await getStore().getSignInMethods();

  return (
    <AuthShell>
      <AuthHeader title="Welcome back" subtitle={signInSubtitle(methods)} />
      <div className="flex flex-col gap-4">
        <SignInForm methods={methods} />
        <p className="text-center text-sm text-muted-foreground">
          Need an invitation?{" "}
          <Link href="/contact" className="text-foreground hover:underline">
            Contact {firm.name}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
