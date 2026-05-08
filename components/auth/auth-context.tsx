'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'

interface AuthState {
  wallet: string | null
  merchantId: string | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  wallet: null,
  merchantId: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { publicKey, signMessage, disconnect } = useWallet()
  const router = useRouter()

  useEffect(() => {
    apiClient
      .get<{ wallet: string | null; merchantId: string | null }>('/api/auth/me')
      .then((d) => {
        setWallet(d.wallet ?? null)
        setMerchantId(d.merchantId ?? null)
      })
      .catch(() => {
        setWallet(null)
        setMerchantId(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected')

    const { nonce } = await apiClient.get<{ nonce: string }>('/api/auth/nonce')

    const message = `Sign in to Settlix:\n${nonce}`
    const msgBytes = new TextEncoder().encode(message)
    const sigBytes = await signMessage(msgBytes)
    const signature = Buffer.from(sigBytes).toString('base64')

    const data = await apiClient.post<{ wallet: string }>('/api/auth/login', {
      wallet: publicKey.toBase58(),
      signature,
      nonce,
    })
    setWallet(data.wallet)
    // Fetch merchantId immediately after login
    const me = await apiClient.get<{ wallet: string | null; merchantId: string | null }>('/api/auth/me')
    setMerchantId(me.merchantId ?? null)
    router.push('/dashboard')
  }, [publicKey, signMessage, router])

  const logout = useCallback(async () => {
    await apiClient.post('/api/auth/logout', {})
    setWallet(null)
    setMerchantId(null)
    await disconnect()
    router.push('/')
  }, [disconnect, router])

  return (
    <AuthContext.Provider value={{ wallet, merchantId, isLoading, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
