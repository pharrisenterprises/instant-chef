// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL, getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Instantly Chef | Meal Planning & Grocery Delivery Assistant",
    template: "%s | Instantly Chef",
  },
  description:
    "Instantly Chef plans your weekly meals, builds grocery lists, and integrates with delivery so you can cook smarter, faster, and tastier.",
  keywords: [
    "meal planning",
    "grocery delivery",
    "recipe planner",
    "weekly meal prep",
    "shopping list",
    "family meals",
    "food delivery",
  ],
  applicationName: "Instantly Chef",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: getSiteUrl("/"),
    title: "Instantly Chef | Meal Planning & Grocery Delivery Assistant",
    description:
      "Plan menus, get groceries delivered, and cook effortlessly with Instantly Chef.",
    siteName: "Instantly Chef",
    images: [
      {
        url: getSiteUrl("/hero.jpg"),
        width: 1200,
        height: 630,
        alt: "Instantly Chef meal planning and grocery delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@InstantlyChef",
    creator: "@InstantlyChef",
    title: "Instantly Chef | Meal Planning & Grocery Delivery Assistant",
    description:
      "Meal plans, grocery delivery, and a smarter kitchen companion all in one.",
    images: [getSiteUrl("/hero.jpg")],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "Food & Drink",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
