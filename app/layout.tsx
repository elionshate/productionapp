import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ApiBridgeProvider from "../components/api-bridge-provider";
import AuthGate from "../components/auth-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Production Management",
  description: "Production, Orders, Inventory & Assembly Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApiBridgeProvider>
          <AuthGate>{children}</AuthGate>
        </ApiBridgeProvider>
      </body>
    </html>
  );
}
