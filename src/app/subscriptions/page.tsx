import { redirect } from 'next/navigation';

export default function LegacySubscriptionsPage() {
  redirect('/account/billing');
}

