import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Syne, Inter } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "KonicaMinolta Identity — Piattaforma di Diagnostica Tecnica",
  description: "Piattaforma di diagnostica e ricerca tecnica per tecnici di servizio Konica Minolta. Developed by AISAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${inter.variable}`}>
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
