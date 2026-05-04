import { Keypair } from '@solana/web3.js'
import { ConfigurationError } from '@/lib/api/errors'
import { parseCluster, type SolanaCluster } from '@/lib/solana/constants'

/** Cluster for server-side allowlists (create-link settlement mint). */
export function getSolanaCluster(): SolanaCluster {
  return parseCluster(process.env.NEXT_PUBLIC_SOLANA_NETWORK)
}

export function getJupiterApiKey(): string {
  const key = process.env.JUPITER_API_KEY?.trim()
  if (!key) {
    throw new ConfigurationError('JUPITER_API_KEY is not configured')
  }
  return key
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret) {
    throw new ConfigurationError('AUTH_SECRET is not configured')
  }
  return secret
}

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    throw new ConfigurationError('RESEND_API_KEY is not configured')
  }
  return key
}

export function getSubscriptionRelayerKeypair(): Keypair {
  const raw = process.env.SUBSCRIPTION_RELAYER_KEYPAIR_JSON?.trim()
  if (!raw) throw new ConfigurationError('SUBSCRIPTION_RELAYER_KEYPAIR_JSON is not configured')
  try {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw) as number[]))
  } catch {
    throw new ConfigurationError('SUBSCRIPTION_RELAYER_KEYPAIR_JSON is not a valid keypair JSON array')
  }
}

export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) throw new ConfigurationError('CRON_SECRET is not configured')
  return secret
}

export function getEmailSender(): string {
  return process.env.EMAIL_SENDER?.trim() || 'Settlix <payments@settlix.itssvk.dev>'
}
