import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/firm";
import { areas, services } from "@/lib/site-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/services",
    "/service-areas",
    "/about",
    "/about/laura-wallace",
    "/security",
    "/contact",
    "/resources",
    "/resources/tax-center",
    "/faq",
    "/privacy",
    "/disclaimer",
    "/site-map",
    "/photo-credits",
    ...services.map((service) => `/services/${service.slug}`),
    ...areas.map((area) => `/service-areas/${area.slug}`),
  ];

  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
