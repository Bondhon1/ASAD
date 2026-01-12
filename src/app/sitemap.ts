import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL || "https://asadofficial.org";
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/auth`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/verify-email`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/payments/initial`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  return staticPages;
}
