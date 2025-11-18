"use client";

import { useEffect, useState } from 'react';

const PLAN_DISPLAY: Record<string, string> = {
  trial: 'Free 14-Day Trial',
  '3month': '3-Month Plan ($36 upfront)',
  yearly: 'Annual Plan ($60 upfront)',
};

export default function SubscriptionBillingContent() {
  const [currentPlan, setCurrentPlan] = useState<string>('trial');

  useEffect(() => {
    const storedPlan = typeof window !== 'undefined' ? localStorage.getItem('plan') : null;
    if (storedPlan) setCurrentPlan(storedPlan);
  }, []);

  function handleUpgrade(newPlan: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('plan', newPlan);
    setCurrentPlan(newPlan);
    alert(`Subscription updated to: ${PLAN_DISPLAY[newPlan] ?? newPlan}`);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gray-50/80 p-6">
        <h2 className="text-xl font-semibold mb-2">Your Current Plan</h2>
        <p className="text-gray-700">{PLAN_DISPLAY[currentPlan] ?? PLAN_DISPLAY.trial}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Upgrade Your Plan</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <PlanCard
            title="3-Month Plan"
            price="$9/month"
            details="Billed as $36 upfront"
            onChoose={() => handleUpgrade('3month')}
          />
          <PlanCard
            title="Annual Plan"
            price="$60 / year"
            details="60% discount upfront"
            onChoose={() => handleUpgrade('yearly')}
          />
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  title,
  price,
  details,
  onChoose,
}: {
  title: string;
  price: string;
  details: string;
  onChoose: () => void;
}) {
  return (
    <div className="border rounded-2xl shadow-sm p-6 flex flex-col items-center text-center bg-white">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-gray-700">{price}</p>
      <p className="text-gray-500">{details}</p>
      <button
        onClick={onChoose}
        className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
      >
        Choose Plan
      </button>
    </div>
  );
}

