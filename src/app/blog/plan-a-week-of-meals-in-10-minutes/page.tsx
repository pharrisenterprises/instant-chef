import { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Plan a Week of Meals in 10 Minutes | Instantly Chef",
  description: "A simple 4-step process to plan your weekly menu, build a grocery list, and send it to delivery.",
};

const articleData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Plan a Week of Meals in 10 Minutes",
  description: "A simple 4-step process to plan your weekly menu, build a grocery list, and send it to delivery.",
  author: { "@type": "Organization", name: "Instantly Chef" },
  publisher: { "@type": "Organization", name: "Instantly Chef", logo: { "@type": "ImageObject", url: getSiteUrl("/logo.png") } },
  datePublished: "2025-11-15",
  dateModified: "2025-11-15",
  mainEntityOfPage: getSiteUrl("/blog/plan-a-week-of-meals-in-10-minutes"),
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Blog", item: getSiteUrl("/blog") },
    { "@type": "ListItem", position: 3, name: "Plan a Week of Meals in 10 Minutes", item: getSiteUrl("/blog/plan-a-week-of-meals-in-10-minutes") },
  ],
};

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-article-plan-week"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleData) }}
      />
      <Script
        id="ld-json-breadcrumb-plan-week"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      <article className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:underline">Home</Link> /{" "}
          <Link href="/blog" className="hover:underline">Blog</Link>
        </p>
        <h1 className="text-4xl font-bold mb-4">Plan a Week of Meals in 10 Minutes</h1>
        <p className="text-lg text-gray-700 mb-6">
          A fast, repeatable process to plan your weekly menu, build a grocery list, and send it to delivery partners.
        </p>

        <ol className="list-decimal list-inside space-y-4 text-gray-800">
          <li><strong>Set your constraints:</strong> time per night, servings, dietary filters, and budget.</li>
          <li><strong>Pick anchor meals:</strong> choose 2–3 mains you’re excited about; let the planner fill the gaps.</li>
          <li><strong>Review and swap:</strong> adjust meals and sides, then lock the week.</li>
          <li><strong>Send to delivery:</strong> export the matched grocery list to your delivery partner and save your pantry state.</li>
        </ol>

        <p className="mt-6 text-gray-800">
          Instantly Chef automates the heavy lifting—menus adapt to your taste, carts map to delivery partners, and pantry tracking reduces waste.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth?next=/post-auth"
            className="bg-emerald-600 text-white px-5 py-3 rounded-full font-semibold hover:bg-emerald-700"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="bg-emerald-50 text-emerald-700 px-5 py-3 rounded-full font-semibold hover:bg-emerald-100"
          >
            View pricing
          </Link>
        </div>
      </article>
    </main>
  );
}
