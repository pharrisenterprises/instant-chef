// src/lib/types.ts

export type Measure = 'oz' | 'lb' | 'ml' | 'g' | 'kg' | 'count'

export type Portionable = { portions: number }

export type Ingredient = {
  name: string
  qty: number
  measure: Measure
  estPrice?: number
}

export type MenuItem = Portionable & {
  id: string
  title: string
  description: string
  hero: string
  approved: boolean
  feedback?: string
  ingredients: Ingredient[]
}

export type PantryItem = {
  id: string
  name: string
  qty: number | null
}
