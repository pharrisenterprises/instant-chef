'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Image from 'next/image';
import Link from 'next/link';
import { getSiteUrl } from '@/lib/site';

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowModal(true), 30000); // 30s
    return () => clearTimeout(timer);
  }, []);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Instantly Chef',
    url: getSiteUrl('/'),
    logo: getSiteUrl('/logo.png'),
    sameAs: [],
    description:
      'Instantly Chef plans weekly menus, builds grocery lists, and connects to delivery partners so you can cook faster.',
  };

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Instantly Chef',
    url: getSiteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getSiteUrl('/')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does Instantly Chef work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We tailor menus to your taste and schedule, generate a smart grocery list, and connect to delivery partners so you can cook faster.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I get groceries delivered?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Instantly Chef integrates with delivery partners so you can order ingredients directly from your plan.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can start with a 14-day free trial to test the full experience before subscribing.',
        },
      },
    ],
  };

  const howToStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Plan your weekly meals with Instantly Chef',
    description: 'Use Instantly Chef to create a weekly menu, generate a smart grocery list, and connect to delivery.',
    totalTime: 'PT10M',
    supply: [
      { '@type': 'HowToSupply', name: 'Instantly Chef account' },
      { '@type': 'HowToSupply', name: 'Groceries (delivered or on hand)' },
    ],
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Set preferences', text: 'Tell us dietary needs, time, budget, and skill level.' },
      { '@type': 'HowToStep', position: 2, name: 'Review weekly menu', text: 'Approve or swap recipes tailored to your taste and schedule.' },
      { '@type': 'HowToStep', position: 3, name: 'Send to delivery', text: 'Export the smart grocery list to delivery partners with mapped SKUs.' },
      { '@type': 'HowToStep', position: 4, name: 'Cook faster', text: 'Follow simplified steps with pantry tracking to reduce waste.' },
    ],
    tool: [{ '@type': 'HowToTool', name: 'Instantly Chef app' }],
  };

  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Instantly Chef Meal Planning & Grocery Delivery Assistant',
    description: 'Weekly meal plans, smart grocery lists, and delivery integrations.',
    brand: { '@type': 'Brand', name: 'Instantly Chef' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: '0.00',
      availability: 'https://schema.org/InStock',
      url: getSiteUrl('/pricing'),
      priceValidUntil: '2026-12-31',
    },
  };

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: getSiteUrl('/') },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Script
        id="ld-json-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="ld-json-site"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <Script
        id="ld-json-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <Script
        id="ld-json-howto"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToStructuredData) }}
      />
      <Script
        id="ld-json-product"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <Script
        id="ld-json-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white shadow-md flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Instantly Chef Logo"
              width={40}
              height={40}
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <Link href="/" className="text-2xl font-bold hover:underline">
              Instantly Chef
            </Link>
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="#how-it-works" className="hover:underline">
              How It Works
            </a>
            <a href="#menu-library" className="hover:underline">
              Menu
            </a>
            <a href="#partnerships" className="hover:underline">
              Partners
            </a>
            <a href="#advantage" className="hover:underline">
              Why Us
            </a>

            <Link href="/pricing" className="hover:underline">
              Pricing
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>
            <Link href="/faq" className="hover:underline">
              FAQ
            </Link>
            <Link
              href="/auth"
              className="ml-2 inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-screen flex items-center justify-center text-white overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/hero.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          >
          <source src="/hero.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 text-center max-w-3xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Instantly Shop. Instantly Chef.
          </h1>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/auth?next=/post-auth"
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-full text-white font-semibold"
            >
              Shop Now
            </Link>
            <Link
              href="/auth?next=/post-auth"
              className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-full font-semibold"
            >
              Start 14-Day Free Trial
            </Link>
            <Link
              href="/pricing"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-6 py-3 rounded-full font-semibold"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gray-100 text-center">
        <h3 className="text-3xl font-semibold mb-6">How It Works</h3>
        <p className="max-w-2xl mx-auto text-lg">
          We plan your meals. You get groceries delivered. Eat better, instantly.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto text-left">
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Learn your taste</h4>
            <p className="text-gray-700">Tell us your goals, dietary needs, time, and budget. We adapt menus automatically.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Plan & shop</h4>
            <p className="text-gray-700">We build a weekly menu and smart grocery list. Check out with delivery partners in a click.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Cook faster</h4>
            <p className="text-gray-700">Follow simple steps, reduce waste, and keep a running pantry so you always know what you have.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 text-center bg-white">
        <h3 className="text-3xl font-semibold mb-6">Built to Help You Cook Every Night</h3>
        <p className="max-w-3xl mx-auto text-lg text-gray-700 mb-10">
          Time-saving planning, smarter shopping, and guidance tailored to how you really cook.
        </p>
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto text-left">
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">Adaptive menus</h4>
            <p className="text-gray-700">Menus adjust to your time, skill level, and household size for realistic weeknight cooking.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">Smart pantry</h4>
            <p className="text-gray-700">Track what you already have to reduce waste and avoid duplicate purchases.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">One-click delivery</h4>
            <p className="text-gray-700">Send your list to delivery partners with pre-matched SKUs so you get exactly what the recipe needs.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">Nutrition-aware</h4>
            <p className="text-gray-700">Balance macros and calories to match your health goals while keeping meals enjoyable.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">Family friendly</h4>
            <p className="text-gray-700">Kid-friendly swaps and scaling for households so everyone eats together.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xl font-semibold mb-2">Budget smart</h4>
            <p className="text-gray-700">Common ingredients, seasonal picks, and optimized carts to stretch your budget.</p>
          </div>
        </div>
      </section>

      {/* Menu Library */}
      <section id="menu-library" className="py-16 text-center">
        <h3 className="text-3xl font-semibold mb-6">Menu Library</h3>
        <p className="max-w-2xl mx-auto text-lg">
          Curated recipes and menus are on the way. Check back soon!
        </p>
        <div className="max-w-4xl mx-auto mt-8 grid gap-6 md:grid-cols-2 text-left">
          <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">40+ fast weeknight options</h4>
            <p className="text-gray-700">Meals under 30 minutes with pantry-friendly ingredients.</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Family-friendly picks</h4>
            <p className="text-gray-700">Kid-approved flavor profiles and easy scaling for households.</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Budget-smart bundles</h4>
            <p className="text-gray-700">Reuse ingredients across the week to save money and reduce waste.</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
            <h4 className="text-xl font-semibold mb-2">Diet-aware filters</h4>
            <p className="text-gray-700">Vegetarian, high-protein, gluten-aware options tailored to you.</p>
          </div>
        </div>
      </section>

      {/* Delivery Partnerships */}
      <section id="partnerships" className="py-16 bg-gray-50 text-center">
        <h3 className="text-3xl font-semibold mb-8">Delivery Partnerships</h3>
        <div className="flex flex-wrap justify-center items-center gap-6 px-6">
          {['instacart'].map((logo) => (
            <div
              key={logo}
              className="w-28 h-12 relative grayscale opacity-80 hover:opacity-100 transition"
            >
              <Image
                src={`/${logo}.png`}
                alt={`${logo} grocery delivery partner logo`}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-gray-700 max-w-2xl mx-auto">
          Seamless integrations with delivery partners ensure your cart matches your plan—no ingredient mismatches.
        </p>
      </section>

      {/* Competitive Advantage */}
      <section id="advantage" className="py-16 text-center bg-white">
        <h3 className="text-3xl font-semibold mb-6">Why Instantly Chef?</h3>
        <ul className="max-w-2xl mx-auto text-left text-lg space-y-4">
          <li>Personalized meal planning that adapts to your taste.</li>
          <li>Built-in grocery delivery integration for zero errands.</li>
          <li>Menus tailored to your time, skill level, and budget.</li>
          <li>Designed for real households and nightly cooking.</li>
          <li>Smarter than traditional meal kits with less waste.</li>
        </ul>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 bg-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-3xl font-semibold mb-8 text-center">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-xl font-semibold mb-2">How does Instantly Chef work?</h4>
              <p className="text-gray-700">
                We learn your preferences, build a weekly menu and grocery list, and connect you to delivery partners so you can cook faster with less effort.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-xl font-semibold mb-2">Can I get groceries delivered?</h4>
              <p className="text-gray-700">
                Yes. We pre-map ingredients to delivery partners so you can check out in one click and get the right items for each recipe.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-xl font-semibold mb-2">Is there a free trial?</h4>
              <p className="text-gray-700">Start with a 14-day free trial and experience the full platform before subscribing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dictionary-style Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg text-left border border-gray-300">
            <h4 className="text-2xl font-bold mb-4">
              chef [shef] <span className="text-gray-500">verb</span>
            </h4>
            <p className="font-mono mb-2">
              <span className="font-bold">Definition:</span> To chef - to create
              delicious meals from fresh ingredients with flavors that sing.
            </p>
            <p className="font-mono italic text-gray-700">"Instantly Shop. Instantly Chef."</p>
            <div className="text-center mt-6">
              <Link
                href="/auth?next=/post-auth"
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-white font-semibold"
              >
                Start Trial
              </Link>
              <button
                onClick={() => setShowModal(false)}
                className="block mt-4 text-sm text-gray-600 hover:underline mx-auto"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
