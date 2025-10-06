// src/app/auth/signout/page.tsx
export default function SignOutPage() {
  return (
    <form action="/auth/signout" method="post">
      <button className="rounded-lg bg-black text-white px-4 py-2">
        Sign out
      </button>
    </form>
  )
}
