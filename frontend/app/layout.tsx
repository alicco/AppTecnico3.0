import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "KM Insight - Intelligent Service Platform",
  description: "Advanced diagnostics and spare parts lookup for Konica Minolta systems. Developed by AISAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
