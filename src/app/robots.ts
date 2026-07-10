import type { MetadataRoute } from "next";

// Public marketing pages are indexable; the authenticated app is not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/integrations",
        "/metrics",
        "/activity",
        "/sources",
        "/login",
        "/api/",
      ],
    },
  };
}
