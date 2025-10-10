// DO NOT put "use client" here
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import DashboardClient from '@/components/DashboardClient'

export default function Page() {
  return <DashboardClient />
}
