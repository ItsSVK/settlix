import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

import { getAddressTableLookupsFromMessage, loadAddressLookupTableAccounts } from '@/lib/solana/address-lookup'
import { MEMO_PROGRAM_ID, RPC_COMMITMENT } from '@/lib/solana/constants'

const MEMO_PROGRAM = new PublicKey(MEMO_PROGRAM_ID)

async function mintTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (!info) throw new Error('Settlement mint not found on-chain')
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

/**
 * Append merchant settlement `transferChecked` after Jupiter's swap. Strips memo instructions
 * so the tx does not rely on the memo program.
 */
export async function appendSettlementTransfer(params: {
  connection: Connection
  jupiterTxBase64: string
  payer: PublicKey
  merchant: PublicKey
  settlementMint: PublicKey
  transferAmountRaw: bigint
  mintDecimals: number
}): Promise<VersionedTransaction> {
  const { connection, jupiterTxBase64, payer, merchant, settlementMint, transferAmountRaw, mintDecimals } = params

  const tokenProgram = await mintTokenProgram(connection, settlementMint)

  const payerAta = getAssociatedTokenAddressSync(settlementMint, payer, false, tokenProgram)
  const merchantAta = getAssociatedTokenAddressSync(settlementMint, merchant, false, tokenProgram)

  const vtx = VersionedTransaction.deserialize(Buffer.from(jupiterTxBase64, 'base64'))

  const lookups = getAddressTableLookupsFromMessage(vtx.message)
  const alts = await loadAddressLookupTableAccounts(connection, lookups)
  const decompiled = TransactionMessage.decompile(vtx.message, { addressLookupTableAccounts: alts })

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

  const instructions: TransactionInstruction[] = [
    ...decompiled.instructions.filter((ix) => !ix.programId.equals(MEMO_PROGRAM)),
    transferIx,
  ]

  const rebuilt = new TransactionMessage({
    payerKey: decompiled.payerKey,
    recentBlockhash: decompiled.recentBlockhash,
    instructions,
  }).compileToV0Message(alts)

  return new VersionedTransaction(rebuilt)
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
    instructions: [transferIx],
  }).compileToV0Message([])

  return new VersionedTransaction(compiled)
}
