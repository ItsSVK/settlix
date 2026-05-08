import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'

import { MEMO_PROGRAM_ID, RPC_COMMITMENT } from '@/lib/solana/constants'

async function resolveTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (!info) throw new Error('Settlement mint not found on-chain')
  return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}

/**
 * Builds the subscription authorization transaction signed by the subscriber.
 * Contains two instructions: approve (delegate relayer) + first-period transferChecked.
 */
export async function buildSubscriptionAuthorizationTx(params: {
  connection: Connection
  subscriber: PublicKey
  relayer: PublicKey
  settlementMint: PublicKey
  transferAmountRaw: bigint
  /** Total delegation to set = sum of all active subscriptions (same token) + this plan, × iterations.
   * daily = 7 iterations,
   * weekly = 4 iterations,
   */
  totalDelegationRaw: bigint
  /** Number of billing periods to pre-authorise (7 for daily, 4 for weekly). */
  delegationIterations: number
  mintDecimals: number
  planId: string
}): Promise<VersionedTransaction> {
  const {
    connection,
    subscriber,
    relayer,
    settlementMint,
    totalDelegationRaw,
    delegationIterations,
    mintDecimals,
    planId,
  } = params

  const tokenProgram = await resolveTokenProgram(connection, settlementMint)
  const subscriberAta = getAssociatedTokenAddressSync(settlementMint, subscriber, false, tokenProgram)

  const { blockhash } = await connection.getLatestBlockhash(RPC_COMMITMENT)

  const delegatedAmount = totalDelegationRaw * BigInt(delegationIterations)

  const instructions: TransactionInstruction[] = [
    // Approve relayer to pull up to 7 or 4 iterations of payments based on daily or weekly subscription respectively
    createApproveCheckedInstruction(
      subscriberAta,
      settlementMint,
      relayer,
      subscriber,
      delegatedAmount,
      mintDecimals,
      [],
      tokenProgram,
    ),
    new TransactionInstruction({
      programId: new PublicKey(MEMO_PROGRAM_ID),
      keys: [],
      data: Buffer.from(`settlix:sub:${planId}`, 'utf-8'),
    }),
  ]

  const compiled = new TransactionMessage({
    payerKey: subscriber,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([])

  return new VersionedTransaction(compiled)
}

/**
 * Builds a renewal transaction signed by the relayer (as SPL token delegate).
 * The relayer is fee-payer and delegate authority — subscriber does not sign.
 */
export async function buildRenewalTx(params: {
  connection: Connection
  subscriber: PublicKey
  merchant: PublicKey
  relayerKeypair: Keypair
  settlementMint: PublicKey
  transferAmountRaw: bigint
  mintDecimals: number
  subscriptionId: string
}): Promise<VersionedTransaction> {
  const {
    connection,
    subscriber,
    merchant,
    relayerKeypair,
    settlementMint,
    transferAmountRaw,
    mintDecimals,
    subscriptionId,
  } = params

  const tokenProgram = await resolveTokenProgram(connection, settlementMint)
  const subscriberAta = getAssociatedTokenAddressSync(settlementMint, subscriber, false, tokenProgram)
  const merchantAta = getAssociatedTokenAddressSync(settlementMint, merchant, false, tokenProgram)

  const { blockhash } = await connection.getLatestBlockhash(RPC_COMMITMENT)

  const instructions: TransactionInstruction[] = [
    // Ensure merchant ATA exists (relayer pays)
    createAssociatedTokenAccountIdempotentInstruction(
      relayerKeypair.publicKey,
      merchantAta,
      merchant,
      settlementMint,
      tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    // Pull payment — relayer signs as delegate
    createTransferCheckedInstruction(
      subscriberAta,
      settlementMint,
      merchantAta,
      relayerKeypair.publicKey,
      transferAmountRaw,
      mintDecimals,
      [],
      tokenProgram,
    ),
    new TransactionInstruction({
      programId: new PublicKey(MEMO_PROGRAM_ID),
      keys: [],
      data: Buffer.from(`settlix:renewal:${subscriptionId}`, 'utf-8'),
    }),
  ]

  const compiled = new TransactionMessage({
    payerKey: relayerKeypair.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([])

  const tx = new VersionedTransaction(compiled)
  tx.sign([relayerKeypair])
  return tx
}
