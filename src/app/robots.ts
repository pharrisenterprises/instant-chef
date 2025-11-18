import { getSiteUrl, SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/auth", "/account", "/dashboard", "/setup", "/post-auth", "/subscriptions"],
      },
    ],
    sitemap: getSiteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
