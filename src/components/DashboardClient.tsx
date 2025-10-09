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

  // Restore Pantry/Bar from localStorage
  useEffect(() => {
    setPantry(readLS<PantryItem[]>("ic_pantry", []));
    setBar(readLS<BarItem[]>("ic_bar", []));
  }, []);

  // Persist Pantry/Bar if they change
  useEffect(() => {
    localStorage.setItem("ic_pantry", JSON.stringify(pantry));
  }, [pantry]);
  useEffect(() => {
    localStorage.setItem("ic_bar", JSON.stringify(bar));
  }, [bar]);

  // Load latest order’s menus on mount and wire realtime updates
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

      // Subscribe to realtime changes on orders
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
      // cleanupPromise is awaited implicitly by above return of channel remover
      void cleanupPromise;
    };
  }, [supabase]);

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Your planner still controls generating menus; the callback will update `orders.menus` and this page will live-refresh via Realtime. */}
      <WeeklyPlanner
        menus={menus}
        setMenus={setMenus}
        approvedMenus={approvedMenus}
        setApprovedMenus={setApprovedMenus}
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
