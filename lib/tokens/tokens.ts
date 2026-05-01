import tokensJson from './tokens.json'

export interface TokenEntry {
  symbol: string
  name: string
  mint: string
  decimals: number
  logoURI: string
}

// Re-export the JSON content as a typed array for direct use.
export const TOKENS: TokenEntry[] = tokensJson as TokenEntry[]

// Helper to access the token list (returns the same typed array).
export function getNameByMint(mint: string) {
  const token = TOKENS.find((t) => t.mint === mint)
  return token?.name ?? mint
}

export function getDecimalsByMint(mint: string) {
  const token = TOKENS.find((t) => t.mint === mint)
  return token?.decimals ?? 6
}

export function getLogoByMint(mint: string) {
  const token = TOKENS.find((t) => t.mint === mint)
  return token?.logoURI ?? null
}

export function getSymbolByMint(mint: string) {
  const token = TOKENS.find((t) => t.mint === mint)
  return token?.symbol ?? null
}

export function getTokenByMint(mint: string) {
  const token = TOKENS.find((t) => t.mint === mint)
  return token ?? null
}
