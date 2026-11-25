"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function SsoCallback() {
  const router = useRouter();

  return (
    <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        const url = decorateUrl("/auth/continue");
        if (url.startsWith("http")) {
          window.location.assign(url);
          return;
        }
        router.push(url);
      }}
      navigateToSignIn={() => {
        router.push("/sign-in");
      }}
      navigateToSignUp={() => {
        router.push("/sign-up");
      }}
    />
  );
}
