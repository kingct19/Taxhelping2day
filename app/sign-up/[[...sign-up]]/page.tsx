import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Invitation",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <AuthHeader title="You're invited" subtitle="Use the email TaxHelping2Day sent with your invitation." />
      <div className="flex flex-col gap-4">
        <Suspense>
          <SignUp
            path="/sign-up"
            forceRedirectUrl="/auth/continue"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full gap-4 border-0 bg-transparent p-0 shadow-none",
                header: "hidden",
                footer: "hidden",
              },
            }}
          />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Already on file?{" "}
          <Link href="/sign-in" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
