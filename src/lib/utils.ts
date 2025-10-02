// src/lib/utils.ts

export const formatCurrency = (value: number) =>
  `$${value.toFixed(2)}`

export const roundToCents = (value: number) =>
  Math.round(value * 100) / 100
