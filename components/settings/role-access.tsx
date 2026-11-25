"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const roles = [
  { id: "staff", label: "Staff" },
  { id: "client", label: "Client" },
] as const;

type RoleId = (typeof roles)[number]["id"];

const permissions: { id: string; label: string; detail: string; staff: boolean; client: boolean }[] = [
  { id: "desk", label: "Desk", detail: "Dashboard, inbox, contacts, returns, tasks, library, and assistant.", staff: true, client: false },
  { id: "settings", label: "Practice settings", detail: "Workspace, teammates, hours, filings, and the rest of settings.", staff: true, client: false },
  { id: "invite", label: "Invite a client or a teammate", detail: "Someone is added only when the practice sends an invitation.", staff: true, client: false },
  { id: "portal", label: "Client portal", detail: "A client opens their own portal. Staff stay on the desk.", staff: false, client: true },
  { id: "all-files", label: "Every client file", detail: "Documents and signature packets for every client.", staff: true, client: false },
  { id: "own-files", label: "Their own documents and signatures", detail: "The files on that person's own record.", staff: false, client: true },
  { id: "all-messages", label: "Every conversation", detail: "Messages on every client file.", staff: true, client: false },
  { id: "own-messages", label: "Their own conversation", detail: "Messages on that person's own file.", staff: false, client: true },
  { id: "tax-id-desk", label: "Last four of a taxpayer ID", detail: "The desk shows the last four digits. The full number is not shown there.", staff: true, client: false },
  { id: "tax-id-own", label: "Their own taxpayer ID", detail: "A client can enter their own number on the profile form.", staff: false, client: true },
];

export function RoleAccess() {
  const [role, setRole] = useState<RoleId>("staff");

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Role</h2>
            <div role="radiogroup" aria-label="Role" className="flex flex-col gap-3">
              {roles.map((item) => {
                const selected = role === item.id;
                return (
                  <label key={item.id} className="flex w-fit cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="access-role"
                      value={item.id}
                      checked={selected}
                      onChange={() => setRole(item.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border",
                        selected ? "border-primary" : "border-input",
                      )}
                    >
                      {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                    </span>
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Permissions</h2>
            <ul className="flex flex-col gap-3">
              {permissions.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={item[role]}
                    onCheckedChange={() => undefined}
                    aria-readonly="true"
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="text-sm">{item.label}</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground" aria-label={item.detail} />
                      }
                    >
                      <InfoIcon className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>{item.detail}</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">These follow the desk and the portal as they work today.</p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
