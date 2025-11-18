import { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog | Instantly Chef",
  description: "Guides on meal planning, smarter grocery shopping, and faster weeknight cooking.",
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Blog", item: getSiteUrl("/blog") },
  ],
};

export default function BlogIndexPage() {
  const posts = [
    {
      title: "Plan a Week of Meals in 10 Minutes",
      description: "A simple process to build your weekly menu, shopping list, and delivery cart.",
      href: "/blog/plan-a-week-of-meals-in-10-minutes",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-breadcrumb-blog"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Instantly Chef Blog</h1>
        <p className="text-lg text-gray-700 mb-8">
          Practical guides to help you cook faster, spend less time shopping, and reduce food waste.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="block p-6 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
              <p className="text-gray-700">{post.description}</p>
              <span className="text-emerald-700 font-semibold mt-3 inline-block">Read more →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
