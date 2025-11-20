// src/lib/types.ts
export type Measure = 'oz' | 'lb' | 'ml' | 'g' | 'kg' | 'count'

export type Ingredient = {
  name: string
  qty: number
  measure: Measure
  estPrice?: number
}

export type Portionable = { portions: number }

export type MenuItem = Portionable & {
  id: string
  title: string
  description: string
  hero: string
  approved: boolean
  feedback?: string
  ingredients: Ingredient[]
  instructions?: string[]
  recipe_steps?: string | null
  sides?: {
    title: string
    ingredients: Ingredient[]
    steps: string[]
  }[]
}

export type PantryItem = {
  id: string
  name: string
  qty: number | null
  measure: Measure | null
  staple?: boolean
  active: boolean
  updatedAt: number // epoch ms
  type?: string
}

export type BarItem = {
  id: string
  name: string
  qty: number
  measure: Measure
  type: 'spirit' | 'mixer' | 'produce' | 'herb' | 'other'
  active: boolean
  updatedAt: number
  perishable?: boolean
}

export type Profile = { portionDefault: number; store: string }

export type Weekly = {
  dinners: number;
  budgetType?: 'none' | 'perWeek' | 'perMeal' | 'per_week' | 'per_meal' | null;
  budgetValue?: number | null;
  onHandText: string;
  onHandImageDataUrl?: string;
  mood: string;
  extras: string;
  // add the fields the planner/payload use
  pantrySnapshot?: PantryItem[];
  barSnapshot?: BarItem[];
  currentMenusCount?: number;
};


// n8n payload helper types (optional but nice)
export type BasicInformation = {
  firstName: string
  lastName: string
  email: string
  accountAddress: { street: string; city: string; state: string; zipcode: string }
}
export type HouseholdSetup = {
  adults: number
  teens: number
  children: number
  toddlersInfants: number
  portionsPerDinner?: number
  dinnersPerWeek?: number
}
export type CookingPreferences = {
  cookingSkill: string
  cookingTimePreference: string
  equipment: string[]
}
export type DietaryProfile = {
  allergiesRestrictions: string[]
  dislikesAvoidList: string[]
  dietaryPrograms: string[]
  notes?: string
}
export type ShoppingPreferences = {
  storesNearMe: string[]
  preferredGroceryStore?: string
  preferOrganic?: string
  preferNationalBrands?: string
}
export type ClientPayload = {
  basicInformation: BasicInformation
  householdSetup: HouseholdSetup
  cookingPreferences: CookingPreferences
  dietaryProfile: DietaryProfile
  shoppingPreferences: ShoppingPreferences
  extra?: {
    weeklyMood?: string
    weeklyExtras?: string
    weeklyOnHandText?: string
    pantrySnapshot?: PantryItem[]
    barSnapshot?: BarItem[]
    currentMenusCount?: number
  }
}
