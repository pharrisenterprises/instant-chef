import { useEffect, useState } from 'react'
import WeeklyPlanner from '@/components/WeeklyPlannerSection'
import MenuCards from '@/components/MenuCardsSection'
import ShoppingCart from '@/components/ShoppingCartSection'
import PantrySection from '@/components/PantrySection'
import BarSection from '@/components/BarSection'
import type {
  PantryItem,
  BarItem,
  BeverageRecipe,
  Profile,
  Weekly,
  CartLine,
  MenuItem,
  Measure
} from '@/lib/types'
import {
  uid,
  now,
  toNumber,
  linePrice,
  autoFadePerishables,
  scaleIngredients
} from '@/lib/utils'

export default function DashboardPage() {
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [bar, setBar] = useState<BarItem[]>([])
  const [cartMeal, setCartMeal] = useState<CartLine[]>([])
  const [cartExtra, setCartExtra] = useState<CartLine[]>([])
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [profile, setProfile] = useState<Profile>({ portionDefault: 4, store: 'Kroger' })
  const [weekly, setWeekly] = useState<Weekly>({
    dinners: 3,
    budgetType: 'none',
    budgetValue: undefined,
    onHandText: '',
    mood: '',
    extras: ''
  })
  const [editingPantryItem, setEditingPantryItem] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; qty: string; measure: Measure | null }>({ name: '', qty: '', measure: 'oz' })
  const [pantryPreview, setPantryPreview] = useState<string | undefined>(undefined)
  const [barPreview, setBarPreview] = useState<string | undefined>(undefined)
  const [onHandPreview, setOnHandPreview] = useState<string | undefined>(undefined)
  const [beverageRecipe, setBeverageRecipe] = useState<BeverageRecipe | null>(null)

  function handleImageToDataUrl(file: File, setter: (v?: string) => void) {
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  function addPantryManual(name: string, qty: number | null, measure: Measure | null, type?: string) {
    const item: PantryItem = {
      id: uid(), name, qty, measure,
      staple: qty === null && measure === null,
      active: true,
      updatedAt: now(),
      type,
    }
    setPantry(prev => [item, ...prev])
  }

  function submitPantryImage() {
    addPantryManual('Canned tomatoes', 14, 'oz', 'canned')
    addPantryManual('Chili crisp', 6, 'oz', 'condiment')
    setPantryPreview(undefined)
  }

  function reorderPantryStaple(name: string) {
    addExtraItem(name, 1, 'count', 4.99)
  }

  function saveEditPantryItem(id: string) {
    const qty = editForm.qty.trim() === '' ? null : Math.max(0, toNumber(editForm.qty, 0))
    const measure = editForm.qty.trim() === '' ? null : editForm.measure
    setPantry(prev => prev.map(p => p.id === id ? { ...p, name: editForm.name, qty, measure, updatedAt: now() } : p))
    setEditingPantryItem(null)
  }

  function addBarManual(name: string, qty: number, measure: Measure, type: BarItem['type']) {
    const perishable = type === 'produce' || type === 'herb'
    const item: BarItem = {
      id: uid(), name, qty, measure, type, active: true, perishable, updatedAt: now()
    }
    setBar(prev => [item, ...prev])
  }

  function submitBarImage() {
    addBarManual('Lime', 6, 'count', 'produce')
    addBarManual('Simple syrup', 8, 'oz', 'mixer')
    setBarPreview(undefined)
  }

  function generateMenus() {
    const SAMPLE_MENUS = [
      {
        id: '1',
        title: 'Lemon Chicken',
        description: 'Herbed chicken with roasted lemon.',
        hero: '/hero.jpg',
        ingredients: [
          { name: 'Chicken', qty: 1, measure: 'lb', estPrice: 5.5 },
          { name: 'Lemon', qty: 2, measure: 'count', estPrice: 0.79 }
        ]
      },
      {
        id: '2',
        title: 'Pasta Primavera',
        description: 'Seasonal vegetables in creamy pasta.',
        hero: '/hero.jpg',
        ingredients: [
          { name: 'Pasta', qty: 8, measure: 'oz', estPrice: 1.2 },
          { name: 'Veggies', qty: 12, measure: 'oz', estPrice: 3.0 }
        ]
      }
    ]
    const count = Math.min(weekly.dinners, SAMPLE_MENUS.length)
    const generated = SAMPLE_MENUS.slice(0, count).map(m => ({
      ...m,
      portions: profile.portionDefault,
      approved: false
    }))
    setMenus(generated)
  }

  function approveMenu(menu: MenuItem) {
    const scaled = scaleIngredients(menu.ingredients, menu.portions)
    const newLines: CartLine[] = scaled.map(ing => ({
      id: uid(),
      name: ing.name,
      qty: ing.qty,
      measure: ing.measure,
      estPrice: +(linePrice(ing)).toFixed(2),
      section: 'meal'
    }))
    setCartMeal(prev => [...prev, ...newLines])
    setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, approved: true } : m))
  }

  function submitFeedback(menu: MenuItem, feedback: string) {
    setMenus(prev => prev.map(m => m.id === menu.id ? {
      ...m,
      feedback,
      title: `${m.title} — Chef's Twist`,
      description: `Updated per your note: ${feedback}`
    } : m))
  }

  function adjustMenuPortions(id: string, delta: number) {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, portions: Math.max(1, m.portions + delta) } : m))
  }

  function addExtraItem(name: string, qty: number, measure: Measure, estPrice: number) {
    const line: CartLine = { id: uid(), name, qty, measure, estPrice, section: 'extra' }
    setCartExtra(prev => [...prev, line])
  }

  function withinBudget(): boolean {
    const totalMeal = cartMeal.reduce((a, c) => a + c.estPrice, 0)
    const totalExtra = cartExtra.reduce((a, c) => a + c.estPrice, 0)
    const grandTotal = totalMeal + totalExtra
    if (weekly.budgetType === 'none' || !weekly.budgetValue) return true
    if (weekly.budgetType === 'perWeek') return grandTotal <= weekly.budgetValue + 0.01
    if (weekly.budgetType === 'perMeal') {
      const count = menus.filter(m => m.approved).length || 1
      return totalMeal <= (weekly.budgetValue * count) + 0.01
    }
    return true
  }

  function openInstacart() {
    window.open('https://www.instacart.com', '_blank')
  }

  function submitOnHandImage() {
    setWeekly(prev => ({ ...prev, onHandImageDataUrl: onHandPreview }))
    setWeekly(prev => ({ ...prev, onHandText: prev.onHandText + ', 2 lb chicken thighs, 1 lemon, 8 oz spinach' }))
    setOnHandPreview(undefined)
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <section className="lg:col-span-3 space-y-6">
        <WeeklyPlanner
          profile={profile}
          weekly={weekly}
          setProfile={setProfile}
          setWeekly={setWeekly}
          handleImageToDataUrl={handleImageToDataUrl}
          onHandPreview={onHandPreview}
          setOnHandPreview={setOnHandPreview}
          submitOnHandImage={submitOnHandImage}
          generateMenus={generateMenus}
        />
        <MenuCards
          menus={menus}
          approveMenu={approveMenu}
          adjustMenuPortions={adjustMenuPortions}
          submitFeedback={submitFeedback}
        />
        <ShoppingCart
          cartMeal={cartMeal}
          cartExtra={cartExtra}
          addExtraItem={addExtraItem}
          withinBudget={withinBudget}
          openInstacart={openInstacart}
        />
      </section>
      <aside className="lg:col-span-1 space-y-6">
        <PantrySection
          pantry={pantry}
          addPantryManual={addPantryManual}
          reorderPantryStaple={reorderPantryStaple}
          editingPantryItem={editingPantryItem}
          setEditingPantryItem={setEditingPantryItem}
          editForm={editForm}
          setEditForm={setEditForm}
          saveEditPantryItem={saveEditPantryItem}
          handleImageToDataUrl={handleImageToDataUrl}
          pantryPreview={pantryPreview}
          setPantryPreview={setPantryPreview}
          submitPantryImage={submitPantryImage}
        />
        <BarSection
          bar={bar}
          addBarManual={addBarManual}
          generateBeverageRecipe={(bar, type) => {
            const recipe = { id: uid(), name: 'Example Drink', type, ingredients: [], instructions: [], imageUrl: '' }
            return recipe
          }}
          setBeverageRecipe={setBeverageRecipe}
          handleImageToDataUrl={handleImageToDataUrl}
          barPreview={barPreview}
          setBarPreview={setBarPreview}
          submitBarImage={submitBarImage}
          beverageRecipe={beverageRecipe}
        />
      </aside>
    </main>
  )
}

