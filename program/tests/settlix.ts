import { describe, before, it } from 'mocha'
import assert from 'assert'
import * as crypto from 'crypto'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { LiteSVM, FailedTransactionMetadata } from 'litesvm'
import {
  generateKeyPairSigner,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getProgramDerivedAddress,
  getAddressEncoder,
  address as toAddress,
  AccountRole,
  addSignersToInstruction,
  type Address,
  type KeyPairSigner,
  type Instruction,
} from '@solana/kit'
import {
  findAssociatedTokenPda,
  getInitializeMint2Instruction,
  getMintToInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token'
import { getCreateAccountInstruction, SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system'

// ─── Constants ──────────────────────────────────────────────────────────────

const PROGRAM_ID = toAddress('8Ke6bFDR9aYGvJyKEayQF6cEoMhZ5Wu2RKCUVydCW5oY')
const VAULT_SEED = Buffer.from('split_vault')
const MINT_DECIMALS = 6
const MINT_ACCOUNT_SIZE = 82n

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute the 8-byte Anchor instruction discriminator. */
function disc(name: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(`global:${name}`).digest()).subarray(0, 8)
}

const addrEncoder = getAddressEncoder()

/** Encode a Vec<RecipientInput> in Borsh format. */
function encodeRecipients(recipients: Array<{ wallet: Address; basisPoints: number }>): Buffer {
  const buf = Buffer.alloc(4 + recipients.length * 34)
  buf.writeUInt32LE(recipients.length, 0)
  for (let i = 0; i < recipients.length; i++) {
    const walletBytes = addrEncoder.encode(recipients[i].wallet)
    Buffer.from(walletBytes).copy(buf, 4 + i * 34)
    buf.writeUInt16LE(recipients[i].basisPoints, 4 + i * 34 + 32)
  }
  return buf
}

/** Read the u64 token amount from a raw SPL token account data buffer. */
function readTokenBalance(data: Uint8Array): bigint {
  return Buffer.from(data).readBigUInt64LE(64)
}

/** Derive the vault PDA. */
async function deriveVaultPda(vaultId: Uint8Array): Promise<Address> {
  const [vaultAddr] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [VAULT_SEED, vaultId],
  })
  return vaultAddr
}

