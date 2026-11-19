import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { firm } from "@/lib/firm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthHeader title="Welcome back" subtitle="Welcome back. We'll email a sign-in code to the address on file." />
      <div className="flex flex-col gap-4">
        <SignInForm />
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
