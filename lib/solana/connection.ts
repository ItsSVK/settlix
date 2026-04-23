import { Cluster, clusterApiUrl, Connection } from '@solana/web3.js'

import { parseCluster, RPC_COMMITMENT, type SolanaCluster } from '@/lib/solana/constants'

function resolveServerRpcUrl(): string {
  const explicit = process.env.SOLANA_RPC_URL?.trim() || process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim()
  if (explicit) return explicit
  const cluster = parseCluster(process.env.NEXT_PUBLIC_SOLANA_NETWORK)
  return cluster === 'devnet' ? clusterApiUrl('devnet') : clusterApiUrl('mainnet-beta')
}

export function rpcUrlFromCluster(cluster: SolanaCluster): string {
  return cluster === 'devnet'
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl('devnet')
    : process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl('mainnet-beta')
}

export function createBrowserConnection(): Connection {
  const cluster = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? 'mainnet-beta') as Cluster
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(cluster === 'devnet' ? 'devnet' : 'mainnet-beta')
  return new Connection(url, RPC_COMMITMENT)
}

const globalForConnection = globalThis as unknown as {
  serverConnection: Connection | undefined
}

/** Use only from Server Components, Route Handlers, and server-only modules. */
export function createServerConnection(): Connection {
  if (globalForConnection.serverConnection) {
    return globalForConnection.serverConnection
  }
  const conn = new Connection(resolveServerRpcUrl(), RPC_COMMITMENT)
  if (process.env.NODE_ENV !== 'production') {
    globalForConnection.serverConnection = conn
  }
  return conn
}
