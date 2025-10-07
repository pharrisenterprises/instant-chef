"use client";

import { useEffect, useState } from "react";
import WeeklyPlanner from "@/components/WeeklyPlannerSection";
import MenuCards from "@/components/MenuCardsSection";
import ShoppingCart from "@/components/ShoppingCartSection";
import PantrySection from "@/components/PantrySection";
import BarSection from "@/components/BarSection";

import type {
  PantryItem,
  BarItem,
  MenuItem,
} from "@/lib/types"; // Ensure this exists

export default function DashboardClient() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [bar, setBar] = useState<BarItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [approvedMenus, setApprovedMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);

  // Example logic (you can add real logic here later)
  useEffect(() => {
    const storedPantry = localStorage.getItem("ic_pantry");
    if (storedPantry) setPantry(JSON.parse(storedPantry));

    const storedBar = localStorage.getItem("ic_bar");
    if (storedBar) setBar(JSON.parse(storedBar));
  }, []);

  return (
    <div className="flex flex-col gap-8 p-6">
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
