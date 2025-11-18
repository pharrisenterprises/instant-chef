import { Metadata } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ | Instantly Chef",
  description: "Answers to common questions about Instantly Chef, meal planning, and deliveries.",
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl("/") },
    { "@type": "ListItem", position: 2, name: "FAQ", item: getSiteUrl("/faq") },
  ],
};

const faqData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does Instantly Chef work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We learn your preferences, build a weekly menu and grocery list, and connect you to delivery partners so you can cook faster with less waste.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get groceries delivered?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We map ingredients to delivery partners so you can check out in one click.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a free trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start with a 14-day free trial and upgrade anytime.',
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-breadcrumb-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Script
        id="ld-json-faq-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6">Frequently Asked Questions</h1>
        <div className="space-y-6 text-gray-800">
          <div>
            <h2 className="text-xl font-semibold mb-2">How does Instantly Chef work?</h2>
            <p>We learn your preferences, build a weekly menu and grocery list, and connect you to delivery partners so you can cook faster with less waste.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Can I get groceries delivered?</h2>
            <p>Yes. We map ingredients to delivery partners so you can check out in one click.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Is there a free trial?</h2>
            <p>Start with a 14-day free trial and upgrade anytime.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
