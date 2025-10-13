"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";
import { createClient } from "@/lib/supabase/client";

import type { PantryItem, BarItem, MenuItem } from "@/lib/types";

/** safe JSON read from localStorage */
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DashboardClient() {
  const supabase = useMemo(() => createClient(), []);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [approvedMenus, setApprovedMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);
  const latestOrderIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // 🔔 NEW: watch a specific order (set by N8NGenerate -> onSubmitted)
  const [watchOrderId, setWatchOrderId] = useState<string | null>(null);
  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ NEW: names the user marked as "on hand this week"
  // (stored by the weekly planner; adjust key if your app uses a different one)
  const [onHandNames, setOnHandNames] = useState<string[]>([]);

  // Restore Pantry/Bar from localStorage
  useEffect(() => {
    setPantry(readLS<PantryItem[]>("ic_pantry", []));
    setBar(readLS<BarItem[]>("ic_bar", []));
    // try common keys for "on hand" (keep this flexible)
    const fromPrimary = readLS<string[]>("ic_onhand_names", []);
    const fromAlt = readLS<string[]>("ic_onhand", []);
    setOnHandNames(fromPrimary.length ? fromPrimary : fromAlt);
  }, []);

  // Persist Pantry/Bar if they change
  useEffect(() => {
    localStorage.setItem("ic_pantry", JSON.stringify(pantry));
  }, [pantry]);
  useEffect(() => {
    localStorage.setItem("ic_bar", JSON.stringify(bar));
  }, [bar]);

  // ✅ NEW: auto-filter cart so it only contains items to purchase
  // (i.e., exclude anything already in Pantry or marked On-Hand)
  useEffect(() => {
    if (!cart?.length) return;

    const norm = (s: string) => s?.trim().toLowerCase();
    const pantrySet = new Set(
      (pantry || []).map((p) => norm((p as any).name ?? ""))
    );
    const onHandSet = new Set((onHandNames || []).map(norm));

    // cart lines are expected to have a `.name` (ingredient name)
    const filtered = cart.filter((line: any) => {
      const n = norm(line?.name ?? "");
      if (!n) return true; // keep if unnamed (defensive)
      return !pantrySet.has(n) && !onHandSet.has(n);
    });

    if (filtered.length !== cart.length) {
      setCart(filtered);
    }
  }, [cart, pantry, onHandNames]);

  // Load latest order’s menus on mount and wire realtime updates (existing logic kept)
  useEffect(() => {
    let unsubscribed = false;

    async function init() {
      // who’s logged in?
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (!uid) return; // not signed in
      userIdRef.current = uid;

      // Fetch latest order for this user
      const { data: latest, error } = await supabase
        .from("orders")
        .select("id, user_id, status, menus, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!unsubscribed && !error && latest) {
        latestOrderIdRef.current = latest.id ?? null;
        if (Array.isArray(latest.menus)) setMenus(latest.menus as MenuItem[]);
      }

      // Subscribe to realtime changes on orders (broad stream)
      const channel = supabase
        .channel("orders-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          (payload: any) => {
            const row = payload?.new ?? payload?.old ?? null;
            if (!row) return;

            // Only care about updates for this signed-in user
            if (row.user_id !== userIdRef.current) return;

            // Track the newest order id we’ve seen
            if (payload.eventType === "INSERT") {
              latestOrderIdRef.current = row.id ?? latestOrderIdRef.current;
            }

            // If this is our latest order and menus changed, update UI
            const isLatest =
              !latestOrderIdRef.current || latestOrderIdRef.current === row.id;
            if (isLatest && Array.isArray(row.menus)) {
              setMenus(row.menus as MenuItem[]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanupPromise = init();

    return () => {
      // best-effort cleanup signal for async init()
      unsubscribed = true;
      void cleanupPromise;
    };
  }, [supabase]);

  /* ====================== NEW: “watch this order id” stream ====================== */

  // Called by N8NGenerate (via WeeklyPlanner) after the order row is inserted
  function handleOrderSubmitted(order: { id: string; correlation_id: string }) {
    setWatchOrderId(order.id);
  }

  // Focused realtime subscription + polling fallback for the specific order we just created
  useEffect(() => {
    if (!watchOrderId) return;

    // 1) Focused realtime channel (only this order row)
    const channel = supabase
      .channel(`order_${watchOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${watchOrderId}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (Array.isArray(next?.menus)) {
            setMenus(next.menus as MenuItem[]);
          }
        }
      )
      .subscribe();

    // 2) Polling fallback (~2 minutes, every 5s)
    let ticks = 0;
    pollHandleRef.current = setInterval(async () => {
      ticks++;
      const { data, error } = await supabase
        .from("orders")
        .select("menus")
        .eq("id", watchOrderId)
        .single();

      if (!error && Array.isArray(data?.menus)) {
        setMenus(data.menus as MenuItem[]);
        if (pollHandleRef.current) {
          clearInterval(pollHandleRef.current);
          pollHandleRef.current = null;
        }
      }

      if (ticks >= 24 && pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    };
  }, [watchOrderId, supabase]);

  /* ============================================================================ */

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Your planner still controls generating menus; the callback will set `watchOrderId`
          and this component will live-refresh when n8n writes menus back. */}
      <WeeklyPlanner
        menus={menus}
        setMenus={setMenus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
        // 👇 NEW: forward to N8NGenerate (inside WeeklyPlanner)
        onSubmitted={handleOrderSubmitted}
      />

      <MenuCards
        menus={menus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
        cart={cart}
        setCart={setCart}
      />

      <ShoppingCart cart={cart} setCart={setCart} />

      <PantrySection pantry={pantry} setPantry={setPantry} />

      <BarSection bar={bar} setBar={setBar} />
    </div>
  ); 
}
