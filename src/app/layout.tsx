// src/app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Instant Chef",
  description: "Menu planning assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
