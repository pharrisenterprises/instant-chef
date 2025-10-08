"use client";

import React from "react";

type WeeklyPlannerProps = {
  weekly?: any;
  setWeekly?: (v: any) => void;

  handleImageToDataUrl?: (file: File, setter: (v?: string) => void) => void;
  onHandPreview?: string | null;
  setOnHandPreview?: (v: string | null) => void;
  submitOnHandImage?: () => Promise<void>;

  // Required
  generateMenus: () => Promise<void>;
};

export default function WeeklyPlannerSection(props: WeeklyPlannerProps) {
  const {
    weekly,
    setWeekly,
    onHandPreview,
    setOnHandPreview,
    handleImageToDataUrl,
    submitOnHandImage,
    generateMenus,
  } = props;

  return (
    <section className="rounded-2xl border p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Weekly Planner</h2>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Dinners this week
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="number"
            min={0}
            value={weekly?.dinners ?? 4}
            onChange={(e) =>
              setWeekly?.((w: any) => ({ ...(w || {}), dinners: Number(e.target.value) }))
            }
          />
        </label>

        <label className="text-sm">
          Grocery store
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="text"
            value={weekly?.groceryStore ?? ""}
            onChange={(e) =>
              setWeekly?.((w: any) => ({ ...(w || {}), groceryStore: e.target.value }))
            }
            placeholder="Kroger"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          On hand (CSV)
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
            value={weekly?.onHandCsv ?? ""}
            onChange={(e) =>
              setWeekly?.((w: any) => ({ ...(w || {}), onHandCsv: e.target.value }))
            }
            placeholder="4 roma tomatoes, 2 lb chicken thighs, 3 bell peppers, 4 oz truffle oil"
          />
        </label>

        <label className="text-sm">
          What are you in the mood for?
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="text"
            value={weekly?.mood ?? ""}
            onChange={(e) => setWeekly?.((w: any) => ({ ...(w || {}), mood: e.target.value }))}
          />
        </label>

        <label className="text-sm">
          Anything else to see (e.g., Italian, Ribeye)?
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="text"
            value={weekly?.cuisineWish ?? ""}
            onChange={(e) => setWeekly?.((w: any) => ({ ...(w || {}), cuisineWish: e.target.value }))}
          />
        </label>
      </div>

      {handleImageToDataUrl && setOnHandPreview && (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageToDataUrl(file, (v) => setOnHandPreview(v ?? null));
            }}
          />
          {onHandPreview ? (
            <img
              src={onHandPreview}
              alt="On-hand preview"
              className="h-16 w-16 object-cover rounded border"
            />
          ) : null}
          {submitOnHandImage && (
            <button
              onClick={() => submitOnHandImage()}
              className="px-3 py-2 rounded border bg-white"
            >
              Extract from image
            </button>
          )}
        </div>
      )}

      <div>
        <button onClick={generateMenus} className="px-4 py-2 rounded bg-emerald-600 text-white">
          Generate Menu
        </button>
      </div>
    </section>
  );
}
