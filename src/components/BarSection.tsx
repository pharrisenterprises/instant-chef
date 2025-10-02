import { useState } from 'react'
import type { BarItem, Measure, BeverageRecipe } from '@/lib/types'

export default function BarSection({
  bar,
  addBarManual,
  generateBeverageRecipe,
  setBeverageRecipe,
  handleImageToDataUrl,
  barPreview,
  setBarPreview,
  submitBarImage,
  beverageRecipe
}: {
  bar: BarItem[]
  addBarManual: (name: string, qty: number, measure: Measure, type: BarItem['type']) => void
  generateBeverageRecipe: (bar: BarItem[], type: 'cocktail' | 'mocktail') => BeverageRecipe
  setBeverageRecipe: (r: BeverageRecipe | null) => void
  handleImageToDataUrl: (file: File, setter: (v?: string) => void) => void
  barPreview?: string
  setBarPreview: (v?: string) => void
  submitBarImage: () => void
  beverageRecipe: BeverageRecipe | null
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="font-bold mb-3">Beverage Bar & Mixology Cabinet</h3>

      <BarAddForm onAdd={addBarManual} />

      <div className="mt-3">
        <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50 inline-block">
          📷 Camera
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageToDataUrl(file, setBarPreview)
          }} />
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
          {bar.map(item => (
            <div key={item.id} className={`flex items-center justify-between border rounded px-2 py-1 ${!item.active ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-600">
                  {item.qty} {item.measure} · {item.type} {item.perishable ? '· perishable' : ''}
                  {item.active ? ' · Active' : ' · Inactive'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs px-2 py-1 border rounded" onClick={() => setBeverageRecipe(null)}>
                  Toggle
                </button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => setBeverageRecipe(null)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-3 py-2 rounded bg-pink-500 text-white" onClick={() => setBeverageRecipe(generateBeverageRecipe(bar, 'mocktail'))}>
          Create Mocktail
        </button>
        <button className="flex-1 px-3 py-2 rounded bg-purple-600 text-white" onClick={() => setBeverageRecipe(generateBeverageRecipe(bar, 'cocktail'))}>
          Create Cocktail
        </button>
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
              {beverageRecipe.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function BarAddForm({ onAdd }: { onAdd: (name: string, qty: number, measure: Measure, type: 'spirit' | 'mixer' | 'produce' | 'herb' | 'other') => void }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [measure, setMeasure] = useState<Measure>('oz')
  const [type, setType] = useState<'spirit' | 'mixer' | 'produce' | 'herb' | 'other'>('spirit')

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
        <input type="number" className="border rounded px-2 py-1" placeholder="Qty" value={qty} onChange={(e) => setQty(Math.max(0, +e.target.value))} />
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
        <button className="px-3 py-2 rounded bg-gray-800 text-white text-sm" onClick={() => {
          if (!name.trim()) return
          onAdd(name.trim(), qty, measure, type)
          setName(''); setQty(1); setMeasure('oz'); setType('spirit')
        }}>
          Add
        </button>
      </div>
    </div>
  )
}

