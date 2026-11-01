import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "HydraHunt — Your Job-Search Workspace",
  description:
    "Apply to fewer jobs, better. AI-powered resumes, tailored application kits, mock interviews, and a job tracker in one workspace.",
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
