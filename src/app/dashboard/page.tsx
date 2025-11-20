'use client';







import { useEffect, useMemo, useRef, useState } from 'react';



import { useRouter } from 'next/navigation';



import { createClient } from '@/lib/supabase/client';







import N8NGenerate, {



  BasicInformation,



  HouseholdSetup,



  CookingPreferences,



  DietaryProfile,



  ShoppingPreferences,



  ClientPayload,



} from '@/components/N8NGenerate';







/* -------------------- LocalStorage keys -------------------- */



const LS = {



  PLAN: 'plan',



  PROFILE: 'ic_profile',



  WEEKLY: 'ic_weekly',



  MENUS: 'ic_menus',



  CART_MEAL: 'ic_cart_meal',



  CART_EXTRA: 'ic_cart_extra',



  PANTRY: 'ic_pantry',



  BAR: 'ic_bar',



  IC_BASIC: 'ic_basic',



  IC_HOUSE: 'ic_house',



  IC_COOK: 'ic_cook',



  IC_DIET: 'ic_diet',



  IC_SHOP: 'ic_shop',



};







/* -------------------- Types -------------------- */



type Measure = 'oz' | 'lb' | 'ml' | 'g' | 'kg' | 'count';



type Portionable = { portions: number };







type Ingredient = { name: string; qty: number; measure: Measure; estPrice?: number };


type SideItem = {

  title: string;

  ingredients: Ingredient[];

  steps: string[];

};











type MenuItem = Portionable & {

  id: string;

  title: string;

  description: string;

  hero: string;

  approved: boolean;

  feedback?: string;

  ingredients: Ingredient[];

  instructions?: string[];

  recipe_steps?: string | null;

};





type PantryItem = {



  id: string;



  name: string;



  qty: number | null;



  measure: Measure | null;



  staple?: boolean;



  active: boolean;



  updatedAt: number;



  type?: string;



};







type BarItem = {



  id: string;



  name: string;



  qty: number;



  measure: Measure;



  type: 'spirit' | 'mixer' | 'produce' | 'herb' | 'other';



  active: boolean;



  updatedAt: number;



  perishable?: boolean;



};







type Profile = { portionDefault: number; store: string };







type Weekly = {



  dinners: number;



  budgetType: 'none' | 'perWeek' | 'perMeal';



  budgetValue?: number;



  onHandText: string;



  onHandImageDataUrl?: string;



  mood: string;



  extras: string;



};







type CartLine = {



  id: string;



  name: string;



  qty: number;



  measure: Measure;



  estPrice: number;



  section: 'meal' | 'extra';



};







type BeverageRecipe = {



  id: string;



  name: string;



  type: 'cocktail' | 'mocktail';



  ingredients: { name: string; qty: number; measure: string }[];



  instructions: string[];



  imageUrl: string;



};







type OnHandItem = { qty: string; name: string; notes: string };







/* -------------------- Helpers -------------------- */



const now = () => Date.now();



const uid = () => Math.random().toString(36).slice(2, 10);



const toNumber = (v: any, fallback = 0) => (Number.isFinite(+v) ? +v : fallback);







const defaultProfile: Profile = { portionDefault: 4, store: 'Kroger' };



const defaultWeekly: Weekly = { dinners: 3, budgetType: 'none', budgetValue: undefined, onHandText: '', onHandImageDataUrl: undefined, mood: '', extras: '' };







const defaultPantry: PantryItem[] = [



  { id: uid(), name: 'Salt', qty: null, measure: null, staple: true, active: true, updatedAt: now(), type: 'spice' },



  { id: uid(), name: 'Pepper', qty: null, measure: null, staple: true, active: true, updatedAt: now(), type: 'spice' },



  { id: uid(), name: 'Extra-virgin olive oil', qty: null, measure: null, staple: true, active: true, updatedAt: now(), type: 'oil' },



  { id: uid(), name: 'Vegetable oil', qty: null, measure: null, staple: true, active: true, updatedAt: now(), type: 'oil' },



];







const defaultBar: BarItem[] = [



  { id: uid(), name: 'Vodka', qty: 16, measure: 'oz', type: 'spirit', active: true, updatedAt: now() },



  { id: uid(), name: 'Tonic water', qty: 12, measure: 'oz', type: 'mixer', active: true, updatedAt: now() },



  { id: uid(), name: 'Strawberries', qty: 8, measure: 'oz', type: 'produce', active: true, perishable: true, updatedAt: now() },



  { id: uid(), name: 'Mint', qty: 1, measure: 'oz', type: 'herb', active: true, perishable: true, updatedAt: now() },



];







function load<T>(key: string, fallback: T): T {



  if (typeof window === 'undefined') return fallback;



  try {



    const raw = localStorage.getItem(key);



    return raw ? (JSON.parse(raw) as T) : fallback;



  } catch {



    return fallback;



  }



}



function save<T>(key: string, val: T) {



  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(val));



}







function scaleIngredients(base: Ingredient[], portions: number) {



  const scale = portions / 2;



  return base.map(i => ({ ...i, qty: +(i.qty * scale).toFixed(2) }));



}



function linePrice(i: Ingredient) {

  if (!i.estPrice) return 0;

  return +(i.qty * i.estPrice).toFixed(2);

}



function parseInstructionSteps(source: unknown): string[] {

  if (!source) return [];

  if (Array.isArray(source)) {

    return source.map(step => String(step).trim()).filter(Boolean);

  }

  if (typeof source === 'string') {

    const normalized = source

      .replace(/\r/g, '\n')

      .replace(/[-\u2022]/g, '\n');

    return normalized

      .split(/\n+/)

      .map(step => step.replace(/^\d+[\).\s]+/, '').trim())

      .filter(Boolean);

  }

  return [];

}

function parseIngredientString(line?: unknown): Ingredient[] {
  if (!line || typeof line !== 'string') return [];
  return line
    .split('|')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, rightRaw] = chunk.split(':').map((x) => x.trim());
      if (!name) return null;
      if (!rightRaw) {
        return { name, qty: 1, measure: 'count' as Measure };
      }
      const parts = rightRaw.split(/\s+/);
      const qty = Number(parts[0].replace(/[^0-9.]/g, ''));
      const measure = parts.slice(1).join(' ') || 'count';
      return {
        name,
        qty: Number.isFinite(qty) ? qty : 1,
        measure: measure as Measure,
      };
    })
    .filter(Boolean) as Ingredient[];
}

function splitSideSections(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    if (raw.includes('||')) {
      return raw.split('||').map((x) => x.trim()).filter(Boolean);
    }
    if (raw.includes('\n\n')) {
      return raw.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
    }
    return [raw.trim()];
  }
  return [];
}

function buildSidesFromRaw(source: any): SideItem[] {
  if (Array.isArray(source?.sides)) {
    return source.sides
      .map((side: any, idx: number) => ({
        title: typeof side?.title === 'string' && side.title.trim().length ? side.title : `Side ${idx + 1}`,
        ingredients: Array.isArray(side?.ingredients) ? side.ingredients : [],
        steps: Array.isArray(side?.steps) ? side.steps.map((s: any) => String(s).trim()).filter(Boolean) : parseInstructionSteps(side?.steps),
      }))
      .filter((side) => side.title || side.ingredients.length || side.steps.length);
  }

  const titles = splitSideSections(source?.sides_titles ?? source?.sidesTitles);
  const ingredientsBlocks = splitSideSections(source?.sides_ingredients_per_serving ?? source?.sidesIngredientsPerServing);
  const stepsBlocks = splitSideSections(source?.sides_steps ?? source?.sidesSteps);
  const max = Math.max(titles.length, ingredientsBlocks.length, stepsBlocks.length);
  const sides: SideItem[] = [];

  for (let i = 0; i < max; i += 1) {
    const titleCandidate = titles[i] ?? (max > 1 ? `Side ${i + 1}` : titles[0] ?? '');
    const title = titleCandidate?.trim() || `Side ${i + 1}`;
    const ingredients = parseIngredientString(ingredientsBlocks[i]);
    const steps = parseInstructionSteps(stepsBlocks[i]);

    if (title || ingredients.length || steps.length) {
      sides.push({
        title,
        ingredients,
        steps,
      });
    }
  }

  return sides;
}



// --- INGREDIENT MATCHING HELPERS (simple + resilient) ---

function normalizeName(s: string): string {

  let x = (s || '').toLowerCase()

    .replace(/[^a-z0-9\s-]/g, ' ')

    .replace(/\s+/g, ' ')



    .trim();







  x = x.replace(



    /^(?:\d+(?:\.\d+)?\s*)?(?:oz|ounce|ounces|lb|pound|pounds|ml|g|gram|grams|kg|tsp|teaspoon|teaspoons|tbsp|tablespoon|tablespoons|cup|cups|count|pieces|piece)\b\s*/i,



    ''



  ).trim();







  if (x.endsWith('es')) x = x.slice(0, -2);



  else if (x.endsWith('s')) x = x.slice(0, -1);







  return x;



}







