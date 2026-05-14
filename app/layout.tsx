import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/components/providers";

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
    <head/>
    <body className={inter.className}>
    <ClerkProvider>
      <Providers
          defaultTheme="system"
          attribute="class"
      >

            <div className="flex h-screen overflow-hidden ">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>

      </Providers>
    </ClerkProvider>
    </body>
    </html>
  );
}
