import type { ReactNode } from "react";

export function SettingsFrame({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="h-14 border-b">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
