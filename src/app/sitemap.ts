import { getSiteUrl } from "@/lib/site";

export default function sitemap() {
  return [
    {
      url: getSiteUrl("/"),
      changefreq: "weekly",
      priority: 1,
    },
    {
      url: getSiteUrl("/auth"),
      changefreq: "yearly",
      priority: 0.1,
    },
    {
      url: getSiteUrl("/signup"),
      changefreq: "yearly",
      priority: 0.3,
    },
    {
      url: getSiteUrl("/pricing"),
      changefreq: "weekly",
      priority: 0.8,
    },
    {
      url: getSiteUrl("/about"),
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      url: getSiteUrl("/contact"),
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      url: getSiteUrl("/faq"),
      changefreq: "weekly",
      priority: 0.6,
    },
    {
      url: getSiteUrl("/blog"),
      changefreq: "weekly",
      priority: 0.6,
    },
    {
      url: getSiteUrl("/blog/plan-a-week-of-meals-in-10-minutes"),
      changefreq: "weekly",
      priority: 0.5,
    },
  ];
}
