import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Aptivo Portal",
  description: "Comprehensive Educational Platform",
};

import { LoadingProvider } from "@/lib/context/LoadingContext";
import { UIProvider } from "@/lib/context/UIContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-gray-50`}>
        <LoadingProvider>
          <UIProvider>
            {children}
          </UIProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
