'use client';
import DashboardClient from '@/components/DashboardClient';
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <DashboardClient />;
}
