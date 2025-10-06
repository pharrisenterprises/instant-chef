// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instantly Chef",
  description: "Weekly menu planner",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Make a stacking context and keep backgrounds BEHIND content */}
        <div className="relative isolate min-h-dvh">
          {/* If you want a page background, keep it below with a negative z-index */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
          >
            {/* Example: a subtle gradient; keep it fully opaque to avoid wash-out */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,245,245,1),rgba(255,255,255,1))]" />
          </div>

          {/* App content is always above */}
          <main className="relative z-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
