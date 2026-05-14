"use client";


import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";


import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NuqsAdapter>
      <NextThemesProvider {...props}>
        <TooltipProvider delayDuration={120}>
          {children}
        </TooltipProvider>
      </NextThemesProvider>
    </NuqsAdapter>
  );
}
