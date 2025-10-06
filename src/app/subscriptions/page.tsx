'use client'

import { useEffect, useState } from 'react'

export default function SubscriptionsPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('trial')

  useEffect(() => {
    const storedPlan = localStorage.getItem('plan')
    if (storedPlan) setCurrentPlan(storedPlan)
  }, [])

  function handleUpgrade(newPlan: string) {
    localStorage.setItem('plan', newPlan)
    setCurrentPlan(newPlan)
    alert(`Subscription updated to: ${newPlan}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Subscription & Billing</h1>

        {/* Current Plan */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold">Your Current Plan</h2>
          <p className="text-gray-700 mt-2">
            {currentPlan === 'trial' && 'Free 14-Day Trial'}
            {currentPlan === '3month' && '3-Month Plan ($36 upfront)'}
            {currentPlan === 'yearly' && 'Annual Plan ($60 upfront)'}
          </p>
        </div>

        {/* Upgrade Options */}
        <h2 className="text-xl font-semibold text-center mb-4">Upgrade Your Plan</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 3-Month Plan */}
          <div className="border rounded-xl shadow-sm p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold">3-Month Plan</h3>
            <p className="mt-2 text-gray-700">$9/month</p>
            <p className="text-gray-500">Billed as $36 upfront</p>
            <button
              onClick={() => handleUpgrade('3month')}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
            >
              Choose Plan
            </button>
          </div>

          {/* Annual Plan */}
          <div className="border rounded-xl shadow-sm p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold">Annual Plan</h3>
            <p className="mt-2 text-gray-700">$60 / year</p>
            <p className="text-gray-500">60% discount upfront</p>
            <button
              onClick={() => handleUpgrade('yearly')}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
            >
              Choose Plan
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
