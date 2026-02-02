import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Poppins, Playfair_Display, DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import ModalProvider from "@/components/ui/ModalProvider";
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

const siteUrl = process.env.NEXTAUTH_URL || "https://amarsomoyamardesh.org";

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
    // Primary brand keywords
    "ASAD",
    "Amar Somoy Amar Desh",
    "আমার সময় আমার দেশ",
    "ASAD Bangladesh",
    "ASAD volunteer",
    // Volunteer & Community keywords
    "volunteer Bangladesh",
    "volunteer organization Bangladesh",
    "community service Bangladesh",
    "youth volunteer program",
    "student volunteer organization",
    "social volunteer work",
    "volunteer opportunities Bangladesh",
    "volunteer registration",
    "become a volunteer",
    "join volunteer program",
    // Social development keywords
    "youth organization Bangladesh",
    "social development Bangladesh",
    "community development",
    "social welfare organization",
    "youth empowerment Bangladesh",
    "youth leadership program",
    "community building",
    "social impact organization",
    // Education & Charity keywords
    "education charity Bangladesh",
    "education support Bangladesh",
    "charity organization Bangladesh",
    "NGO Bangladesh",
    "nonprofit Bangladesh",
    "humanitarian organization",
    "free education initiative",
    "educational volunteer",
    // Location keywords
    "Dhaka volunteer",
    "Bangladesh NGO",
    "Dhaka community service",
    "volunteer Dhaka",
    "Bangladesh youth organization",
    // Activity keywords
    "blood donation Bangladesh",
    "tree plantation volunteer",
    "food distribution charity",
    "winter clothes distribution",
    "relief work Bangladesh",
    "disaster relief volunteer",
    "environmental volunteer",
    "health awareness campaign",
    // Bengali keywords for local SEO
    "স্বেচ্ছাসেবক সংগঠন",
    "বাংলাদেশ স্বেচ্ছাসেবী",
    "সমাজসেবা",
    "যুব সংগঠন",
    "শিক্ষা সহায়তা",
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
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
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
        <ModalProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ModalProvider>
        <Analytics />
      </body>
    </html>
  );
}
