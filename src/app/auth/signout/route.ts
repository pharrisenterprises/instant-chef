// src/app/auth/signout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // adjust path if your server helper differs

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', 'http://localhost:3000')) // fallback
  // If you’ve set NEXT_PUBLIC_BASE_URL on Vercel, you can do:
  // return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL))
}
