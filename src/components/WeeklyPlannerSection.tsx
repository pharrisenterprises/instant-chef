"use client"

import { useState, useEffect } from 'react'
import type { Profile, Weekly } from '@/lib/types'

/** ───────── Section-scoped “chef” notice (no full-screen overlay) ───────── */
function SectionChefNotice({
  show,
  onClose,
  autoHideMs = 15000,
  title = 'The chef is cooking your menus…',
  message = 'We’re mixing your preferences, pantry, and budget to build the perfect weekly plan.',
  subMessage = 'This can take a minute or two. You can continue browsing while we cook!',
}: {
  show: boolean
  onClose: () => void
  autoHideMs?: number
  title?: string
  message?: string
  subMessage?: string
}) {
  // Auto-hide after N ms
  useEffect(() => {
    if (!show) return
    const t = setTimeout(onClose, autoHideMs)
    return () => clearTimeout(t)
  }, [show, autoHideMs, onClose])

  if (!show) return null

  return (
    // Absolutely centered INSIDE the Weekly Menu Planning card
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            {/* chef hat */}
            <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
              <path d="M20 40h24v10a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V40z" fill="#e5e7eb" />
              <path d="M16 28h32v10H16z" fill="#111827" />
              <path d="M32 8c-5.3 0-9.6 3.7-10.7 8.6C18.3 17 16 19.6 16 22.8 16 26.8 19.2 30 23.2 30h17.6c4 0 7.2-3.2 7.2-7.2 0-3.2-2.3-5.8-5.3-6.2C41.6 11.7 37.3 8 32 8z" fill="#f3f4f6" />
            </svg>
          </div>
          <h3 className="text-center text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="mt-2 text-center text-sm text-neutral-700">{message}</p>
          {subMessage ? (
            <p className="mt-1 text-center text-xs text-neutral-500">{subMessage}</p>
          ) : null}

          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
            <div className="animate-[progress_1.6s_ease-in-out_infinite] h-1 w-1/3 rounded-full bg-neutral-900" />
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              Hide window
            </button>
          </div>
        </div>
      </div>

      {/* progress animation keyframes (scoped) */}
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(15%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  )
}
/** ─────────────────────────────────────────────────────────────── */

export default function WeeklyPlanner({
  profile,
  weekly,
  setProfile,
  setWeekly,
  handleImageToDataUrl,
  onHandPreview,
  setOnHandPreview,
  submitOnHandImage,
  generateMenus
}: {
  profile: Profile
  weekly: Weekly
  setProfile: (p: Profile) => void
  setWeekly: (w: Weekly) => void
  handleImageToDataUrl: (file: File, setter: (v?: string) => void) => void
  onHandPreview?: string
  setOnHandPreview: (v?: string) => void
  submitOnHandImage: () => void
  generateMenus: () => void
}) {
  const [noticeOpen, setNoticeOpen] = useState(false)

  const onGenerateClick = () => {
    setNoticeOpen(true)      // show section-scoped notice immediately
    generateMenus()          // trigger your existing N8N flow
  }

  return (
    // Make this container relative so the notice can center inside it
    <div className="relative bg-white rounded-2xl shadow p-6">
      {/* Section-scoped chef notice (centered inside this card) */}
      <SectionChefNotice
        show={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        autoHideMs={15000} // auto dismiss after 15s
      />

      <h2 className="text-xl font-bold mb-4">Weekly Menu Planning</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Portions per Dinner</label>
          <div className="flex items-center gap-2 mt-1">
            <button
              className="px-2 py-1 border rounded"
              onClick={() => setProfile({ ...profile, portionDefault: Math.max(1, profile.portionDefault - 1) })}
            >
              -
            </button>
            <input
              type="number"
              className="w-20 border rounded px-2 py-1 text-center"
              value={profile.portionDefault}
              onChange={(e) => setProfile({ ...profile, portionDefault: Math.max(1, +e.target.value) })}
            />
            <button
              className="px-2 py-1 border rounded"
              onClick={() => setProfile({ ...profile, portionDefault: profile.portionDefault + 1 })}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Grocery Store</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            value={profile.store}
            onChange={(e) => setProfile({ ...profile, store: e.target.value })}
            placeholder="e.g., Kroger"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Dinners Needed This Week</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.dinners}
            onChange={(e) => setWeekly({ ...weekly, dinners: Math.max(1, +e.target.value) })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium">Budget Type</label>
          <select
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.budgetType}
            onChange={(e) => setWeekly({ ...weekly, budgetType: e.target.value as Weekly['budgetType'] })}
          >
            <option value="none">No budget</option>
            <option value="perWeek">Per week ($)</option>
            <option value="perMeal">Per meal ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Budget Value</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 mt-1"
            value={weekly.budgetValue ?? ''}
            onChange={(e) =>
              setWeekly({ ...weekly, budgetValue: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })
            }
            placeholder="e.g., 150"
          />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-gray-600">Specify weekly $ or per-meal $. Leave blank to skip.</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Do you have any ingredients on hand that you would like us to use in menu planning for this week?
        </label>
        <p className="text-xs text-gray-600">
          (please list items with quantity included — separated by commas: e.g. 4 roma tomatoes, 2 lb boneless chicken thighs, 3 bell peppers, 4 oz truffle oil)
        </p>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1"
          rows={3}
          value={weekly.onHandText}
          onChange={(e) => setWeekly({ ...weekly, onHandText: e.target.value })}
        />
        <div className="flex items-center gap-3 mt-2">
          <label className="px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50">
            📷 Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageToDataUrl(file, setOnHandPreview)
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

      <div className="mt-4">
        <label className="block text-sm font-medium">
          What are you in the mood for this week? (tell us what you're feeling like – if you have any goals, etc.)
        </label>
        <input
          className="w-full border rounded px-3 py-2 mt-1"
          value={weekly.mood}
          onChange={(e) => setWeekly({ ...weekly, mood: e.target.value })}
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Specify if there is anything else you want to see on the menu? (Italian, Ribeye, Indian, Pad Thai, etc.)
        </label>
        <input
          className="w-full border rounded px-3 py-2 mt-1"
          value={weekly.extras}
          onChange={(e) => setWeekly({ ...weekly, extras: e.target.value })}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-5 py-2 rounded bg-green-600 text-white" onClick={onGenerateClick}>
          Generate Menu
        </button>
      </div>
    </div>
  )
}
