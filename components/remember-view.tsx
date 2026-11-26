"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function rememberView(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=15552000; SameSite=Lax`;
}

export function RememberLink({ view, value, onClick, ...props }: { view: string; value: string } & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        rememberView(view, value);
        onClick?.(event);
      }}
    />
  );
}

export function RememberForm({
  view,
  keys,
  onSubmit,
  children,
  ...props
}: { view: string; keys: string[]; children: ReactNode } & Omit<ComponentProps<"form">, "children">) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const value: Record<string, string> = {};
        for (const key of keys) value[key] = String(data.get(key) ?? "");
        rememberView(view, JSON.stringify(value));
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
