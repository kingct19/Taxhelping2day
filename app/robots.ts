import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/firm";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/inbox", "/tasks", "/contacts", "/library", "/dashboard", "/reports", "/assistant", "/settings", "/portal", "/files", "/auth", "/sign-in", "/sign-up"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
