import AccountSideNav from '@/components/AccountSideNav';
import SubscriptionBillingContent from '@/components/SubscriptionBillingContent';

export const dynamic = 'force-dynamic';

export default function AccountBillingPage() {
  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat py-12 px-6"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl mx-auto p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Subscriptions & Billing</h1>
          <p className="text-sm text-gray-600 mt-2">
            Review your current plan, manage billing, and upgrade when you are ready.
          </p>
        </div>

        <AccountSideNav className="mb-8" />
        <SubscriptionBillingContent />
      </div>
    </main>
  );
}

