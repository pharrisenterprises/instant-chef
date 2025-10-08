// src/components/N8NGenerate.tsx (or where you build the payload)
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function N8NGenerate({ aggregateFromState }: { aggregateFromState: () => any }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      // Pull the account profile from LS if present
      const basic = readLS<Profile["basicInformation"]>("IC_BASIC", {
        firstName: "",
        lastName: "",
        email: "",
      } as any);

      // Build the full client from app state + LS profile
      const client = {
        basicInformation: basic,
        ...aggregateFromState(), // weekly, pantry, bar, shopping prefs, etc.
      };

      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Trigger failed (${res.status})`);
      }

      // ...start your correlationId polling here (unchanged)
      // const { correlationId } = await res.json();
      // poll /api/n8n/callback?cid=correlationId ...

    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button disabled={busy} onClick={handleGenerate} className="btn btn-primary">
        {busy ? "Generating..." : "Generate Menu"}
      </button>
      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
    </div>
  );
}
