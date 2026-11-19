"use client";

import { MoonStarIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="relative hover:bg-primary/10 hover:text-primary"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <MoonStarIcon className="scale-100 dark:scale-0" />
            <SunIcon className="absolute scale-0 dark:scale-100" />
          </Button>
        }
      />
      <TooltipContent side="right">Toggle theme</TooltipContent>
    </Tooltip>
  );
}
