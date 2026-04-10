import { Connection, PublicKey } from '@solana/web3.js'
import {
  decodeTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

import { decompileVersionedTransactionMessage } from '@/lib/solana/address-lookup'
import { RPC_COMMITMENT } from '@/lib/solana/constants'

async function settlementTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (!info) return TOKEN_PROGRAM_ID
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

export type VerifyResult = { ok: true } | { ok: false; reason: string }

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
  const merchantAta = getAssociatedTokenAddressSync(settlementPk, merchantPk, false, tokenProgram)

  const decompiled = await decompileVersionedTransactionMessage(connection, tx.transaction.message)

  for (const ix of decompiled.instructions) {
    if (ix.programId.equals(TOKEN_PROGRAM_ID) || ix.programId.equals(TOKEN_2022_PROGRAM_ID)) {
      try {
        const decoded = decodeTransferCheckedInstruction(ix)
        const destOk = decoded.keys.destination.pubkey.equals(merchantAta)
        const mintOk = decoded.keys.mint.pubkey.equals(settlementPk)
        const amountOk = BigInt(decoded.data.amount) >= expectedRaw
        if (destOk && mintOk && amountOk) {
          return { ok: true }
        }
      } catch {
        /* not transfer-checked */
      }
    }
  }

  return { ok: false, reason: 'Settlement transfer to merchant not found or insufficient amount' }
}
