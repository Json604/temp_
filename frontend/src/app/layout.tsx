import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Lemnisca — Fermentation Scale-Up Risk Predictor",
  description:
    "Structured engineering risk assessment for fermentation scale-up across oxygen transfer, mixing, shear, CO₂ accumulation, and heat removal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
