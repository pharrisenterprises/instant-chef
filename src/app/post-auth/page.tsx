'use client';

import { Suspense, useEffect } from 'react';
import Inner from './post-auth-inner';

export const dynamic = 'force-dynamic';

export default function PostAuthPage() {
  // Wrap any useSearchParams usage in a Suspense boundary
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-500">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
