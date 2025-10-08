"use client"
  
import { useState } from 'react'
import type { MenuItem, Measure } from '@/lib/types'

export default function MenuCards({
  menus,
  approveMenu,
  adjustMenuPortions,
  submitFeedback
}: {
  menus: MenuItem[]
  approveMenu: (menu: MenuItem) => void
  adjustMenuPortions: (id: string, delta: number) => void
  submitFeedback: (menu: MenuItem, feedback: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Menus</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {menus.map(menu => (
          <div key={menu.id} className="border rounded-xl overflow-hidden">
            <div className="relative h-40 w-full bg-gray-100">
              <img src={menu.hero} alt={menu.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold">{menu.title}</h3>
              <p className="text-sm text-gray-600">{menu.description}</p>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-gray-700">Portions:</span>
                <button className="px-2 py-1 border rounded" onClick={() => adjustMenuPortions(menu.id, -1)}>-</button>
                <span className="w-10 text-center">{menu.portions}</span>
                <button className="px-2 py-1 border rounded" onClick={() => adjustMenuPortions(menu.id, +1)}>+</button>
              </div>

              {!menu.approved ? (
                <div className="flex items-center gap-3 pt-3">
                  <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={() => approveMenu(menu)}>
                    Approve
                  </button>
                  <details className="w-full">
                    <summary className="cursor-pointer text-sm text-gray-700">Suggest a change</summary>
                    <FeedbackForm onSubmit={(text) => submitFeedback(menu, text)} />
                  </details>
                </div>
              ) : (
                <p className="text-green-700 font-medium pt-2">Approved and added to cart ✅</p>
              )}
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className="text-sm text-gray-600">Generate a menu to see proposals here.</div>
        )}
      </div>
    </div>
  )
}

function FeedbackForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-2 border rounded p-3">
      <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder="Tell us what you'd like instead..." value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 flex justify-end">
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => {
          if (text.trim()) onSubmit(text.trim())
          setText('')
        }}>
          Submit Feedback
        </button>
      </div>
    </div>
  )
}

