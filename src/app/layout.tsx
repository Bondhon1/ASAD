import type { Metadata } from "next";
import { Inter, Space_Grotesk, Poppins, Playfair_Display, DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

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
      <body className={`${display.variable} ${body.variable} ${poppins.variable} ${playfair.variable} ${dmSans.variable} ${nunito.variable} bg-white text-ink antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