/** Find the ATA of `owner` for the test USDC mint. */
async function findAta(owner: Address, mintAddr: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    mint: mintAddr,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  return ata
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('settlix', () => {
  let svm: LiteSVM
  let payer: KeyPairSigner
  let mintAddress: Address

  /** Send one or more instructions as a single transaction. */
  async function sendTx(ixs: Instruction | Instruction[], feePayer?: KeyPairSigner) {
    const fp = feePayer ?? payer
    const instructions = Array.isArray(ixs) ? ixs : [ixs]
    const tx = await pipe(
      createTransactionMessage({ version: 0 }),
      (msg) => setTransactionMessageFeePayerSigner(fp, msg),
      (msg) => svm.setTransactionMessageLifetimeUsingLatestBlockhash(msg),
      (msg) => appendTransactionMessageInstructions(instructions, msg),
      (msg) => signTransactionMessageWithSigners(msg),
    )
    return svm.sendTransaction(tx)
  }

  /** Create a USDC ATA for an owner address (idempotent). */
  async function ensureAta(owner: Address): Promise<Address> {
    const ata = await findAta(owner, mintAddress)
    const ix = getCreateAssociatedTokenIdempotentInstruction({
      payer,
      ata,
      owner,
      mint: mintAddress,
    })
    await sendTx(ix)
    return ata
  }

  /** Mint `amount` (raw, 6-decimal) tokens to `destination` ATA. */
  async function mintTokens(destination: Address, amount: bigint) {
    const ix = getMintToInstruction({
      mint: mintAddress,
      token: destination,
      mintAuthority: payer,
      amount,
    })
    const result = await sendTx(ix)
    assert.ok(
      !(result instanceof FailedTransactionMetadata),
      `mintTo failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
    )
  }

  /** Build the initialize_vault instruction. */
  async function buildInitializeVault(
    vaultId: Uint8Array,
    recipients: Array<{ wallet: Address; basisPoints: number }>,
    authority: KeyPairSigner,
  ): Promise<Instruction> {
    const vault = await deriveVaultPda(vaultId)
    const vaultAta = await findAta(vault, mintAddress)

    const data = Buffer.concat([disc('initialize_vault'), Buffer.from(vaultId), encodeRecipients(recipients)])

    return addSignersToInstruction([authority], {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: vault, role: AccountRole.WRITABLE },
        { address: vaultAta, role: AccountRole.WRITABLE },
        { address: mintAddress, role: AccountRole.READONLY },
        { address: authority.address, role: AccountRole.WRITABLE_SIGNER },
        { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      ],
      data,
    })
  }

  /** Build the distribute instruction. */
  async function buildDistribute(vaultId: Uint8Array, recipientAtas: Address[]): Promise<Instruction> {
    const vault = await deriveVaultPda(vaultId)
    const vaultAta = await findAta(vault, mintAddress)

    return {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: vault, role: AccountRole.READONLY },
        { address: vaultAta, role: AccountRole.WRITABLE },
        { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        // remaining_accounts: one writable ATA per recipient
        ...recipientAtas.map((ata) => ({
          address: ata,
          role: AccountRole.WRITABLE,
        })),
      ],
      data: disc('distribute'),
    }
  }

  /** Build the update_recipients instruction. */
  async function buildUpdateRecipients(
    vaultId: Uint8Array,
    recipients: Array<{ wallet: Address; basisPoints: number }>,
    authority: KeyPairSigner,
  ): Promise<Instruction> {
    const vault = await deriveVaultPda(vaultId)
    const vaultAta = await findAta(vault, mintAddress)

    const data = Buffer.concat([disc('update_recipients'), encodeRecipients(recipients)])

    return addSignersToInstruction([authority], {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: vault, role: AccountRole.WRITABLE },
        { address: vaultAta, role: AccountRole.READONLY },
        { address: authority.address, role: AccountRole.READONLY_SIGNER },
      ],
      data,
    })
  }

  /** Build the close_vault instruction. */
  async function buildCloseVault(vaultId: Uint8Array, authority: KeyPairSigner): Promise<Instruction> {
    const vault = await deriveVaultPda(vaultId)
    const vaultAta = await findAta(vault, mintAddress)

    return addSignersToInstruction([authority], {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: vault, role: AccountRole.WRITABLE },
        { address: vaultAta, role: AccountRole.WRITABLE },
        { address: authority.address, role: AccountRole.WRITABLE_SIGNER },
        { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      ],
      data: disc('close_vault'),
    })
  }

  // ─── Global Before ────────────────────────────────────────────────────────

  before(async () => {
    svm = new LiteSVM()

    // Resolve the .so path robustly in both CJS and ESM contexts
    const soDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(new URL(import.meta.url)))
    const programPath = path.join(soDir, '../target/deploy/settlix.so')
    svm.addProgramFromFile(PROGRAM_ID, programPath)

    payer = await generateKeyPairSigner()
    svm.airdrop(payer.address, lamports(100_000_000_000n))

    // Create the USDC-like mint
    const mintKp = await generateKeyPairSigner()
    mintAddress = mintKp.address

    const mintRent = svm.minimumBalanceForRentExemption(MINT_ACCOUNT_SIZE)

    const createAccIx = getCreateAccountInstruction({
      payer,
      newAccount: mintKp,
      lamports: mintRent,
      space: Number(MINT_ACCOUNT_SIZE),
      programAddress: TOKEN_PROGRAM_ADDRESS,
    })

    const initMintIx = getInitializeMint2Instruction({
      mint: mintAddress,
      decimals: MINT_DECIMALS,
      mintAuthority: payer.address,
      freezeAuthority: null,
    })

    const result = await sendTx([createAccIx, initMintIx])
    assert.ok(
      !(result instanceof FailedTransactionMetadata),
      `Mint setup failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
    )
  })

  // ─── initialize_vault ─────────────────────────────────────────────────────

  describe('initialize_vault', () => {
    it('creates a vault with two recipients summing to 10 000 bps', async () => {
      const vaultId = crypto.randomBytes(32)
      const r1 = await generateKeyPairSigner()
      const r2 = await generateKeyPairSigner()

      const ix = await buildInitializeVault(
        vaultId,
        [
          { wallet: r1.address, basisPoints: 7000 },
          { wallet: r2.address, basisPoints: 3000 },
        ],
        payer,
      )
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Should succeed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )

      // Vault account should exist
      const vault = await deriveVaultPda(vaultId)
      const vaultAcct = svm.getAccount(vault)
      assert.ok(vaultAcct.exists, 'Vault account should exist')
    })

    it('creates a vault with a single 100% recipient', async () => {
      const vaultId = crypto.randomBytes(32)
      const r1 = await generateKeyPairSigner()

      const ix = await buildInitializeVault(vaultId, [{ wallet: r1.address, basisPoints: 10000 }], payer)
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Should succeed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('creates a vault with the maximum 10 recipients', async () => {
      const vaultId = crypto.randomBytes(32)
      const recipients = await Promise.all(
        Array.from({ length: 10 }, async () => ({
          wallet: (await generateKeyPairSigner()).address,
          basisPoints: 1000,
        })),
      )

      const ix = await buildInitializeVault(vaultId, recipients, payer)
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Should succeed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('rejects empty recipients list (NoRecipients)', async () => {
      const vaultId = crypto.randomBytes(32)
      const ix = await buildInitializeVault(vaultId, [], payer)
      const result = await sendTx(ix)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('NoRecipients')),
        `Expected NoRecipients in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects 11 recipients (TooManyRecipients)', async () => {
      const vaultId = crypto.randomBytes(32)
      // Build recipients manually so 11 entries still sum to 10 000
      const recipients = await Promise.all(
        Array.from({ length: 10 }, async () => ({
          wallet: (await generateKeyPairSigner()).address,
          basisPoints: 909,
        })),
      )
      // Add an 11th to push over the limit (total = 9090 + 910)
      recipients.push({
        wallet: (await generateKeyPairSigner()).address,
        basisPoints: 910,
      })

      const vault = await deriveVaultPda(vaultId)
      const vaultAta = await findAta(vault, mintAddress)

      const data = Buffer.concat([disc('initialize_vault'), Buffer.from(vaultId), encodeRecipients(recipients)])

      const ix = addSignersToInstruction([payer], {
        programAddress: PROGRAM_ID,
        accounts: [
          { address: vault, role: AccountRole.WRITABLE },
          { address: vaultAta, role: AccountRole.WRITABLE },
          { address: mintAddress, role: AccountRole.READONLY },
          { address: payer.address, role: AccountRole.WRITABLE_SIGNER },
          { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
          { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
          { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        ],
        data,
      })

      const result = await sendTx(ix)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('TooManyRecipients')),
        `Expected TooManyRecipients in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects basis points not summing to 10 000 (BpsMustSumTo10000)', async () => {
      const vaultId = crypto.randomBytes(32)
      const ix = await buildInitializeVault(
        vaultId,
        [
          { wallet: (await generateKeyPairSigner()).address, basisPoints: 5000 },
          { wallet: (await generateKeyPairSigner()).address, basisPoints: 4999 }, // sums to 9999
        ],
        payer,
      )
      const result = await sendTx(ix)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('BpsMustSumTo10000')),
        `Expected BpsMustSumTo10000 in logs: ${logs.join('\n')}`,
      )
    })
  })

  // ─── distribute ───────────────────────────────────────────────────────────

  describe('distribute', () => {
    let vaultId: Buffer
    let r1: KeyPairSigner
    let r2: KeyPairSigner

    before(async () => {
      vaultId = crypto.randomBytes(32)
      r1 = await generateKeyPairSigner()
      r2 = await generateKeyPairSigner()

      const ix = await buildInitializeVault(
        vaultId,
        [
          { wallet: r1.address, basisPoints: 6000 },
          { wallet: r2.address, basisPoints: 4000 },
        ],
        payer,
      )
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Setup initialize_vault failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('distributes vault balance proportionally to all recipients', async () => {
      const vault = await deriveVaultPda(vaultId)
      const vaultAta = await findAta(vault, mintAddress)

      // Fund vault: mint 1 000 USDC (1_000_000_000 raw)
      const depositAmount = 1_000_000_000n
      await mintTokens(vaultAta, depositAmount)

      // Create recipient ATAs
      const r1Ata = await ensureAta(r1.address)
      const r2Ata = await ensureAta(r2.address)

      const ix = await buildDistribute(vaultId, [r1Ata, r2Ata])
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `distribute failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )

      // r1 gets 60% = 600_000_000
      const r1Acct = svm.getAccount(r1Ata)
      assert.ok(r1Acct.exists, 'r1 ATA should exist')
      assert.strictEqual(readTokenBalance((r1Acct as any).data), 600_000_000n, 'r1 should receive 60%')

      // r2 gets 40% = 400_000_000
      const r2Acct = svm.getAccount(r2Ata)
      assert.ok(r2Acct.exists, 'r2 ATA should exist')
      assert.strictEqual(readTokenBalance((r2Acct as any).data), 400_000_000n, 'r2 should receive 40%')

      // Vault should be drained
      const vaultAtaAcct = svm.getAccount(vaultAta)
      assert.ok(vaultAtaAcct.exists, 'vault ATA should exist')
      assert.strictEqual(readTokenBalance((vaultAtaAcct as any).data), 0n, 'Vault should be empty')
    })

    it('last recipient absorbs rounding dust so vault is fully drained', async () => {
      // Create a fresh vault with 3 equal recipients (each 33.33%)
      const freshVaultId = crypto.randomBytes(32)
      const a = await generateKeyPairSigner()
      const b = await generateKeyPairSigner()
      const c = await generateKeyPairSigner()

      const initIx = await buildInitializeVault(
        freshVaultId,
        [
          { wallet: a.address, basisPoints: 3334 },
          { wallet: b.address, basisPoints: 3333 },
          { wallet: c.address, basisPoints: 3333 },
        ],
        payer,
      )
      await sendTx(initIx)

      const freshVault = await deriveVaultPda(freshVaultId)
      const freshVaultAta = await findAta(freshVault, mintAddress)

      // Mint an amount that doesn't divide evenly: 10 raw tokens
      await mintTokens(freshVaultAta, 10n)

      const aAta = await ensureAta(a.address)
      const bAta = await ensureAta(b.address)
      const cAta = await ensureAta(c.address)

      const ix = await buildDistribute(freshVaultId, [aAta, bAta, cAta])
      const result = await sendTx(ix)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `distribute failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )

      // a = floor(10 * 3334 / 10000) = 3
      // b = floor(10 * 3333 / 10000) = 3
      // c = 10 - 3 - 3 = 4  (absorbs dust)
      const aAcct = svm.getAccount(aAta)
      const bAcct = svm.getAccount(bAta)
      const cAcct = svm.getAccount(cAta)
      assert.ok(aAcct.exists && bAcct.exists && cAcct.exists, 'All recipient ATAs should exist')
      const total =
        readTokenBalance((aAcct as any).data) +
        readTokenBalance((bAcct as any).data) +
        readTokenBalance((cAcct as any).data)
      assert.strictEqual(total, 10n, 'All tokens should be distributed')

      const freshVaultAtaAcct = svm.getAccount(freshVaultAta)
      assert.ok(freshVaultAtaAcct.exists, 'Vault ATA should still exist')
      assert.strictEqual(readTokenBalance((freshVaultAtaAcct as any).data), 0n, 'Vault fully drained')
    })

    it('rejects distribute when vault has zero balance (InsufficientBalance)', async () => {
      // Create a fresh empty vault
      const emptyVaultId = crypto.randomBytes(32)
      const r = await generateKeyPairSigner()

      const initIx = await buildInitializeVault(emptyVaultId, [{ wallet: r.address, basisPoints: 10000 }], payer)
      await sendTx(initIx)

      const rAta = await ensureAta(r.address)
      const ix = await buildDistribute(emptyVaultId, [rAta])
      const result = await sendTx(ix)

      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('InsufficientBalance')),
        `Expected InsufficientBalance in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects mismatched remaining accounts (RecipientAccountMismatch)', async () => {
      // Use the 2-recipient vault but only pass 1 ATA
      const vault = await deriveVaultPda(vaultId)
      const vaultAta = await findAta(vault, mintAddress)

      // Refund the vault so it has a balance to attempt distribution
      await mintTokens(vaultAta, 1_000_000n)

      const r1Ata = await findAta(r1.address, mintAddress)
      // Intentionally omit r2Ata
      const ix = await buildDistribute(vaultId, [r1Ata])
      const result = await sendTx(ix)

      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('RecipientAccountMismatch')),
        `Expected RecipientAccountMismatch in logs: ${logs.join('\n')}`,
      )
    })
  })

  // ─── update_recipients ────────────────────────────────────────────────────

  describe('update_recipients', () => {
    let vaultId: Buffer
    let authority: KeyPairSigner

    before(async () => {
      vaultId = crypto.randomBytes(32)
      authority = await generateKeyPairSigner()
      svm.airdrop(authority.address, lamports(10_000_000_000n))

      const r = await generateKeyPairSigner()
      const ix = await buildInitializeVault(vaultId, [{ wallet: r.address, basisPoints: 10000 }], authority)
      const result = await sendTx(ix, authority)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Setup failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('updates the split config on an empty vault', async () => {
      const newR1 = await generateKeyPairSigner()
      const newR2 = await generateKeyPairSigner()

      const ix = await buildUpdateRecipients(
        vaultId,
        [
          { wallet: newR1.address, basisPoints: 5000 },
          { wallet: newR2.address, basisPoints: 5000 },
        ],
        authority,
      )
      const result = await sendTx(ix, authority)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `update_recipients failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('rejects update when vault has a non-zero balance (VaultNotEmpty)', async () => {
      const vault = await deriveVaultPda(vaultId)
      const vaultAta = await findAta(vault, mintAddress)

      // Fund the vault
      await mintTokens(vaultAta, 500_000n)

      const r = await generateKeyPairSigner()
      const ix = await buildUpdateRecipients(vaultId, [{ wallet: r.address, basisPoints: 10000 }], authority)
      const result = await sendTx(ix, authority)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('VaultNotEmpty')),
        `Expected VaultNotEmpty in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects update from a non-authority signer', async () => {
      const impostor = await generateKeyPairSigner()
      svm.airdrop(impostor.address, lamports(5_000_000_000n))

      const r = await generateKeyPairSigner()
      const vault = await deriveVaultPda(vaultId)
      const vaultAta = await findAta(vault, mintAddress)

      // Build the instruction but swap authority → impostor
      const data = Buffer.concat([
        disc('update_recipients'),
        encodeRecipients([{ wallet: r.address, basisPoints: 10000 }]),
      ])

      const ix = addSignersToInstruction([impostor], {
        programAddress: PROGRAM_ID,
        accounts: [
          { address: vault, role: AccountRole.WRITABLE },
          { address: vaultAta, role: AccountRole.READONLY },
          { address: impostor.address, role: AccountRole.READONLY_SIGNER },
        ],
        data,
      })
      const result = await sendTx(ix, impostor)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail with wrong authority')
    })

    it('rejects empty recipients list', async () => {
      const ix = await buildUpdateRecipients(vaultId, [], authority)
      const result = await sendTx(ix, authority)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('NoRecipients')),
        `Expected NoRecipients in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects basis points not summing to 10 000', async () => {
      const r = await generateKeyPairSigner()
      const ix = await buildUpdateRecipients(vaultId, [{ wallet: r.address, basisPoints: 9999 }], authority)
      const result = await sendTx(ix, authority)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('BpsMustSumTo10000')),
        `Expected BpsMustSumTo10000 in logs: ${logs.join('\n')}`,
      )
    })
  })

  // ─── close_vault ──────────────────────────────────────────────────────────

  describe('close_vault', () => {
    let vaultId: Buffer
    let authority: KeyPairSigner

    before(async () => {
      vaultId = crypto.randomBytes(32)
      authority = await generateKeyPairSigner()
      svm.airdrop(authority.address, lamports(10_000_000_000n))

      const r = await generateKeyPairSigner()
      const ix = await buildInitializeVault(vaultId, [{ wallet: r.address, basisPoints: 10000 }], authority)
      const result = await sendTx(ix, authority)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `Setup failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )
    })

    it('closes an empty vault and returns rent to authority', async () => {
      const vault = await deriveVaultPda(vaultId)
      const balanceBefore = svm.getBalance(authority.address)

      const ix = await buildCloseVault(vaultId, authority)
      const result = await sendTx(ix, authority)
      assert.ok(
        !(result instanceof FailedTransactionMetadata),
        `close_vault failed: ${result instanceof FailedTransactionMetadata ? result.toString() : ''}`,
      )

      // Vault account should be gone (exists = false after close)
      assert.ok(!svm.getAccount(vault).exists, 'Vault account should be closed')

      // Authority should have received rent lamports back (net positive after tx fee)
      const balanceAfter = svm.getBalance(authority.address)
      assert.ok(balanceAfter > balanceBefore, 'Authority balance should increase after reclaiming rent')
    })

    it('rejects close when vault has a non-zero balance (VaultNotEmpty)', async () => {
      // Create a fresh vault so we can fund it
      const freshVaultId = crypto.randomBytes(32)
      const freshAuthority = await generateKeyPairSigner()
      svm.airdrop(freshAuthority.address, lamports(10_000_000_000n))

      const r = await generateKeyPairSigner()
      const initIx = await buildInitializeVault(
        freshVaultId,
        [{ wallet: r.address, basisPoints: 10000 }],
        freshAuthority,
      )
      await sendTx(initIx, freshAuthority)

      const freshVault = await deriveVaultPda(freshVaultId)
      const freshVaultAta = await findAta(freshVault, mintAddress)
      await mintTokens(freshVaultAta, 1_000_000n)

      const ix = await buildCloseVault(freshVaultId, freshAuthority)
      const result = await sendTx(ix, freshAuthority)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail')
      const logs = result.meta().logs()
      assert.ok(
        logs.some((l) => l.includes('VaultNotEmpty')),
        `Expected VaultNotEmpty in logs: ${logs.join('\n')}`,
      )
    })

    it('rejects close from a non-authority signer', async () => {
      // Create another empty vault to attempt close from wrong key
      const freshVaultId = crypto.randomBytes(32)
      const realAuthority = await generateKeyPairSigner()
      svm.airdrop(realAuthority.address, lamports(10_000_000_000n))

      const r = await generateKeyPairSigner()
      const initIx = await buildInitializeVault(
        freshVaultId,
        [{ wallet: r.address, basisPoints: 10000 }],
        realAuthority,
      )
      await sendTx(initIx, realAuthority)

      const impostor = await generateKeyPairSigner()
      svm.airdrop(impostor.address, lamports(5_000_000_000n))

      const vault = await deriveVaultPda(freshVaultId)
      const vaultAta = await findAta(vault, mintAddress)

      const ix = addSignersToInstruction([impostor], {
        programAddress: PROGRAM_ID,
        accounts: [
          { address: vault, role: AccountRole.WRITABLE },
          { address: vaultAta, role: AccountRole.WRITABLE },
          { address: impostor.address, role: AccountRole.WRITABLE_SIGNER },
          { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
          { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
        ],
        data: disc('close_vault'),
      })

      const result = await sendTx(ix, impostor)
      assert.ok(result instanceof FailedTransactionMetadata, 'Should fail with wrong authority')
    })
  })
})
