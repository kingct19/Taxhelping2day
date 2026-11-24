"use client"

import { useFormStatus } from "react-dom"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { buttonVariants } from "@/components/ui/button-variants"
import { Spinner } from "@/components/ui/spinner"

function Button({
  className,
  variant = "default",
  size = "default",
  type,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const { pending } = useFormStatus()
  const busy = pending && type !== "button" && type !== "reset"

  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {busy ? <Spinner data-icon="inline-start" /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
