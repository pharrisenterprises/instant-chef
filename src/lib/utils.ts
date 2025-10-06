// src/lib/utils.ts

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function now(): string {
  return new Date().toISOString()
}

export function toNumber(str: string, fallback = 0): number {
  const num = parseFloat(str)
  return isNaN(num) ? fallback : num
}

export function linePrice(ing: { qty: number; estPrice?: number }): number {
  return ing.qty * (ing.estPrice || 1)
}

export function scaleIngredients<T extends { qty: number }>(
  ingredients: T[],
  multiplier: number
): T[] {
  return ingredients.map(ing => ({ ...ing, qty: ing.qty * multiplier }))
}

export function autoFadePerishables<T extends { perishable?: boolean; active: boolean; updatedAt: string }>(
  items: T[]
): T[] {
  const today = new Date()
  return items.map(item => {
    if (!item.perishable) return item
    const ageDays = (today.getTime() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > 5) return { ...item, active: false }
    return item
  })
}
