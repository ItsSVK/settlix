import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

import { RPC_COMMITMENT } from '@/lib/solana/constants'

async function settlementTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (!info) return TOKEN_PROGRAM_ID
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

export type VerifyResult = { ok: true } | { ok: false; reason: string }

type UiTokenBalance = {
  owner?: string
  mint: string
  uiTokenAmount: {
    amount: string
  }
}

function sumTokenBalancesForOwnerAndMint(
  balances: UiTokenBalance[] | undefined | null,
  owner: string,
  mint: string,
): bigint {
  if (!balances || balances.length === 0) return BigInt(0)

  let total = BigInt(0)
  for (const row of balances) {
    if (row.owner !== owner) continue
    if (row.mint !== mint) continue
    total += BigInt(row.uiTokenAmount.amount)
  }
  return total
}

export async function verifyPaymentTransaction(params: {
  connection: Connection
  signature: string
  merchantWallet: string
  settlementMint: string
  expectedRaw: bigint
}): Promise<VerifyResult> {
  const { connection, signature, merchantWallet, settlementMint, expectedRaw } = params

  const tx = await connection.getTransaction(signature, {
    commitment: RPC_COMMITMENT,
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    return { ok: false, reason: 'Transaction not found on RPC' }
  }
  if (tx.meta?.err) {
    return { ok: false, reason: 'Transaction failed on-chain' }
  }

  const settlementPk = new PublicKey(settlementMint)
  const merchantPk = new PublicKey(merchantWallet)
  const tokenProgram = await settlementTokenProgram(connection, settlementPk)
  getAssociatedTokenAddressSync(settlementPk, merchantPk, false, tokenProgram)

  const preOwned = sumTokenBalancesForOwnerAndMint(tx.meta?.preTokenBalances, merchantWallet, settlementMint)
  const postOwned = sumTokenBalancesForOwnerAndMint(tx.meta?.postTokenBalances, merchantWallet, settlementMint)
  const received = postOwned - preOwned

  if (received >= expectedRaw) {
    return { ok: true }
  }

  return {
    ok: false,
    reason: `Settlement transfer insufficient: received ${received.toString()} raw, expected at least ${expectedRaw.toString()} raw`,
  }
}
