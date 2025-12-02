import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Amar Somoy Amar Desh",
  description:
    "Official platform for Amar Somoy Amar Desh (ASAD) volunteers, projects, and public engagement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} bg-white text-ink antialiased`}>
        <Header />
        <div className="pt-24 lg:pt-28">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
