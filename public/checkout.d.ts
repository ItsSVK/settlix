interface SettlixCheckout {
  open(opts: { linkId: string; onSuccess?: (txSignature: string) => void; onClose?: () => void }): void
  close(): void
}

declare global {
  interface Window {
    Settlix: SettlixCheckout
  }
}

export {}
