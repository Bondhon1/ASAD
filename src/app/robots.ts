import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://asadofficial.org";

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
