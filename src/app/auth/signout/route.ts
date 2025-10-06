// src/app/auth/signout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' // adjust your path

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Redirect back to home on the same origin that made the request
  return NextResponse.redirect(new URL('/', request.url))
}
