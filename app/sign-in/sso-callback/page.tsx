import type { Metadata } from "next";
import { SsoCallback } from "@/components/auth/sso-callback";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SsoCallbackPage() {
  return (
    <AuthShell>
      <AuthHeader title="Finishing sign-in" subtitle="Google is sending you back to the desk." />
      <SsoCallback />
    </AuthShell>
  );
}
