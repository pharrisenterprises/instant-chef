import "./globals.css";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SupabaseProvider } from "@supabase/auth-helpers-react";

export const metadata = {
  title: "Instant Chef",
  description: "Menu planning assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();

  return (
    <html lang="en">
      <body>
        <SupabaseProvider supabaseClient={supabase}>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
