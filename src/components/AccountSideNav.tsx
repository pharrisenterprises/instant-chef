"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/account', label: 'Account Profile' },
  { href: '/account/billing', label: 'Subscriptions & Billing' },
];

export default function AccountSideNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={`flex flex-wrap items-center gap-2 rounded-full border bg-white/90 px-4 py-2 shadow-sm overflow-x-auto ${className ?? ''}`}
      aria-label="Account navigation"
      role="tablist"
    >
      {navItems.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active ? 'bg-gray-900 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
