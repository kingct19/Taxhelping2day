import type { ReactNode } from "react";
import { AuthShowcase } from "@/components/auth/auth-showcase";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="site min-h-dvh bg-background text-foreground lg:grid lg:h-dvh lg:grid-cols-2">
      <div className="flex min-h-dvh items-start justify-center overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-6 md:px-8 lg:h-full lg:items-center">
        <div className="flex w-full flex-col gap-6 p-6 sm:max-w-lg">{children}</div>
      </div>
      <AuthShowcase />
    </div>
  );
}
