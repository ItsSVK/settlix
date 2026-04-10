/** Default commitment for reads, sends, and verification. */
export const RPC_COMMITMENT = 'confirmed' as const

/** Native / wrapped SOL mint (Jupiter uses this for SOL-side quotes). */
export const SOL_MINT = 'So11111111111111111111111111111111111111112'

export type SolanaCluster = 'mainnet-beta' | 'devnet'

const USDC_BY_CLUSTER: Record<SolanaCluster, string> = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
}

export function getDefaultUsdcMint(cluster: SolanaCluster): string {
  return USDC_BY_CLUSTER[cluster]
}

export function isAllowedSettlementMint(mint: string, cluster: SolanaCluster): boolean {
  return mint === USDC_BY_CLUSTER[cluster]
}

/** SPL Memo program (matches on-chain program and `@solana/spl-memo`). */
export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

/** User-facing: payment link only allows USDC settlement for MVP. */
export function parseCluster(raw: string | undefined): SolanaCluster {
  return raw === 'devnet' ? 'devnet' : 'mainnet-beta'
}
