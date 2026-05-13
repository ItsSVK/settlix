import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'

export function humanToRawAmount(human: Decimal, decimals: number): bigint {
  const scale = new Decimal(10).pow(decimals)
  const raw = human.mul(scale)
  return BigInt(raw.toFixed(0, Decimal.ROUND_FLOOR))
}

export function decimalToBigIntUSDC(amount: Decimal): bigint {
  return BigInt(amount.mul(1_000_000).toFixed(0))
}

export function rawToHumanAmount(raw: bigint, decimals: number): string {
  const scale = new Decimal(10).pow(decimals)
  return new Decimal(raw.toString()).div(scale).toFixed(decimals > 4 ? 4 : decimals)
}

export function toRawUsdc(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 1_000_000))
}
