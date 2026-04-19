'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'

interface AuthState {
  /** Wallet address from the JWT session — null when not logged in */
  wallet: string | null
  isLoading: boolean
  /** Run the nonce→sign→login flow for the currently connected wallet */
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  wallet: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { publicKey, signMessage, disconnect } = useWallet()
  const router = useRouter()

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet ?? null))
      .catch(() => setWallet(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected')

    // 1. Get nonce
    const nonceRes = await fetch('/api/auth/nonce', { credentials: 'include' })
    const { nonce } = await nonceRes.json()

    // 2. Sign message
    const message = `Sign in to Settlix:\n${nonce}`
    const msgBytes = new TextEncoder().encode(message)
    const sigBytes = await signMessage(msgBytes)
    const signature = Buffer.from(sigBytes).toString('base64')

    // 3. Login → server sets HttpOnly JWT cookie
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: publicKey.toBase58(), signature, nonce }),
    })
    if (!loginRes.ok) throw new Error('Login failed')
    const data = await loginRes.json()
    setWallet(data.wallet)
    router.push('/dashboard')
  }, [publicKey, signMessage, router])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setWallet(null)
    await disconnect()
    router.push('/')
  }, [disconnect, router])

  return <AuthContext.Provider value={{ wallet, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
