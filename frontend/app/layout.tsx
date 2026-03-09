import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "KM Insight — Intelligent Service Platform",
  description: "Advanced diagnostics and spare parts lookup for Konica Minolta systems. Developed by AISAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              padding: "10px 14px",
              boxShadow: "var(--shadow-md)",
            },
            success: {
              iconTheme: { primary: "#4ade80", secondary: "var(--bg-card)" },
            },
            error: {
              iconTheme: { primary: "#f87171", secondary: "var(--bg-card)" },
            },
          }}
        />
      </body>
    </html>
  );
}
