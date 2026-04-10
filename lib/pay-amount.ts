/** Stable human → raw token amount for payment pages (no Prisma on client). */
export function humanAmountToRaw(human: string, decimals: number): bigint {
  const s = human.trim()
  const re = /^(\d+)(?:\.(\d+))?$/u
  const m = re.exec(s)
  if (!m) throw new Error('Invalid amount')
  const whole = m[1]
  const fracPart = m[2] ?? ''
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac)
}

export function rawToHumanAmountString(raw: bigint, decimals: number): string {
  const d = BigInt(10) ** BigInt(decimals)
  const whole = raw / d
  const frac = raw % d
  if (decimals === 0) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/u, '')
  return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString()
}
