import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

/**
 * Verify a Solana Ed25519 wallet signature.
 *
 * @param wallet        - Base58-encoded Solana public key
 * @param message       - The plain-text message that was signed (UTF-8)
 * @param signatureB64  - Base64-encoded signature produced by the wallet adapter
 */
export function verifyWalletSignature(wallet: string, message: string, signatureB64: string): boolean {
  try {
    const pubkeyBytes = new PublicKey(wallet).toBytes()
    const msgBytes = new TextEncoder().encode(message)
    const sigBytes = Buffer.from(signatureB64, 'base64')
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes)
  } catch {
    return false
  }
}
