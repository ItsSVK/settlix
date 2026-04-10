import { getDefaultUsdcMint, SOL_MINT, type SolanaCluster } from '@/lib/solana/constants'

export type PayToken = {
  symbol: string
  name: string
  mint: string
  decimals: number
}

/** Mainnet-focused list (matches Jupiter Swap API). */
const MAINNET: PayToken[] = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT, decimals: 9 },
  {
    symbol: 'USDC',
    name: 'USDC',
    mint: getDefaultUsdcMint('mainnet-beta'),
    decimals: 6,
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
  },
]

const DEVNET: PayToken[] = [
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT, decimals: 9 },
  {
    symbol: 'USDC',
    name: 'USDC (dev)',
    mint: getDefaultUsdcMint('devnet'),
    decimals: 6,
  },
]

export function payTokensForCluster(cluster: SolanaCluster): PayToken[] {
  return cluster === 'devnet' ? DEVNET : MAINNET
}

export function findPayToken(mint: string, cluster: SolanaCluster): PayToken | undefined {
  return payTokensForCluster(cluster).find((t) => t.mint === mint)
}
