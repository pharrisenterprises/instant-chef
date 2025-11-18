'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Inner() {
  const router = useRouter();
  const search = useSearchParams(); // safe now (inside Suspense)
  const next = search.get('next') || '/dashboard';

  // Example: after auth, send them to ?next=... or dashboard
  useEffect(() => {
    router.replace(next);
  }, [next, router]);

  return (
    <div className="min-h-screen grid place-items-center text-gray-500">
      Redirecting…
    </div>
  );
}
