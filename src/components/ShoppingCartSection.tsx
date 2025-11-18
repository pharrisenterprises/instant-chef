"use client"
  
import { useMemo } from 'react'
import type { CartLine, Measure } from '@/lib/types'

export default function ShoppingCart({
  cartMeal,
  cartExtra,
  addExtraItem,
  withinBudget,
  openInstacart,
  onClearMeal,
}: {
  cartMeal: CartLine[]
  cartExtra: CartLine[]
  addExtraItem: (name: string, qty: number, measure: Measure, estPrice: number) => void
  withinBudget: () => boolean
  openInstacart: () => void
  onClearMeal?: () => void
}) {
  const totalMeal = useMemo(() => cartMeal.reduce((a, c) => a + c.estPrice, 0), [cartMeal])
  const totalExtra = useMemo(() => cartExtra.reduce((a, c) => a + c.estPrice, 0), [cartExtra])
  const grandTotal = useMemo(() => +(totalMeal + totalExtra).toFixed(2), [totalMeal, totalExtra])

  return (
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
            ✅ Within your budgeting logic. You're good to proceed.
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

        <AddExtraItem onAdd={addExtraItem} />

        <CartSection title="Meal Ingredients" lines={cartMeal} onClear={onClearMeal} />
        <CartSection title="Additional Items" lines={cartExtra} />

        <div className="pt-2">
          <button className="px-5 py-3 rounded bg-emerald-600 text-white" onClick={openInstacart}>
            Go to Instacart Checkout →
          </button>
        </div>
      </div>
    </div>
  )
}

function CartSection({ title, lines, onClear }: { title: string; lines: CartLine[]; onClear?: () => void }) {
  const subtotal = lines.reduce((a, c) => a + c.estPrice, 0)
  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="space-y-2 max-h-60 overflow-auto pr-1">
        {lines.map(l => (
          <div key={l.id} className="flex items-center justify-between border rounded px-2 py-1">
            <div className="flex-1">
              <div className="font-medium">{l.name}</div>
              <div className="text-xs text-gray-600">{l.qty} {l.measure}</div>
            </div>
            <div className="font-medium">${l.estPrice.toFixed(2)}</div>
          </div>
        ))}
        {lines.length === 0 && (
          <p className="text-xs text-gray-500">No items yet.</p>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span>
          Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>
        </span>
        {onClear && (
          <button
            type="button"
            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            onClick={onClear}
            disabled={lines.length === 0}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function AddExtraItem({ onAdd }: { onAdd: (name: string, qty: number, measure: Measure, price: number) => void }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [measure, setMeasure] = useState<Measure>('count')
  const [price, setPrice] = useState<number>(1.99)
  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-semibold mb-2">Add Item to Grocery List</h4>
      <div className="grid md:grid-cols-4 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))} />
        <select className="border rounded px-3 py-2" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
          <option value="count">count</option>
          <option value="oz">oz</option>
          <option value="lb">lb</option>
          <option value="ml">ml</option>
          <option value="g">g</option>
          <option value="kg">kg</option>
        </select>
        <input type="number" className="border rounded px-3 py-2" placeholder="Est. Price ($)" value={price} onChange={(e) => setPrice(Math.max(0, +e.target.value))} />
      </div>
      <div className="mt-2 flex justify-end">
        <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={() => {
          if (!name.trim()) return
          onAdd(name.trim(), qty, measure, +price.toFixed(2))
          setName('')
          setQty(1)
          setMeasure('count')
          setPrice(1.99)
        }}>
          Add
        </button>
      </div>
    </div>
  )
}
