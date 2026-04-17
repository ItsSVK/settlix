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