function parseQuantityValue(raw?: string | null): number | null {



  if (!raw) return null;



  const match = raw.trim().match(/-?\d+(?:\.\d+)?/);



  if (!match) return null;



  return Math.max(0, parseFloat(match[0]));



}







function extractOnHandEntries(items: OnHandItem[], fallbackText: string): { name: string; qty: number | null }[] {



  const structured = items



    .map(entry => ({



      name: normalizeName(entry.name),



      qty: parseQuantityValue(entry.qty),



    }))



    .filter(entry => entry.name);







  if (structured.length > 0) return structured;







  return fallbackText



    .split(',')



    .map(part => part.trim())



    .filter(Boolean)



    .map(part => {



      const qty = parseQuantityValue(part);



      const name = normalizeName(part.replace(/^-?\d+(?:\.\d+)?\s*/, ''));



      return { name, qty };



    })



    .filter(entry => entry.name);



}







function buildHaveInventory(



  pantry: PantryItem[],



  onHandItems: OnHandItem[],



  onHandText: string



): Map<string, number | typeof Infinity> {



  const inventory = new Map<string, number | typeof Infinity>();



  const add = (rawName: string, qty: number | null) => {



    const name = normalizeName(rawName);



    if (!name) return;



    if (qty == null || !Number.isFinite(qty)) {



      inventory.set(name, Infinity);



      return;



    }



    const prev = inventory.get(name);



    if (prev === Infinity) return;



    inventory.set(name, +(Number(prev ?? 0) + qty).toFixed(2));



  };







  pantry.forEach(item => {



    if (item?.name && item.active !== false) add(item.name, null);



  });







  extractOnHandEntries(onHandItems, onHandText).forEach(entry => add(entry.name, entry.qty));



  return inventory;



}







function autoFadePerishables(items: BarItem[]): BarItem[] {



  const weekMs = 7 * 24 * 3600 * 1000;



  const t = now();



  return items.map(it => {



    if ((it.type === 'produce' || it.type === 'herb' || it.perishable) && t - it.updatedAt > weekMs) {



      return { ...it, active: false };



    }



    return it;



  });



}







function isCountishMeasure(measure?: string | null) {



  if (!measure) return true;



  const m = measure.toString().toLowerCase();



  return (



    m === 'count' ||



    m.includes('piece') ||



    m === 'unit' ||



    m === 'units' ||



    m === 'each' ||



    m === 'ea'



  );



}







function computeMissingIngredients(



  ingredients: Ingredient[],



  inventory: Map<string, number | typeof Infinity>



): Ingredient[] {



  const missing: Ingredient[] = [];



  for (const ing of ingredients) {



    const key = normalizeName(ing.name);



    if (!key) continue;



    const available = inventory.get(key);



    if (available === undefined) {



      missing.push(ing);



      continue;



    }



    if (available === Infinity) {



      continue;



    }



    if (!isCountishMeasure(ing.measure)) {



      // Assume pantry/on-hand entry covers non-count ingredients



      continue;



    }



    const remaining = +(available - ing.qty).toFixed(2);



    if (remaining >= 0) {



      inventory.set(key, remaining);



      continue;



    }



    const needed = +(-remaining).toFixed(2);



    if (needed > 0) {



      missing.push({ ...ing, qty: needed });



    }



    inventory.set(key, 0);



  }



  return missing;



}







function mergeCartLines(lines: CartLine[]): CartLine[] {



  const map = new Map<string, CartLine>();



  for (const line of lines) {



    const key = `${normalizeName(line.name)}|${(line.measure || '').toLowerCase()}`;



    if (map.has(key)) {



      const existing = map.get(key)!;



      existing.qty = +(existing.qty + line.qty).toFixed(2);



      existing.estPrice = +(existing.estPrice + line.estPrice).toFixed(2);



    } else {



      map.set(key, { ...line });



    }



  }



  return Array.from(map.values());



}







function getMenuInstructions(menu: MenuItem): string[] {

  const parsedFromRecipe = parseInstructionSteps((menu as any)?.recipe_steps ?? (menu as any)?.recipeSteps);

  if (parsedFromRecipe.length) return parsedFromRecipe;

  if (Array.isArray(menu.instructions) && menu.instructions.length) {

    return menu.instructions;

  }

  const parsedFromField = parseInstructionSteps((menu as any)?.instructions);

  if (parsedFromField.length) return parsedFromField;

  return [

    'Prep all ingredients listed above by washing, chopping, and measuring.',

    `Follow the dish description to cook: ${menu.description}`,

    'Taste, adjust seasoning, plate, and serve.',

  ];

}





function generateBeverageRecipe(bar: BarItem[], type: 'cocktail' | 'mocktail'): BeverageRecipe {



  const activeItems = bar.filter(i => i.active);



  let selected: { name: string; qty: number; measure: string }[] = [];



  let name = '';



  let steps: string[] = [];







  if (type === 'mocktail') {



    const produce = activeItems.filter(i => i.type === 'produce');



    const herbs = activeItems.filter(i => i.type === 'herb');



    const mixers = activeItems.filter(i => i.type === 'mixer');



    if (produce[0]) { name = `Sparkling ${produce[0].name} `; selected.push({ name: produce[0].name, qty: 4, measure: 'oz' }); }



    if (herbs[0]) { name += herbs[0].name + ' Refresher'; selected.push({ name: herbs[0].name, qty: 3, measure: 'leaves' }); }



    if (mixers[0]) selected.push({ name: mixers[0].name, qty: 6, measure: 'oz' });



    if (!name) name = 'Fresh Garden Mocktail';



    steps = ['Muddle fresh ingredients', 'Add ice and shake 15s', 'Strain into glass with ice', 'Top with mixer & garnish'];



  } else {



    const spirits = activeItems.filter(i => i.type === 'spirit');



    const produce = activeItems.filter(i => i.type === 'produce');



    const mixers = activeItems.filter(i => i.type === 'mixer');



    if (spirits[0]) { name = spirits[0].name + ' '; selected.push({ name: spirits[0].name, qty: 2, measure: 'oz' }); }



    if (produce[0]) { name += produce[0].name + ' '; selected.push({ name: produce[0].name, qty: 3, measure: 'pieces' }); }



    if (mixers[0]) { name += mixers[0].name.includes('water') ? 'Spritz' : 'Cocktail'; selected.push({ name: mixers[0].name, qty: 4, measure: 'oz' }); }



    if (!name) name = 'Classic Cocktail';



    steps = ['Add spirit + fresh items to shaker with ice', 'Shake 15-20s', 'Strain over fresh ice', 'Top with mixer, garnish'];



  }



  const img = `https://source.unsplash.com/800x600/?${type},beverage,${encodeURIComponent(name)}`;



  return { id: uid(), name, type, ingredients: selected, instructions: steps, imageUrl: img };



}







function normalizeMenu(m: any, defaultPortions: number): MenuItem {

  const stepsFromInstructions = parseInstructionSteps(m?.instructions);

  const stepsFromRecipe = parseInstructionSteps(m?.recipe_steps ?? m?.recipeSteps);

  const sides = buildSidesFromRaw(m);

  const instructions = stepsFromInstructions.length

    ? stepsFromInstructions

    : stepsFromRecipe.length

    ? stepsFromRecipe

    : undefined;



  return {

    id: m?.id ?? uid(),

    title: m?.title ?? 'Untitled',

    description: m?.description ?? '',

    hero: typeof m?.hero === 'string' && m.hero ? m.hero : '/hero.jpg',

    ingredients: Array.isArray(m?.ingredients) ? m.ingredients : [],

    portions: Number.isFinite(+m?.portions) ? +m.portions : defaultPortions,

    approved: Boolean(m?.approved),

    feedback: typeof m?.feedback === 'string' ? m.feedback : undefined,

    instructions,

    recipe_steps: typeof m?.recipe_steps === 'string'

      ? m.recipe_steps

      : typeof m?.recipeSteps === 'string'

      ? m.recipeSteps

      : undefined,

    sides: sides.length ? sides : undefined,

  };

}





/* -------------------- Component -------------------- */



