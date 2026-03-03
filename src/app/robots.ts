import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const raw = process.env.NEXTAUTH_URL || "https://asadofficial.org";
  const baseUrl = raw.startsWith("http") ? raw : `https://${raw}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/settings/",
          "/payments/",
          "/verify-email/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
