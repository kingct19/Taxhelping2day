"use client"

import { Toaster as DingToaster } from "@yusufceng1z/ding-react"
import { useTheme } from "next-themes"

export function Toaster() {
  const { resolvedTheme } = useTheme()

  return <DingToaster position="bottom-right" theme={resolvedTheme === "dark" ? "dark" : "light"} />
}
