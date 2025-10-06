import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
<form action="/auth/signout" method="post">
  <button className="rounded-lg bg-black text-white px-4 py-2">Sign out</button>
</form>
