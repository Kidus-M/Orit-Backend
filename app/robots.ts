import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/download", "/contact"],
      disallow: ["/api/", "/pickup/", "/admin/"],
    },
    sitemap: "https://orit-backend.vercel.app/sitemap.xml",
  };
}
