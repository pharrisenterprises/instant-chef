// src/app/api/mark-login/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours in ms
  // store as unix ms string
  res.cookies.set('ic_logout_at', String(expiresAt), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    // let the browser drop it after ~24h too (defense in depth)
    maxAge: 24 * 60 * 60,
    path: '/', 
  })

  return res
}
