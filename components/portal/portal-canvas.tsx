"use client";

import { usePathname } from "next/navigation";

export function PortalCanvas({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/portal" || pathname === "/portal/messages") {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>;
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-6 md:pb-6">
        {children}
      </div>
    </div>
  );
}
