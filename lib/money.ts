import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'

/** Single conversion path for create-link `amount` (number or string JSON). */
export function decimalFromCreateLinkAmount(amount: number | string): Decimal {
  return new Decimal(typeof amount === 'number' ? amount.toString() : amount)
}

export function decimalFromOptionalString(value: string | undefined, fallback: Decimal): Decimal {
  if (value === undefined || value === '') {
    return fallback
  }
  return new Decimal(value)
}
