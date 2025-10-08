"use client";

import { useState } from "react";
import type { PantryItem, Measure } from "@/lib/types";

/**
 * PantrySection
 * - now accepts `onRemove` so the parent (which owns pantry state) can delete items safely
 * - fixes the old "Remove" button that was accidentally editing local state instead of removing
 */
export default function PantrySection({
  pantry,
  addPantryManual,
  reorderPantryStaple,
  editingPantryItem,
  setEditingPantryItem,
  editForm,
  setEditForm,
  saveEditPantryItem,
  handleImageToDataUrl,
  pantryPreview,
  setPantryPreview,
  submitPantryImage,
  onRemove, // NEW
}: {
  pantry: PantryItem[];
  addPantryManual: (
    name: string,
    qty: number | null,
    measure: Measure | null,
    type?: string
  ) => void;
  reorderPantryStaple: (name: string) => void;
  editingPantryItem: string | null;
  setEditingPantryItem: (v: string | null) => void;
  editForm: { name: string; qty: string; measure: Measure | null };
  setEditForm: (v: { name: string; qty: string; measure: Measure | null }) => void;
  saveEditPantryItem: (id: string) => void;
  handleImageToDataUrl: (file: File, setter: (v?: string) => void) => void;
  pantryPreview?: string;
  setPantryPreview: (v?: string) => void;
  submitPantryImage: () => void;
  onRemove?: (id: string) => void; // NEW (optional)
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="font-bold mb-3">Pantry Tracker</h3>

      {/* Staples quick-actions */}
      <div className="space-y-2 mb-4">
        {pantry
          .filter((p) => (p as any).staple)
          .map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <span>{s.name}</span>
              <button
                className="text-sm px-2 py-1 rounded border"
                onClick={() => reorderPantryStaple(s.name)}
              >
                Reorder
              </button>
            </div>
          ))}
      </div>

      <PantryAddForm onAdd={addPantryManual} />

      {/* Camera intake */}
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
            <img
              src={pantryPreview}
              alt="Pantry preview"
              width="64"
              height="64"
              className="rounded object-cover"
            />
            <button
              className="px-3 py-2 rounded bg-green-600 text-white"
              onClick={submitPantryImage}
            >
              Submit
            </button>
            <button
              className="px-3 py-2 rounded border bg-white"
              onClick={() => setPantryPreview(undefined)}
            >
              Retake
            </button>
          </div>
        )}
      </div>

      {/* Inventory list */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Inventory</h4>
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {pantry
            .filter((p) => !(p as any).staple)
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border rounded px-2 py-1"
              >
                {editingPantryItem === item.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Name"
                    />
                    <div className="flex gap-2">
                      <input
                        className="w-16 border rounded px-2 py-1 text-sm"
                        value={editForm.qty}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, qty: e.target.value }))
                        }
                        placeholder="Qty"
                      />
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={editForm.measure || "oz"}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            measure: e.target.value as Measure,
                          }))
                        }
                      >
                        <option value="oz">oz</option>
                        <option value="lb">lb</option>
                        <option value="ml">ml</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="count">count</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                        onClick={() => saveEditPantryItem(item.id)}
                      >
                        Save
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded"
                        onClick={() => setEditingPantryItem(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-600">
                        {(item as any).qty !== null
                          ? `${(item as any).qty} ${(item as any).measure}`
                          : "Staple"}
                        {(item as any).active ? " · Active" : " · Out of stock"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs px-2 py-1 border rounded"
                        onClick={() => setEditingPantryItem(item.id)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded"
                        onClick={() => onRemove?.(item.id)} // ✅ real removal
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          {pantry.filter((p) => !(p as any).staple).length === 0 && (
            <p className="text-xs text-gray-500">No non-staple items yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PantryAddForm({
  onAdd,
}: {
  onAdd: (
    name: string,
    qty: number | null,
    measure: Measure | null,
    type?: string
  ) => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState<string>("");
  const [measure, setMeasure] = useState<Measure>("oz");
  const [type, setType] = useState<string>("other");

  return (
    <div className="border rounded p-3 bg-white">
      <h4 className="text-sm font-semibold mb-2">+ Add Pantry Item</h4>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="spice">spice</option>
          <option value="condiment">condiment</option>
          <option value="oil">oil</option>
          <option value="canned">canned</option>
          <option value="other">other</option>
        </select>
        <input
          className="border rounded px-2 py-1"
          placeholder="Qty (blank = staple-like)"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={measure}
          onChange={(e) => setMeasure(e.target.value as Measure)}
        >
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
            const q = qty.trim() === "" ? null : Math.max(0, +qty);
            const m = qty.trim() === "" ? null : measure;
            onAdd(name.trim(), q, m, type);
            setName("");
            setQty("");
            setType("other");
            setMeasure("oz");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
