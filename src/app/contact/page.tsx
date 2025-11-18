import { Metadata } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact | Instantly Chef",
  description: "Get in touch with the Instantly Chef team for support, partnerships, or media inquiries.",
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Contact", item: getSiteUrl("/contact") },
  ],
};

const contactData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: getSiteUrl("/contact"),
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@instantlychef.com",
      availableLanguage: ["en"],
    },
  ],
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-breadcrumb-contact"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Script
        id="ld-json-contact"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactData) }}
      />
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg text-gray-700 mb-8">We would love to hear from you. Choose the best option below.</p>
        <div className="space-y-4 text-gray-800">
          <p>
            <strong>Support:</strong> support@instantlychef.com
          </p>
          <p>
            <strong>Partnerships:</strong> partnerships@instantlychef.com
          </p>
          <p>
            <strong>Media:</strong> press@instantlychef.com
          </p>
        </div>
      </section>
    </main>
  );
}
