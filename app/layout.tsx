import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import PwaRegistration from "@/components/providers/PwaRegistration";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  weight: ["400", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Pristine POS",
  description: "Supermarket & Dairy Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className={`${inter.variable} ${beVietnam.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <PwaRegistration />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
