"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease } from "@/lib/motion";

export function ReturnPanelFade({ panel, children }: { panel: string; children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={panel}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.24, ease: ease.out }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
