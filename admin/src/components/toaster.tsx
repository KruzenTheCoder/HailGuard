"use client";

import { Toaster as Sonner } from "sonner";

/** App-wide toast surface, themed to the HailGuard palette. */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: { borderRadius: "12px" },
        classNames: { toast: "shadow-lg" },
      }}
    />
  );
}
