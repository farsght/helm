"use client";


import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";


import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children, ...props }: ThemeProviderProps) {
  

  return (

      <NextThemesProvider {...props}>
        <TooltipProvider delayDuration={120}>
          {children}
        </TooltipProvider>
      </NextThemesProvider>

  );
}