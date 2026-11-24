"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markPortalMessagesSeen } from "@/lib/actions";

export function MarkSeen() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void markPortalMessagesSeen().then((result) => {
      if (result.updated > 0) router.refresh();
    });
  }, [router]);

  return null;
}
