// src/app/auth/signout/page.tsx (or wherever your signout UI lives)
export default function SignOutPage() {
  return (
    <form action="/api/signout" method="post">
      <button className="rounded-lg bg-black text-white px-4 py-2">Sign out</button>
    </form>
  )
}
