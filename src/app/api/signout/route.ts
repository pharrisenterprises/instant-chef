// src/app/api/signout/route.ts
import { NextResponse } from 'next/server'
import { createServer } from '@/lib/supabase/server' // <-- server helper

export async function POST(request: Request) {
  const supabase = createServer()
  await supabase.auth.signOut()

  const url = new URL('/', request.url)
  const res = NextResponse.redirect(url)

  // Clear the 24h cookie
  res.cookies.set('ic_logout_at', '', { path: '/', maxAge: 0 })

  return res
}
