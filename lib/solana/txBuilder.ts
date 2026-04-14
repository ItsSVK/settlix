import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

import { RPC_COMMITMENT } from '@/lib/solana/constants'

async function mintTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (!info) throw new Error('Settlement mint not found on-chain')
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

/** Same-mint checkout: transfer settlement token to merchant only (no Jupiter). */
export async function buildDirectSettlementPaymentTx(params: {
  connection: Connection
  payer: PublicKey
  merchant: PublicKey
  settlementMint: PublicKey
  transferAmountRaw: bigint
  mintDecimals: number
}): Promise<VersionedTransaction> {
  const { connection, payer, merchant, settlementMint, transferAmountRaw, mintDecimals } = params

  const tokenProgram = await mintTokenProgram(connection, settlementMint)
  const payerAta = getAssociatedTokenAddressSync(settlementMint, payer, false, tokenProgram)
  const merchantAta = getAssociatedTokenAddressSync(settlementMint, merchant, false, tokenProgram)

  const { blockhash } = await connection.getLatestBlockhash(RPC_COMMITMENT)

  // Idempotent: creates the merchant ATA if it doesn't exist yet; no-op if it does.
  const createMerchantAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    payer, // fee payer
    merchantAta, // ATA address to create
    merchant, // ATA owner
    settlementMint, // mint
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const transferIx = createTransferCheckedInstruction(
    payerAta,
    settlementMint,
    merchantAta,
    payer,
    transferAmountRaw,
    mintDecimals,
    [],
    tokenProgram,
  )

  const compiled = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [createMerchantAtaIx, transferIx],
  }).compileToV0Message([])

  return new VersionedTransaction(compiled)
}
