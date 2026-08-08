import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "HydraHunt — AI-Powered Career Warfare Platform",
  description:
    "Job hunting is dead. We killed it. AI-powered resumes, tailored payloads, interview drills, and job tracking from a single command center.",
  keywords: [
    "HydraHunt",
    "AI resume",
    "career",
    "job hunting",
    "ATS optimization",
    "interview prep",
    "cover letter AI",
  ],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-hydra-dark text-foreground scanlines">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
