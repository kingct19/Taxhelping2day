"use client";

import Link from "next/link";
import { EllipsisVerticalIcon, EyeIcon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ContactRowActions({ id, email }: { id: string; email: string }) {
  const contactHref = `/contacts/${id}`;
  const fileHref = `/inbox?id=${id}`;
  const returnsHref = `/returns?q=${encodeURIComponent(email)}`;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="View contact" nativeButton={false} render={<Link href={contactHref} />} />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Open conversation" nativeButton={false} render={<Link href={fileHref} />} />
            }
          >
            <InboxIcon />
          </TooltipTrigger>
          <TooltipContent>Open conversation</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem nativeButton={false} render={<Link href={contactHref} />}>
                View contact
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href={fileHref} />}>
                Open conversation
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href={returnsHref} />}>
                Open returns
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
