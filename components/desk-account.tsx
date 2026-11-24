"use client";

import { UserButton } from "@clerk/nextjs";

export function DeskAccount({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <span className="relative inline-flex size-8 items-center justify-center">
      <UserButton
        appearance={
          avatarUrl
            ? {
                elements: {
                  userButtonAvatarBox: "size-8 opacity-0",
                  userButtonTrigger: "size-8 rounded-full",
                },
              }
            : undefined
        }
      />
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="pointer-events-none absolute size-8 rounded-full object-cover" />
      ) : null}
    </span>
  );
}
