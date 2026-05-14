import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI SDR - Sales Automation Platform",
  description: "AI-powered sales development representative tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ClerkProvider>
          <Providers defaultTheme="system" attribute="class">
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="min-w-0 overflow-hidden">
                <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                </header>
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
