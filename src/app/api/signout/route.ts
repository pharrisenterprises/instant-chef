// src/app/api/signout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // adjust if your server helper path differs

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', 'http://localhost:3000'))
  // or if you set NEXT_PUBLIC_BASE_URL in Vercel:
  // return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL))
}
