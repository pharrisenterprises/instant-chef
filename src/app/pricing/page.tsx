import Script from "next/script";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Instantly Chef Subscription",
  description: "Meal planning, smart grocery lists, and delivery integrations.",
  brand: { "@type": "Brand", name: "Instantly Chef" },
  offers: [
    {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "0.00",
      category: "free trial",
      availability: "https://schema.org/InStock",
      url: getSiteUrl("/pricing"),
    },
    {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "19.00",
      category: "subscription",
      availability: "https://schema.org/InStock",
      url: getSiteUrl("/pricing"),
    },
  ],
};

export const metadata = {
  title: "Pricing | Instantly Chef",
  description: "Choose the Instantly Chef plan that fits your kitchen; start with a free trial, upgrade anytime.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-pricing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingStructuredData) }}
      />
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-gray-700 mb-10">Start free, upgrade when you are ready. Cancel anytime.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 border border-gray-200 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold mb-2">Free Trial</h2>
            <p className="text-3xl font-bold mb-4">$0</p>
            <ul className="space-y-2 text-gray-700">
              <li>14 days of full access</li>
              <li>Meal planning and grocery lists</li>
              <li>Delivery partner checkout</li>
              <li>Cancel anytime</li>
            </ul>
            <Link
              href="/auth?next=/post-auth"
              className="inline-flex mt-6 px-5 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Start free trial
            </Link>
          </div>

          <div className="p-6 border border-gray-200 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold mb-2">Pro</h2>
            <p className="text-3xl font-bold mb-4">$19<span className="text-lg font-medium text-gray-700">/mo</span></p>
            <ul className="space-y-2 text-gray-700">
              <li>All Free features</li>
              <li>Unlimited weekly menus</li>
              <li>Pantry tracking and waste reduction</li>
              <li>Priority support</li>
            </ul>
            <Link
              href="/auth?next=/post-auth"
              className="inline-flex mt-6 px-5 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
