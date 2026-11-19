import type { ReactNode } from "react";
import { SettingsFrame } from "@/components/settings/settings-frame";

export function DeskGap({
  title,
  description,
  detail,
  children,
}: {
  title: string;
  description: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <SettingsFrame title={title} description={description}>
      {children ?? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="text-sm font-medium">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
        </div>
      )}
    </SettingsFrame>
  );
}
