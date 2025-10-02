'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function HomePage() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowModal(true), 30000) // 30s
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-white text-gray-900">
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
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <a href="/" className="text-2xl font-bold hover:underline">
              Instantly Chef
            </a>
          </div>

          <nav className="space-x-6 text-sm font-medium">
            <a href="#how-it-works" className="hover:underline">How It Works</a>
            <a href="#menu-library" className="hover:underline">Menu</a>
            <a href="#partnerships" className="hover:underline">Partners</a>
            <a href="#advantage" className="hover:underline">Why Us</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative w-full h-screen flex items-center justify-center text-white overflow-hidden"
      >
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Instantly Shop. Instantly Chef.
          </h2>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="/signup"
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-full text-white font-semibold"
            >
              Shop Now
            </a>
            <a
              href="/signup"
              className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-full font-semibold"
            >
              Start 14-Day Free Trial
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gray-100 text-center">
        <h3 className="text-3xl font-semibold mb-6">How It Works</h3>
        <p className="max-w-2xl mx-auto text-lg">
          We plan your meals. You get groceries delivered. Eat better, instantly.
        </p>
      </section>

      {/* Menu Library */}
      <section id="menu-library" className="py-16 text-center">
        <h3 className="text-3xl font-semibold mb-6">Menu Library</h3>
        <p className="max-w-2xl mx-auto text-lg">🚧 Under Construction 🚧</p>
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
                alt={logo}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Competitive Advantage */}
      <section id="advantage" className="py-16 text-center bg-white">
        <h3 className="text-3xl font-semibold mb-6">Why Instantly Chef?</h3>
        <ul className="max-w-2xl mx-auto text-left text-lg space-y-4">
          <li>✅ Personalized meal planning</li>
          <li>✅ Grocery delivery integration</li>
          <li>✅ Tailored to your time & skill level</li>
          <li>✅ Designed for real households</li>
          <li>✅ Smarter than traditional meal kits</li>
        </ul>
      </section>

      {/* Dictionary-style Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg text-left border border-gray-300">
            <h4 className="text-2xl font-bold mb-4">
              chef [ʃɛf] <span className="text-gray-500">verb</span>
            </h4>
            <p className="font-mono mb-2">
              <span className="font-bold">Definition:</span> To chef — to create
              delicious meals from fresh ingredients with flavors that sing to the soul.
            </p>
            <p className="font-mono italic text-gray-700">
              “Instantly Shop. Instantly Chef.”
            </p>
            <div className="text-center mt-6">
              <a
                href="/signup"
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full text-white font-semibold"
              >
                Start Trial
              </a>
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
  )
}
