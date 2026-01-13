import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Poppins, Playfair_Display, DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { Analytics } from "@vercel/analytics/next";

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

const siteUrl = process.env.NEXTAUTH_URL || "https://asadofficial.org";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A5F",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Amar Somoy Amar Desh | ASAD - Building Communities Together",
    template: "%s | ASAD",
  },
  description:
    "Amar Somoy Amar Desh (ASAD) is a youth volunteer organization dedicated to community service, education, and social development in Bangladesh. Join us to make a difference.",
  keywords: [
    "ASAD",
    "Amar Somoy Amar Desh",
    "volunteer",
    "Bangladesh",
    "community service",
    "youth organization",
    "social development",
    "volunteer program",
    "Dhaka",
    "education",
    "charity",
    "NGO Bangladesh",
  ],
  authors: [{ name: "Amar Somoy Amar Desh" }],
  creator: "ASAD Team",
  publisher: "Amar Somoy Amar Desh",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Amar Somoy Amar Desh (ASAD)",
    title: "Amar Somoy Amar Desh | ASAD - Building Communities Together",
    description:
      "Join ASAD, Bangladesh's leading youth volunteer organization. Together, we create impact through community service, education, and social development.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Amar Somoy Amar Desh - Building Communities Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amar Somoy Amar Desh | ASAD",
    description:
      "Join ASAD, Bangladesh's leading youth volunteer organization. Together, we create impact through community service and social development.",
    images: ["/og-image.png"],
    creator: "@asadofficial",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add your verification codes here when available
    // google: "google-site-verification-code",
    // yandex: "yandex-verification-code",
  },
  category: "non-profit organization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={siteUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Amar Somoy Amar Desh",
              alternateName: "ASAD",
              url: siteUrl,
              logo: `${siteUrl}/logo.jpg`,
              description:
                "A youth volunteer organization dedicated to community service, education, and social development in Bangladesh.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Dhaka",
                addressCountry: "BD",
              },
              contactPoint: {
                "@type": "ContactPoint",
                email: "amarsomoyamardesh.it@gmail.com",
                contactType: "customer service",
              },
              sameAs: [
                "https://www.facebook.com/amarsomoyamardesh",
                "https://www.linkedin.com/company/amar-somoy-amar-desh",
                "https://www.instagram.com/amarsomoyamardesh/?hl=en",
                "https://www.youtube.com/@amarsomoyamardesh3268",
              ],
            }),
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} ${poppins.variable} ${playfair.variable} ${dmSans.variable} ${nunito.variable} bg-white text-ink antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