export default function DashboardPage() {



  // Auth + router



  const supabase = useMemo(() => createClient(), []);



  const router = useRouter();



  const [userEmail, setUserEmail] = useState<string | null>(null);







  // --- state FIRST ---



  const [profile, setProfile] = useState<Profile>(defaultProfile);



  const [weekly, setWeekly] = useState<Weekly>(defaultWeekly);



  const [menus, setMenus] = useState<MenuItem[]>([]);



  const [cartMeal, setCartMeal] = useState<CartLine[]>([]);



  const [cartExtra, setCartExtra] = useState<CartLine[]>([]);



  function resetCart() { setCartMeal([]); setCartExtra([]); }



  const [pantry, setPantry] = useState<PantryItem[]>(defaultPantry);  



  const [bar, setBar] = useState<BarItem[]>(defaultBar);



  const [accountOpen, setAccountOpen] = useState(false);



  const [beverageRecipe, setBeverageRecipe] = useState<BeverageRecipe | null>(null);



  const [editingPantryItem, setEditingPantryItem] = useState<string | null>(null);



  const [editForm, setEditForm] = useState<{ name: string; qty: string; measure: Measure | null }>({ name: '', qty: '', measure: 'oz' });



  const [onHandPreview, setOnHandPreview] = useState<string | undefined>(undefined);



  const [pantryPreview, setPantryPreview] = useState<string | undefined>(undefined);



  const [barPreview, setBarPreview] = useState<string | undefined>(undefined);



  const [editingBarItem, setEditingBarItem] = useState<string | null>(null);



  const [barEditForm, setBarEditForm] = useState<{ name: string; qty: string; measure: Measure; type: BarItem['type'] }>({



    name: '',



    qty: '1',



    measure: 'oz',



    type: 'spirit',



  });







  // NEW: structured "on hand" rows (Qty / Item / Notes)



  const [onHandItems, setOnHandItems] = useState<OnHandItem[]>([{ qty: '', name: '', notes: '' }]);







  const [currentOrder, setCurrentOrder] = useState<{ id: string; correlation_id: string } | null>(null);



  const [watchOrderId, setWatchOrderId] = useState<string | null>(null);



  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);



  const lastOrderWithMenusRef = useRef<string | null>(null);



  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);







  // Sync: Keep weekly.onHandText in sync with the 3-box rows (backward compatible everywhere else)



  useEffect(() => {



    const text = onHandItems



      .filter(i => i.name.trim())



      .map(i => {



        const left = [i.qty.trim(), i.name.trim()].filter(Boolean).join(' ');



        return left + (i.notes.trim() ? ` (${i.notes.trim()})` : '');



      })



      .join(', ');



    setWeekly(w => ({ ...w, onHandText: text }));



  }, [onHandItems]);







  // (optional) If user had old text saved, bootstrap the first render rows from it once



  useEffect(() => {



    if (!weekly.onHandText || onHandItems.some(i => i.name || i.qty || i.notes)) return;



    const seeded = weekly.onHandText.split(',')



      .map(s => s.trim())



      .filter(Boolean)



      .map(s => {



        // crude parse: split first token as qty if it starts with number



        const m = s.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);



        if (m) return { qty: m[1], name: m[2], notes: '' };



        return { qty: '', name: s, notes: '' };



      });



    if (seeded.length) setOnHandItems(seeded);



  // eslint-disable-next-line react-hooks/exhaustive-deps



  }, []);







  // Clear carts once per order id when menus show



  useEffect(() => {



    if (!currentOrder || menus.length === 0) return;



    if (lastOrderWithMenusRef.current !== currentOrder.id) {



      setCartMeal([]); setCartExtra([]);



      try { localStorage.removeItem(LS.CART_MEAL); localStorage.removeItem(LS.CART_EXTRA); } catch {}



      lastOrderWithMenusRef.current = currentOrder.id;



    }



  }, [menus, currentOrder]);







  // --- Supabase + menus sync ---



  useEffect(() => {



    let unsubscribed = false;



    let channel: ReturnType<typeof supabase.channel> | null = null;



    let latestOrderId: string | null = null;







    (async () => {



      const { data: auth } = await supabase.auth.getUser();



      setUserEmail(auth?.user?.email ?? null);



      const uid = auth?.user?.id ?? null;



      if (!uid) return;







      const { data: latest, error } = await supabase



        .from('orders')



        .select('id, user_id, menus, created_at')



        .eq('user_id', uid)



        .order('created_at', { ascending: false })



        .limit(1)



        .maybeSingle();







      if (!unsubscribed && !error && latest) {



        latestOrderId = latest.id;



        if (Array.isArray(latest.menus)) {



          setMenus((latest.menus as any[]).map(x =>



            normalizeMenu(x, profile.portionDefault)



          ));



        }



      }







      channel = supabase



        .channel('orders-updates')



        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {



          const row = payload?.new ?? payload?.old ?? null;



          if (!row) return;



          if (payload.eventType === 'INSERT') latestOrderId = row.id;



          else if (!latestOrderId) latestOrderId = row.id;







          const isLatest = row.id === latestOrderId;



          if (isLatest && Array.isArray(row.menus)) {



            setMenus((row.menus as any[]).map(x =>



              normalizeMenu(x, profile.portionDefault)



            ));



          }



        })



        .subscribe();



    })();







    return () => { unsubscribed = true; if (channel) supabase.removeChannel(channel); };



  }, [supabase, profile.portionDefault]);







  // Unlock N8NGenerate when menus arrive



  useEffect(() => {



    if (menus.length > 0) {



      try { localStorage.removeItem('ic_pending_generation'); } catch {}



      window.dispatchEvent(new Event('ic:menus-ready'));



    }



  }, [menus]);







  // Focused subscription + polling for the order created by N8NGenerate



  useEffect(() => {



    if (!watchOrderId) return;







    const channel = supabase



      .channel(`order_${watchOrderId}`)



      .on(



        'postgres_changes',



        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${watchOrderId}` },



        (payload) => {



          const next = payload.new as any;



          if (Array.isArray(next?.menus)) {



            setMenus(next.menus.map((m: any) =>



              normalizeMenu(m, profile.portionDefault)



            ));



          }



        }



      )



      .subscribe();







    let ticks = 0;



    pollHandleRef.current = setInterval(async () => {



      ticks++;



      const { data, error } = await supabase



        .from('orders')



        .select('menus')



        .eq('id', watchOrderId)



        .single();







      if (!error && Array.isArray(data?.menus)) {



        setMenus(data.menus.map((m: any) =>



          normalizeMenu(m, profile.portionDefault)



        ));



        if (pollHandleRef.current) { clearInterval(pollHandleRef.current); pollHandleRef.current = null; }



      }



      if (ticks >= 24 && pollHandleRef.current) { clearInterval(pollHandleRef.current); pollHandleRef.current = null; }



    }, 5000);







    return () => {



      supabase.removeChannel(channel);



      if (pollHandleRef.current) { clearInterval(pollHandleRef.current); pollHandleRef.current = null; }



    };



  }, [watchOrderId, supabase, profile.portionDefault]);







  async function signOut() {



    try { await supabase.auth.signOut(); } catch {}



    Object.values(LS).forEach(k => localStorage.removeItem(k));



    router.replace('/');



  }







  // Hydrate from localStorage



  useEffect(() => {



    const p = load<Profile>(LS.PROFILE, defaultProfile);



    const w = load<Weekly>(LS.WEEKLY, defaultWeekly);



    const m = load<MenuItem[]>(LS.MENUS, []);



    const cm = load<CartLine[]>(LS.CART_MEAL, []);



    const ce = load<CartLine[]>(LS.CART_EXTRA, []);



    const pa = load<PantryItem[]>(LS.PANTRY, defaultPantry);



    const ba = load<BarItem[]>(LS.BAR, defaultBar);



    setProfile(p);



    setWeekly(w);



    setMenus((m as any[]).map(x => normalizeMenu(x, p.portionDefault)));



    setCartMeal(cm);



    setCartExtra(ce);



    setPantry(pa.length ? pa : defaultPantry);



    setBar(autoFadePerishables(ba.length ? ba : defaultBar));



  }, []);







  // Pull values from signup blobs



  useEffect(() => {



    const h = load<HouseholdSetup | null>(LS.IC_HOUSE, null);



    if (h) {



      setProfile(p => ({ ...p, portionDefault: h.portionsPerDinner || p.portionDefault }));



      if (h.dinnersPerWeek) setWeekly(w => ({ ...w, dinners: h.dinnersPerWeek! }));



    }



    const s = load<ShoppingPreferences | null>(LS.IC_SHOP, null);



    if (s?.preferredGroceryStore) setProfile(p => ({ ...p, store: s.preferredGroceryStore || p.store }));



  }, []);







  // Upsert menus table for current order



  useEffect(() => {



    if (!currentOrder || menus.length === 0) return;



    (async () => {



      try {



        const rows = menus.map(m => ({



          id: m.id,



          order_id: currentOrder.id,



          correlation_id: currentOrder.correlation_id,



          title: m.title,



          description: m.description,



        }));



        const { error } = await supabase.from('menus').upsert(rows, { onConflict: 'id' });



        if (error) console.error('[menus upsert] error:', error);



      } catch (e) {



        console.error('[menus upsert] exception:', e);



      }



    })();



  }, [menus, currentOrder, supabase]);







  // Persist



  useEffect(() => save(LS.PROFILE, profile), [profile]);



  useEffect(() => save(LS.WEEKLY, weekly), [weekly]);



  useEffect(() => save(LS.MENUS, menus), [menus]);



  useEffect(() => save(LS.CART_MEAL, cartMeal), [cartMeal]);



  useEffect(() => save(LS.CART_EXTRA, cartExtra), [cartExtra]);



  useEffect(() => save(LS.PANTRY, pantry), [pantry]);



  useEffect(() => save(LS.BAR, bar), [bar]);







  // Plan badge



  const [plan, setPlan] = useState<string | null>(null);



  useEffect(() => {



    setPlan(typeof window !== 'undefined' ? localStorage.getItem(LS.PLAN) : null);



  }, []);







  // Totals



  const totalMeal = useMemo(() => cartMeal.reduce((a, c) => a + c.estPrice, 0), [cartMeal]);



  const totalExtra = useMemo(() => cartExtra.reduce((a, c) => a + c.estPrice, 0), [cartExtra]);



  const grandTotal = useMemo(() => +(totalMeal + totalExtra).toFixed(2), [totalMeal, totalExtra]);







  function resetAll() {



    Object.values(LS).forEach(k => localStorage.removeItem(k));



    window.location.href = '/';



  }







  function approveMenu(menu: MenuItem) {



    const scaled = scaleIngredients(menu.ingredients, menu.portions);



    const haveInventory = buildHaveInventory(pantry, onHandItems, weekly.onHandText);



    const missing = computeMissingIngredients(scaled, haveInventory);



    const newLines: CartLine[] = missing.map(ing => ({



      id: uid(),



      name: ing.name,



      qty: ing.qty,



      measure: ing.measure,



      estPrice: +(linePrice(ing)).toFixed(2),



      section: 'meal',



    }));



    if (newLines.length > 0) setCartMeal(prev => mergeCartLines([...prev, ...newLines]));



    setMenus(prev => prev.map(m => (m.id === menu.id ? { ...m, approved: true } : m)));



  }







  function submitFeedback(menu: MenuItem, feedback: string) {



    setMenus(prev =>



      prev.map(m =>



        m.id === menu.id ? { ...m, feedback, title: `${m.title} — Chef's Twist`, description: `Updated per your note: ${feedback}` } : m



      )



    );



  }



  function adjustMenuPortions(menuId: string, delta: number) {



    setMenus(prev => prev.map(m => (m.id === menuId ? { ...m, portions: Math.max(1, m.portions + delta) } : m)));



  }



  function clearMealCart() {



    setCartMeal([]);



  }



  function removeMealLine(id: string) {



    setCartMeal(prev => prev.filter(line => line.id !== id));



  }



  function openMenuDetails(menu: MenuItem) {



    setSelectedMenu(menu);



  }



  function closeMenuDetails() {



    setSelectedMenu(null);



  }



  function addExtraItem(name: string, qty: number, measure: Measure, estPrice: number) {



    const line: CartLine = { id: uid(), name, qty, measure, estPrice, section: 'extra' };



    setCartExtra(prev => [...prev, line]);



  }



  function openInstacart() { window.open('https://www.instacart.com', '_blank'); }



  function withinBudget(): boolean {



    if (weekly.budgetType === 'none' || !weekly.budgetValue) return true;



    if (weekly.budgetType === 'perWeek') return grandTotal <= weekly.budgetValue + 0.01;



    if (weekly.budgetType === 'perMeal') {



      const approvedCount = menus.filter(m => m.approved).length || 1;



      return totalMeal <= weekly.budgetValue * approvedCount + 0.01;



    }



    return true;



  }



  function handleImageToDataUrl(file: File, setter: (v?: string) => void) {



    const reader = new FileReader();



    reader.onload = () => setter(reader.result as string);



    reader.readAsDataURL(file);



  }



  function submitOnHandImage() {



    setWeekly(prev => ({ ...prev, onHandImageDataUrl: onHandPreview }));



    const add = (prevOnHand: string) => (prevOnHand ? prevOnHand + ', ' : '') + '2 lb chicken thighs, 1 lemon, 8 oz spinach';



    setWeekly(prev => ({ ...prev, onHandText: add(prev.onHandText) }));



    setOnHandPreview(undefined);



  }



  function addPantryManual(name: string, qty: number | null, measure: Measure | null, type?: string) {



    const item: PantryItem = { id: uid(), name, qty, measure, staple: qty === null && measure === null, active: true, updatedAt: now(), type };



    setPantry(prev => [item, ...prev]);



  }



  function submitPantryImage() {



    addPantryManual('Canned tomatoes', 14, 'oz', 'canned');



    addPantryManual('Chili crisp', 6, 'oz', 'condiment');



    setPantryPreview(undefined);



  }



  function reorderPantryStaple(name: string) { addExtraItem(name, 1, 'count', 4.99); }



  function startEditPantryItem(item: PantryItem) {



    setEditingPantryItem(item.id);



    setEditForm({ name: item.name, qty: item.qty !== null ? String(item.qty) : '', measure: item.measure });



  }



  function saveEditPantryItem(id: string) {



    const qty = editForm.qty.trim() === '' ? null : Math.max(0, toNumber(editForm.qty, 0));



    const measure = editForm.qty.trim() === '' ? null : editForm.measure;



    setPantry(prev => prev.map(p => (p.id === id ? { ...p, name: editForm.name, qty, measure, updatedAt: now() } : p)));



    setEditingPantryItem(null);



  }



  function startEditBarItem(item: BarItem) {



    setEditingBarItem(item.id);



    setBarEditForm({ name: item.name, qty: String(item.qty), measure: item.measure, type: item.type });



  }



  function saveEditBarItem(id: string) {



    const qty = Math.max(0, toNumber(barEditForm.qty, 0));



    const perishable = barEditForm.type === 'produce' || barEditForm.type === 'herb';



    setBar(prev =>



      prev.map(b =>



        b.id === id



          ? { ...b, name: barEditForm.name, qty, measure: barEditForm.measure, type: barEditForm.type, perishable, updatedAt: now() }



          : b



      )



    );



    setEditingBarItem(null);



  }



  function addBarManual(name: string, qty: number, measure: Measure, type: BarItem['type']) {



    const perishable = type === 'produce' || type === 'herb';



    const item: BarItem = { id: uid(), name, qty, measure, type, active: true, perishable, updatedAt: now() };



    setBar(prev => [item, ...prev]);



  }



  function submitBarImage() {



    addBarManual('Lime', 6, 'count', 'produce');



    addBarManual('Simple syrup', 8, 'oz', 'mixer');



    setBarPreview(undefined);



  }



  function createMocktail() { setBeverageRecipe(generateBeverageRecipe(bar, 'mocktail')); }



  function createCocktail() { setBeverageRecipe(generateBeverageRecipe(bar, 'cocktail')); }







  // Build payload for n8n



  const ic_basic = load<BasicInformation | null>(LS.IC_BASIC, null);



  const ic_house = load<HouseholdSetup | null>(LS.IC_HOUSE, null);



  const ic_cook  = load<CookingPreferences | null>(LS.IC_COOK, null);



  const ic_diet  = load<DietaryProfile | null>(LS.IC_DIET, null);



  const ic_shop  = load<ShoppingPreferences | null>(LS.IC_SHOP, null);







  const basicInformation: BasicInformation = ic_basic ?? { firstName: '', lastName: '', email: '', accountAddress: { street: '', city: '', state: '', zipcode: '' } };



  const householdSetup: HouseholdSetup = ic_house ?? { adults: 0, teens: 0, children: 0, toddlersInfants: 0, portionsPerDinner: profile.portionDefault ?? 1, dinnersPerWeek: weekly.dinners ?? undefined };



  const cookingPreferences: CookingPreferences = ic_cook ?? { cookingSkill: 'Beginner', cookingTimePreference: '30 min', equipment: [] };



  const dietaryProfile: DietaryProfile = ic_diet ?? { allergiesRestrictions: [], dislikesAvoidList: [], dietaryPrograms: [], notes: undefined };



  const shoppingPreferences: ShoppingPreferences = ic_shop ?? { storesNearMe: [], preferredGroceryStore: profile.store ?? '', preferOrganic: 'I dont care', preferNationalBrands: 'No preference' };







  const client: ClientPayload = {



    basicInformation,



    householdSetup,



    cookingPreferences,



    dietaryProfile,



    shoppingPreferences,



    extra: {



      weeklyMood: weekly.mood,



      weeklyExtras: weekly.extras,



      weeklyOnHandText: weekly.onHandText,   // Auto-built from the 3-box rows



      pantrySnapshot: pantry,



      barSnapshot: bar,



      currentMenusCount: menus?.length ?? 0,



    },



  };







  const bgStyle = { backgroundImage: 'url(/hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' } as const;







  function handleOrderSubmitted(order: { id: string; correlation_id: string }) {



    setMenus([]); resetCart();



    try {



      localStorage.removeItem(LS.MENUS);



      localStorage.removeItem(LS.CART_MEAL);



      localStorage.removeItem(LS.CART_EXTRA);



    } catch {}



    setWatchOrderId(order.id);



    setCurrentOrder(order);



  }







  // helpers for the on-hand rows UI



  const updateOnHand = (idx: number, patch: Partial<OnHandItem>) =>



    setOnHandItems(rows => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));



  const addOnHandRow = () => setOnHandItems(r => [...r, { qty: '', name: '', notes: '' }]);



  const removeOnHandRow = (idx: number) => setOnHandItems(r => r.filter((_, i) => i !== idx));







  return (



    <>



    <div className="min-h-screen" style={bgStyle}>



      <div className="min-h-screen bg-white/80 backdrop-blur-sm">



        <header className="h-16 border-b bg-white/90 sticky top-0 z-50">



          <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">



            <div className="flex items-center gap-2">



              <img src="/logo.png" alt="Instantly Chef" width="36" height="36" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />



              <a href="/" className="font-bold text-xl">Instantly Chef</a>



            </div>







            <div className="flex items-center gap-2">



              {plan === 'trial' && (



                <a href="/checkout" className="hidden md:inline-block text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">



                  You are on a free trial. Upgrade anytime →



                </a>



              )}



              <button onClick={() => setAccountOpen(v => !v)} className="px-3 py-2 rounded border bg-white hover:bg-gray-50">



                {userEmail ?? 'Account'} ▾



              </button>



              <button onClick={resetAll} className="px-3 py-2 rounded border bg-white hover:bg-gray-50" title="Dev Reset (clears localStorage)">



                Reset



              </button>



              {accountOpen && (



                <div className="absolute right-4 top-14 w-64 bg-white border rounded shadow-lg">



                  <a href="/account?edit=1" className="block px-4 py-2 hover:bg-gray-50">Account Profile</a>



                  <a href="/checkout" className="block px-4 py-2 hover:bg-gray-50">Subscriptions & Billing</a>



                  <button onClick={signOut} className="w-full text-left px-4 py-2 hover:bg-gray-50">Sign out</button>



                </div>



              )}



            </div>



          </div>



        </header>







        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">



          <section className="lg:col-span-3 space-y-6">



            <div className="bg-white rounded-2xl shadow p-6">



              <h2 className="text-xl font-bold mb-4">Weekly Menu Planning</h2>







              <div className="grid md:grid-cols-3 gap-4">



                <div>



                  <label className="block text-sm font-medium">Portions per Dinner</label>



                  <div className="flex items-center gap-2 mt-1">



                    <button className="px-2 py-1 border rounded" onClick={() => setProfile(p => ({ ...p, portionDefault: Math.max(1, p.portionDefault - 1) }))}>-</button>



                    <input type="number" className="w-20 border rounded px-2 py-1 text-center" value={profile.portionDefault} onChange={(e) => setProfile(p => ({ ...p, portionDefault: Math.max(1, toNumber(e.target.value, p.portionDefault)) }))} />



                    <button className="px-2 py-1 border rounded" onClick={() => setProfile(p => ({ ...p, portionDefault: p.portionDefault + 1 }))}>+</button>



                  </div>



                </div>







                <div>



                  <label className="block text-sm font-medium">Grocery Store</label>



                  <input className="w-full border rounded px-3 py-2 mt-1" value={profile.store} onChange={(e) => setProfile(p => ({ ...p, store: e.target.value }))} placeholder="e.g., Kroger" />



                </div>







                <div>



                  <label className="block text-sm font-medium">Dinners Needed This Week</label>



                  <input type="number" className="w-full border rounded px-3 py-2 mt-1" value={weekly.dinners} onChange={(e) => setWeekly(w => ({ ...w, dinners: Math.max(1, toNumber(e.target.value, w.dinners)) }))} />



                </div>



              </div>







              <div className="grid md:grid-cols-3 gap-4 mt-4">



                <div>



                  <label className="block text-sm font-medium">Budget Type</label>



                  <select className="w-full border rounded px-3 py-2 mt-1" value={weekly.budgetType} onChange={(e) => setWeekly(w => ({ ...w, budgetType: e.target.value as Weekly['budgetType'] }))}>



                    <option value="none">No budget</option>



                    <option value="perWeek">Per week ($)</option>



                    <option value="perMeal">Per meal ($)</option>



                  </select>



                </div>



                <div>



                  <label className="block text-sm font-medium">Budget Value</label>



                  <input type="number" className="w-full border rounded px-3 py-2 mt-1" value={weekly.budgetValue ?? ''} onChange={(e) => setWeekly(w => ({ ...w, budgetValue: e.target.value === '' ? undefined : Math.max(0, toNumber(e.target.value, w.budgetValue ?? 0)) }))} placeholder="e.g., 150" />



                </div>



                <div className="flex items-end">



                  <p className="text-xs text-gray-600">Specify weekly $ or per-meal $. Leave blank to skip.</p>



                </div>



              </div>







              {/* === REPLACED TEXTAREA WITH 3-BOX ROWS === */}



              <div className="mt-4">



                <label className="block text-sm font-medium">



                  Do you have any ingredients on hand that you would like us to use in menu planning for this week?



                </label>







                <div className="mt-2 space-y-2">



                  {onHandItems.map((row, idx) => (



                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">



                      <input



                        className="col-span-2 border rounded px-2 py-2"



                        placeholder="Qty"



                        value={row.qty}



                        onChange={(e) => updateOnHand(idx, { qty: e.target.value })}



                      />



                      <input



                        className="col-span-5 border rounded px-2 py-2"



                        placeholder="Item name (e.g., roma tomatoes)"



                        value={row.name}



                        onChange={(e) => updateOnHand(idx, { name: e.target.value })}



                      />



                      <input



                        className="col-span-4 border rounded px-2 py-2"



                        placeholder="Notes (e.g., use full amount this week?)"



                        value={row.notes}



                        onChange={(e) => updateOnHand(idx, { notes: e.target.value })}



                      />



                      <button



                        className="col-span-1 text-xs px-2 py-2 border rounded bg-white hover:bg-gray-50"



                        onClick={() => removeOnHandRow(idx)}



                        title="Remove row"



                      >



                        Remove



                      </button>



                    </div>



                  ))}







                  <div className="flex gap-2 pt-1">



                    <button className="px-3 py-2 rounded border bg-white hover:bg-gray-50" onClick={addOnHandRow}>+ Add item</button>



                    <button className="px-3 py-2 rounded border bg-white hover:bg-gray-50" onClick={() => setOnHandItems([{ qty: '', name: '', notes: '' }])}>Clear</button>



                  </div>



                </div>







                {/* Camera section kept below the rows */}



                <div className="flex items-center gap-3 mt-3">



                  <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50">



                    📷 Camera



                    <input



                      type="file"



                      accept="image/*"



                      capture="environment"



                      className="hidden"



                      onChange={(e) => {



                        const file = e.target.files?.[0];



                        if (file) handleImageToDataUrl(file, setOnHandPreview);



                      }}



                    />



                  </label>



                  {onHandPreview && (



                    <div className="flex items-center gap-3">



                      <img src={onHandPreview} alt="On hand preview" width="64" height="64" className="rounded object-cover" />



                      <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={submitOnHandImage}>Submit</button>



                      <button className="px-3 py-2 rounded border bg-white" onClick={() => setOnHandPreview(undefined)}>Retake</button>



                    </div>



                  )}



                </div>



              </div>



              {/* === END 3-BOX ROWS === */}







              <div className="mt-4">



                <label className="block text-sm font-medium">What are you in the mood for this week?</label>



                <input className="w-full border rounded px-3 py-2 mt-1" value={weekly.mood} onChange={(e) => setWeekly(w => ({ ...w, mood: e.target.value }))} />



              </div>







              <div className="mt-4">



                <label className="block text-sm font-medium">Anything else to see on the menu? (Italian, Ribeye, Pad Thai, etc.)</label>



                <input className="w-full border rounded px-3 py-2 mt-1" value={weekly.extras} onChange={(e) => setWeekly(w => ({ ...w, extras: e.target.value }))} />



              </div>







              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">



                <div>



                  <N8NGenerate



                    client={client}



                    weekly={{



                      mood: weekly.mood,



                      extras: weekly.extras,



                      onHandText: weekly.onHandText,          // built from rows



                      pantrySnapshot: pantry,



                      barSnapshot: bar,



                      currentMenusCount: menus?.length ?? 0,



                      budgetType: weekly.budgetType,



                      budgetValue: weekly.budgetValue ?? null



                    }}



                    onSubmitted={handleOrderSubmitted}



                  />



                </div>



              </div>



            </div>







            <div className="bg-white rounded-2xl shadow p-6">



              <h2 className="text-xl font-bold mb-4">Menus</h2>



              <div className="grid md:grid-cols-2 gap-6">



                {menus.map(menu => (



                  <div



                    key={menu.id}



                    className="border rounded-xl overflow-hidden hover:shadow-lg transition cursor-pointer"



                    onClick={() => openMenuDetails(menu)}



                    role="button"



                    tabIndex={0}



                  >



                    <div className="relative h-40 w-full bg-gray-100">



                      <img src={menu.hero} alt={menu.title} className="w-full h-full object-cover" />



                    </div>



                    <div className="p-4 space-y-2">



                      <h3 className="font-semibold">{menu.title}</h3>



                      <p className="text-sm text-gray-600">{menu.description}</p>







                      <div className="flex items-center gap-2 pt-2">



                        <span className="text-sm text-gray-700">Portions:</span>



                        <button



                          type="button"



                          className="px-2 py-1 border rounded"



                          onClick={(e) => { e.stopPropagation(); adjustMenuPortions(menu.id, -1); }}



                        >



                          -



                        </button>



                        <span className="w-10 text-center">{menu.portions}</span>



                        <button



                          type="button"



                          className="px-2 py-1 border rounded"



                          onClick={(e) => { e.stopPropagation(); adjustMenuPortions(menu.id, +1); }}



                        >



                          +



                        </button>



                      </div>







                      {!menu.approved ? (



                        <div className="flex items-center gap-3 pt-3">



                          <button



                            type="button"



                            className="px-4 py-2 rounded bg-green-600 text-white"



                            onClick={(e) => { e.stopPropagation(); approveMenu(menu); }}



                          >



                            Approve



                          </button>



                          <details className="w-full" onClick={(e) => e.stopPropagation()}>



                            <summary className="cursor-pointer text-sm text-gray-700">Suggest a change</summary>



                            <FeedbackForm onSubmit={(text) => submitFeedback(menu, text)} />



                          </details>



                        </div>



                      ) : (



                                                <p className="text-green-700 font-medium pt-2" onClick={(e) => e.stopPropagation()}>



                          Approved and added to cart ✔️



                        </p>



                      )}



                    </div>



                  </div>



                ))}



                {menus.length === 0 && <div className="text-sm text-gray-600">Generate a menu to see proposals here.</div>}



              </div>



            </div>







            <div className="bg-white rounded-2xl shadow p-6">



              <h2 className="text-xl font-bold mb-4">Shopping Basket</h2>



              <div className="space-y-4">



                <div className="rounded-lg border p-4 bg-gray-50">



                  <p className="text-sm">Meal Ingredients Subtotal: <span className="font-semibold">${totalMeal.toFixed(2)}</span></p>



                  <p className="text-sm">Additional Items Subtotal: <span className="font-semibold">${totalExtra.toFixed(2)}</span></p>



                  <p className="text-lg">Total: <span className="font-bold">${grandTotal.toFixed(2)}</span></p>



                </div>







                {withinBudget() ? (



                  <div className="p-4 rounded bg-green-50 border border-green-200 text-green-800 text-sm">



                    ✔️ Within your budgeting logic. You're good to proceed.



                  </div>



                ) : (



                  <div className="p-4 rounded bg-red-50 border border-red-200 text-red-800 text-sm space-y-2">



                    <p>⚠️ This exceeds your budgeting logic.</p>



                    <div className="flex flex-wrap gap-2">



                      <button className="px-3 py-2 rounded border bg-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>



                        Tweak Menus



                      </button>



                      <button className="px-3 py-2 rounded bg-yellow-500 text-white" onClick={() => alert('Budget adjusted for this session.')}>



                        Approve Higher Budget



                      </button>



                    </div>



                  </div>



                )}







                <AddExtraItem onAdd={(n, q, m, p) => addExtraItem(n, q, m, p)} />







                <CartSection



                  title="Meal Ingredients"



                  lines={cartMeal}



                  onClear={clearMealCart}



                  onRemove={removeMealLine}



                />



                <CartSection title="Additional Items" lines={cartExtra} />







                <div className="pt-2">



                  <button className="px-5 py-3 rounded bg-emerald-600 text-white" onClick={openInstacart}>



                    Go to Instacart Checkout →



                  </button>



                </div>



              </div>



            </div>



          </section>







          <aside className="lg:col-span-1 space-y-6">



            <div className="bg-white rounded-2xl shadow p-6">



              <h3 className="font-bold mb-3">Pantry Tracker</h3>







              <div className="space-y-2 mb-4">



                {pantry.filter(p => p.staple).map(s => (



                  <div key={s.id} className="flex items-center justify-between">



                    <span>{s.name}</span>



                    <button className="text-sm px-2 py-1 rounded border" onClick={() => reorderPantryStaple(s.name)}>



                      Reorder



                    </button>



                  </div>



                ))}



              </div>







              <PantryAddForm onAdd={(n, q, m, t) => addPantryManual(n, q, m, t)} />







              <div className="mt-3">



                <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50 inline-block">



                  📷 Camera



                  <input



                    type="file"



                    accept="image/*"



                    capture="environment"



                    className="hidden"



                    onChange={(e) => {



                      const file = e.target.files?.[0];



                      if (file) handleImageToDataUrl(file, setPantryPreview);



                    }}



                  />



                </label>



                {pantryPreview && (



                  <div className="flex items-center gap-3 mt-2">



                    <img src={pantryPreview} alt="Pantry preview" width="64" height="64" className="rounded object-cover" />



                    <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={submitPantryImage}>Submit</button>



                    <button className="px-3 py-2 rounded border bg-white" onClick={() => setPantryPreview(undefined)}>Retake</button>



                  </div>



                )}



              </div>







              <div className="mt-4">



                <h4 className="text-sm font-semibold mb-2">Inventory</h4>



                <div className="space-y-2 max-h-64 overflow-auto pr-1">



                  {pantry.filter(p => !p.staple).map(item => (



                    <div key={item.id} className="flex items-center justify-between border rounded px-2 py-1">



                      {editingPantryItem === item.id ? (



                        <div className="flex-1 space-y-2">



                          <input className="w-full border rounded px-2 py-1 text-sm" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />



                          <div className="flex gap-2">



                            <input className="w-16 border rounded px-2 py-1 text-sm" value={editForm.qty} onChange={(e) => setEditForm(f => ({ ...f, qty: e.target.value }))} placeholder="Qty" />



                            <select className="border rounded px-2 py-1 text-sm" value={editForm.measure || 'oz'} onChange={(e) => setEditForm(f => ({ ...f, measure: e.target.value as Measure }))}>



                              <option value="oz">oz</option>



                              <option value="lb">lb</option>



                              <option value="ml">ml</option>



                              <option value="g">g</option>



                              <option value="kg">kg</option>



                              <option value="count">count</option>



                            </select>



                          </div>



                          <div className="flex gap-2">



                            <button className="text-xs px-2 py-1 bg-green-600 text-white rounded" onClick={() => saveEditPantryItem(item.id)}>Save</button>



                            <button className="text-xs px-2 py-1 border rounded" onClick={() => setEditingPantryItem(null)}>Cancel</button>



                          </div>



                        </div>



                      ) : (



                        <>



                          <div className="flex-1">



                            <div className="font-medium">{item.name}</div>



                            <div className="text-xs text-gray-600">



                              {item.qty !== null ? `${item.qty} ${item.measure}` : 'Staple'}



                              {item.active ? ' · Active' : ' · Out of stock'}



                            </div>



                          </div>



                          <div className="flex items-center gap-2">



                            <button className="text-xs px-2 py-1 border rounded" onClick={() => startEditPantryItem(item)} title="Edit">✏️</button>



                            <button className="text-xs px-2 py-1 border rounded" onClick={() => setPantry(prev => prev.filter(p => p.id !== item.id))}>Remove</button>



                          </div>



                        </>



                      )}



                    </div>



                  ))}



                  {pantry.filter(p => !p.staple).length === 0 && <p className="text-xs text-gray-500">No non-staple items yet.</p>}



                </div>



              </div>



            </div>







            <div className="bg-white rounded-2xl shadow p-6">



              <h3 className="font-bold mb-3">Beverage Bar & Mixology Cabinet</h3>







              <BarAddForm onAdd={(n, q, m, t) => addBarManual(n, q, m, t)} />







              <div className="mt-3">



                <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50 inline-block">



                  📷 Camera



                  <input



                    type="file"



                    accept="image/*"



                    capture="environment"



                    className="hidden"



                    onChange={(e) => {



                      const file = e.target.files?.[0];



                      if (file) handleImageToDataUrl(file, setBarPreview);



                    }}



                  />



                </label>



                {barPreview && (



                  <div className="flex items-center gap-3 mt-2">



                    <img src={barPreview} alt="Bar preview" width="64" height="64" className="rounded object-cover" />



                    <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={submitBarImage}>Submit</button>



                    <button className="px-3 py-2 rounded border bg-white" onClick={() => setBarPreview(undefined)}>Retake</button>



                  </div>



                )}



              </div>







              <div className="mt-4">



                <h4 className="text-sm font-semibold mb-2">Inventory</h4>



                <div className="space-y-2 max-h-64 overflow-auto pr-1">



                  {bar.map(item => {



                    const isEditing = editingBarItem === item.id;



                    return (



                      <div key={item.id} className={`border rounded px-2 py-2 ${!item.active ? 'opacity-60' : ''}`}>



                        {isEditing ? (



                          <div className="space-y-2">



                            <input



                              className="w-full border rounded px-2 py-1 text-sm"



                              value={barEditForm.name}



                              onChange={e => setBarEditForm(f => ({ ...f, name: e.target.value }))}



                              placeholder="Item name"



                            />



                            <div className="grid grid-cols-3 gap-2">



                              <input



                                type="number"



                                className="border rounded px-2 py-1 text-sm"



                                value={barEditForm.qty}



                                onChange={e => setBarEditForm(f => ({ ...f, qty: e.target.value }))}



                                min={0}



                              />



                              <select



                                className="border rounded px-2 py-1 text-sm"



                                value={barEditForm.measure}



                                onChange={e => setBarEditForm(f => ({ ...f, measure: e.target.value as Measure }))}



                              >



                                <option value="oz">oz</option>



                                <option value="lb">lb</option>



                                <option value="ml">ml</option>



                                <option value="g">g</option>



                                <option value="kg">kg</option>



                                <option value="count">count</option>



                              </select>



                              <select



                                className="border rounded px-2 py-1 text-sm"



                                value={barEditForm.type}



                                onChange={e => setBarEditForm(f => ({ ...f, type: e.target.value as BarItem['type'] }))}



                              >



                                <option value="spirit">spirit</option>



                                <option value="mixer">mixer</option>



                                <option value="produce">produce</option>



                                <option value="herb">herb</option>



                                <option value="other">other</option>



                              </select>



                            </div>



                            <div className="flex gap-2">



                              <button className="text-xs px-2 py-1 bg-green-600 text-white rounded" onClick={() => saveEditBarItem(item.id)}>



                                Save



                              </button>



                              <button className="text-xs px-2 py-1 border rounded" onClick={() => setEditingBarItem(null)}>



                                Cancel



                              </button>



                            </div>



                          </div>



                        ) : (



                          <div className="flex items-center justify-between gap-3">



                            <div className="flex-1">



                              <div className="font-medium">{item.name}</div>



                              <div className="text-xs text-gray-600">



                                {item.qty} {item.measure} - {item.type}



                                {item.perishable ? ' · perishable' : ''}



                                {item.active ? ' · Active' : ' · Inactive'}



                              </div>



                            </div>



                            <div className="flex items-center gap-2">



                              <button



                                className="text-xs px-2 py-1 border rounded bg-orange-50 text-orange-700"



                                onClick={() => startEditBarItem(item)}



                                title="Edit item"



                                aria-label={`Edit ${item.name}`}



                              >



                                ✏️



                              </button>



                              <button



                                className="text-xs px-2 py-1 border rounded"



                                onClick={() => setBar(prev => prev.filter(b => b.id !== item.id))}



                              >



                                Remove



                              </button>



                            </div>



                          </div>



                        )}



                      </div>



                    );



                  })}



                </div>



              </div>







              <div className="mt-4 flex gap-2">



                <button className="flex-1 px-3 py-2 rounded bg-pink-500 text-white" onClick={() => setBeverageRecipe(generateBeverageRecipe(bar, 'mocktail'))}>Create Mocktail</button>



                <button className="flex-1 px-3 py-2 rounded bg-purple-600 text-white" onClick={() => setBeverageRecipe(generateBeverageRecipe(bar, 'cocktail'))}>Create Cocktail</button>



              </div>







              {beverageRecipe && (



                <div className="mt-4 border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-pink-50">



                  <h4 className="font-bold text-lg mb-2">{beverageRecipe.name}</h4>



                  <div className="relative h-48 w-full mb-3 rounded overflow-hidden">



                    <img src={beverageRecipe.imageUrl} alt={beverageRecipe.name} className="w-full h-full object-cover" />



                  </div>



                  <div className="mb-3">



                    <h5 className="font-semibold text-sm mb-1">Ingredients:</h5>



                    <ul className="text-sm space-y-1">



                      {beverageRecipe.ingredients.map((ing, idx) => (



                        <li key={idx}>• {ing.qty} {ing.measure} {ing.name}</li>



                      ))}



                    </ul>



                  </div>



                  <div>



                    <h5 className="font-semibold text-sm mb-1">Instructions:</h5>



                    <ol className="text-sm space-y-1 list-decimal list-inside">



                      {beverageRecipe.instructions.map((step, idx) => <li key={idx}>{step}</li>)}



                    </ol>



                  </div>



                </div>



              )}



            </div>



          </aside>



        </main>



      </div>



    </div>







    {selectedMenu && (



      <MenuDetailModal



        menu={selectedMenu}



        onClose={closeMenuDetails}



      />



    )}



    </>



  );



}







