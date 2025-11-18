import { Metadata } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About | Instantly Chef",
  description: "Learn about Instantly Chef and our mission to make home cooking faster, smarter, and more enjoyable.",
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl("/") },
    { "@type": "ListItem", position: 2, name: "About", item: getSiteUrl("/about") },
  ],
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-breadcrumb-about"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">About Instantly Chef</h1>
        <p className="text-lg text-gray-700 mb-8">
          We are building a smarter kitchen companion so you can cook great meals with less stress and less waste.
        </p>
        <div className="space-y-4 text-gray-800">
          <p>
            Instantly Chef combines meal planning, grocery delivery, and pantry intelligence to match how you really cook. Whether you are
            a busy parent or a weeknight cook, we help you get food on the table quickly without sacrificing taste.
          </p>
          <p>
            Our team believes cooking should be joyful and efficient. That is why we focus on realistic prep times, budget-smart ingredients, and tools that
            adapt to you over time.
          </p>
        </div>
      </section>
    </main>
  );
}
