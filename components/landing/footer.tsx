export function Footer() {
  return (
    <footer className='border-t border-border py-7'>
      <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row'>
        <span>
          <span className='font-semibold text-foreground'>
            Settl<span className='text-primary'>i</span>X
          </span>{' '}
          — Non-custodial Solana checkout
        </span>
        <span>Built on Solana · Swaps by Jupiter</span>
      </div>
    </footer>
  )
}