function MenuDetailModal({ menu, onClose }: { menu: MenuItem; onClose: () => void }) {

  const scaled = scaleIngredients(menu.ingredients ?? [], menu.portions ?? 2);

  const instructions = getMenuInstructions(menu);

  const scaledSides = (menu.sides ?? []).map((side, idx) => ({

    ...side,

    title: side?.title?.trim() || `Side ${idx + 1}`,

    ingredients: scaleIngredients(side?.ingredients ?? [], menu.portions ?? 2),

    steps: Array.isArray(side?.steps) ? side.steps : [],

  }));



  return (

    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4 py-6" onClick={onClose}>

      <div className="relative max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <button

          type="button"

          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/70 text-white text-lg"

          onClick={onClose}

          aria-label="Close recipe dialog"

        >

          ×

        </button>



        <div className="h-64 w-full bg-gray-100">

          <img src={menu.hero} alt={menu.title} className="w-full h-full object-cover" />

        </div>



        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          <div>

            <h2 className="text-2xl font-bold">{menu.title}</h2>

            <p className="text-gray-600 mt-1">{menu.description}</p>

          </div>



          <div className="grid md:grid-cols-2 gap-6">

            <div>

              <h3 className="text-lg font-semibold mb-2">Ingredients</h3>

              {scaled.length ? (

                <ul className="space-y-1 text-sm">

                  {scaled.map((ing, idx) => (

                    <li key={`${ing.name}-${idx}`} className="flex items-center justify-between border-b py-1">

                      <span>{ing.name}</span>

                      <span className="text-gray-500">{ing.qty} {ing.measure}</span>

                    </li>

                  ))}

                </ul>

              ) : (

                <p className="text-sm text-gray-500">No ingredients listed for this menu.</p>

              )}

            </div>



            <div>

              <h3 className="text-lg font-semibold mb-2">Instructions</h3>

              <ol className="text-sm space-y-2 list-decimal list-inside">

                {instructions.map((step, idx) => (

                  <li key={idx}>{step}</li>

                ))}

              </ol>

            </div>

          </div>



          {scaledSides.length > 0 && (

            <div className="space-y-4 pt-2">

              <h3 className="text-lg font-semibold">Sides</h3>

              {scaledSides.map((side, idx) => (

                <div key={`${side.title}-${idx}`} className="border rounded-2xl p-4 space-y-4">

                  <div>

                    <h4 className="font-semibold text-base">{side.title || `Side ${idx + 1}`}</h4>

                    <p className="text-sm text-gray-500">{`Serves ${menu.portions ?? 2}`}</p>

                  </div>

                  <div className="grid md:grid-cols-2 gap-4">

                    <div>

                      <h5 className="text-sm font-semibold mb-1">Ingredients</h5>

                      {side.ingredients.length ? (

                        <ul className="text-sm space-y-1">

                          {side.ingredients.map((ing, ingIdx) => (

                            <li key={`${side.title}-${ing.name}-${ingIdx}`} className="flex items-center justify-between border-b py-1">

                              <span>{ing.name}</span>

                              <span className="text-gray-500">{ing.qty} {ing.measure}</span>

                            </li>

                          ))}

                        </ul>

                      ) : (

                        <p className="text-xs text-gray-500">No ingredients listed.</p>

                      )}

                    </div>

                    <div>

                      <h5 className="text-sm font-semibold mb-1">Steps</h5>

                      {side.steps.length ? (

                        <ol className="text-sm space-y-1 list-decimal list-inside">

                          {side.steps.map((step, stepIdx) => (

                            <li key={`${side.title}-step-${stepIdx}`}>{step}</li>

                          ))}

                        </ol>

                      ) : (

                        <p className="text-xs text-gray-500">No steps included.</p>

                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}





/* -------------------- Small components -------------------- */







function FeedbackForm({ onSubmit }: { onSubmit: (text: string) => void }) {



  const [text, setText] = useState('');



  return (



    <div className="mt-2 border rounded p-3">



      <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder="Tell us what you'd like instead..." value={text} onChange={(e) => setText(e.target.value)} />



      <div className="mt-2 flex justify-end">



        <button



          className="px-3 py-2 rounded bg-blue-600 text-white"



          onClick={() => { if (text.trim()) onSubmit(text.trim()); setText(''); }}



        >



          Submit Feedback



        </button>



      </div>



    </div>



  );



}







function AddExtraItem({ onAdd }: { onAdd: (name: string, qty: number, measure: Measure, price: number) => void }) {



  const [name, setName] = useState('');



  const [qty, setQty] = useState<number>(1);



  const [measure, setMeasure] = useState<Measure>('count');



  const [price, setPrice] = useState<number>(1.99);







  return (



    <div className="border rounded p-4 bg-white">



      <h4 className="font-semibold mb-2">Add Item to Grocery List</h4>



      <div className="grid md:grid-cols-4 gap-2">



        <input className="border rounded px-3 py-2" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />



        <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={qty} onChange={(e) => setQty(Math.max(1, toNumber(e.target.value, 1)))} />



        <select className="border rounded px-3 py-2" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>



          <option value="count">count</option>



          <option value="oz">oz</option>



          <option value="lb">lb</option>



          <option value="ml">ml</option>



          <option value="g">g</option>



          <option value="kg">kg</option>



        </select>



        <input type="number" className="border rounded px-3 py-2" placeholder="Est. Price ($)" value={price} onChange={(e) => setPrice(Math.max(0, toNumber(e.target.value, 0)))} />



      </div>



      <div className="mt-2 flex justify-end">



        <button



          className="px-4 py-2 rounded bg-indigo-600 text-white"



          onClick={() => {



            if (!name.trim()) return;



            onAdd(name.trim(), qty, measure, +price.toFixed(2));



            setName(''); setQty(1); setMeasure('count'); setPrice(1.99);



          }}



        >



          Add



        </button>



      </div>



    </div>



  );



}







function CartSection({



  title,



  lines,



  onClear,



  onRemove,



}: {



  title: string;



  lines: CartLine[];



  onClear?: () => void;



  onRemove?: (id: string) => void;



}) {



  const subtotal = lines.reduce((a, c) => a + c.estPrice, 0);



  return (



    <div className="border rounded p-4 bg-white">



      <h4 className="font-semibold mb-2">{title}</h4>



      <div className="space-y-2 max-h-60 overflow-auto pr-1">



        {lines.map(l => (



          <div key={l.id} className="flex items-center justify-between border rounded px-2 py-1 gap-3">



            <div className="flex-1">



              <div className="font-medium">{l.name}</div>



              <div className="text-xs text-gray-600">{l.qty} {l.measure}</div>



            </div>



            <div className="flex items-center gap-2">



              <div className="font-medium">${l.estPrice.toFixed(2)}</div>



              {onRemove && (



                <button



                  type="button"



                  className="text-xs px-2 py-1 rounded border text-gray-600 hover:bg-gray-100"



                  onClick={() => onRemove(l.id)}



                  aria-label={`Remove ${l.name}`}



                >



                  Delete



                </button>



              )}



            </div>



          </div>



        ))}



        {lines.length === 0 && <p className="text-xs text-gray-500">No items yet.</p>}



      </div>



      <div className="mt-2 flex items-center justify-between text-sm">



        <span>



          Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>



        </span>



        {onClear && (



          <button



            type="button"



            className="text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700 disabled:opacity-40"



            onClick={onClear}



            disabled={lines.length === 0}



          >



            Clear



          </button>



        )}



      </div>



    </div>



  );



}







function PantryAddForm({ onAdd }: { onAdd: (name: string, qty: number | null, measure: Measure | null, type?: string) => void }) {



  const [name, setName] = useState('');



  const [qty, setQty] = useState<string>('');



  const [measure, setMeasure] = useState<Measure>('oz');



  const [type, setType] = useState<string>('other');







  return (



    <div className="border rounded p-3 bg-white">



      <h4 className="text-sm font-semibold mb-2">+ Add Pantry Item</h4>



      <div className="grid grid-cols-2 gap-2">



        <input className="border rounded px-2 py-1" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />



        <select className="border rounded px-2 py-1" value={type} onChange={(e) => setType(e.target.value)}>



          <option value="spice">spice</option>



          <option value="condiment">condiment</option>



          <option value="oil">oil</option>



          <option value="canned">canned</option>



          <option value="other">other</option>



        </select>



        <input className="border rounded px-2 py-1" placeholder="Qty (blank = staple-like)" value={qty} onChange={(e) => setQty(e.target.value)} />



        <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>



          <option value="oz">oz</option>



          <option value="lb">lb</option>



          <option value="ml">ml</option>



          <option value="g">g</option>



          <option value="kg">kg</option>



          <option value="count">count</option>



        </select>



      </div>



      <div className="mt-2 flex justify-end">



        <button



          className="px-3 py-2 rounded bg-gray-800 text-white text-sm"



          onClick={() => {



            if (!name.trim()) return;



            const q = qty.trim() === '' ? null : Math.max(0, toNumber(qty, 0));



            const m = qty.trim() === '' ? null : measure;



            onAdd(name.trim(), q, m, type);



            setName(''); setQty(''); setType('other'); setMeasure('oz');



          }}



        >



          Add



        </button>



      </div>



    </div>



  );



}







function BarAddForm({ onAdd }: { onAdd: (name: string, qty: number, measure: Measure, type: 'spirit' | 'mixer' | 'produce' | 'herb' | 'other') => void }) {



  const [name, setName] = useState('');



  const [qty, setQty] = useState<number>(1);



  const [measure, setMeasure] = useState<Measure>('oz');



  const [type, setType] = useState<'spirit' | 'mixer' | 'produce' | 'herb' | 'other'>('spirit');







  return (



    <div className="border rounded p-3 bg-white">



      <h4 className="text-sm font-semibold mb-2">+ Add Bar Item</h4>



      <div className="grid grid-cols-2 gap-2">



        <input className="border rounded px-2 py-1" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />



        <select className="border rounded px-2 py-1" value={type} onChange={(e) => setType(e.target.value as any)}>



          <option value="spirit">spirit</option>



          <option value="mixer">mixer</option>



          <option value="produce">produce</option>



          <option value="herb">herb</option>



          <option value="other">other</option>



        </select>



        <input type="number" className="border rounded px-2 py-1" placeholder="Qty" value={qty} onChange={(e) => setQty(Math.max(0, toNumber(e.target.value, 0)))} />



        <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>



          <option value="oz">oz</option>



          <option value="lb">lb</option>



          <option value="ml">ml</option>



          <option value="g">g</option>



          <option value="kg">kg</option>



          <option value="count">count</option>



        </select>



      </div>



      <div className="mt-2 flex justify-end">



        <button



          className="px-3 py-2 rounded bg-gray-800 text-white text-sm"



          onClick={() => {



            if (!name.trim()) return;



            onAdd(name.trim(), qty, measure, type);



            setName(''); setQty(1); setMeasure('oz'); setType('spirit');



          }}



        >



          Add



        </button>



      </div>



    </div>



  );



}









