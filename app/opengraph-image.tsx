import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Settlix — Accept any token. Receive USDC.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #f6f8ff 0%, #edf0ff 45%, #f3f0ff 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,45,215,0.12) 0%, transparent 65%)',
          top: '-260px',
          left: '-180px',
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(107,90,230,0.09) 0%, transparent 65%)',
          bottom: '-180px',
          right: '-120px',
          filter: 'blur(80px)',
        }}
      />

      {/* Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(67,45,215,0.08)',
          border: '1px solid rgba(67,45,215,0.22)',
          borderRadius: '999px',
          padding: '8px 20px',
          marginBottom: '36px',
          fontSize: '15px',
          fontWeight: '700',
          color: '#432dd7',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Powered by Jupiter &amp; Solana
      </div>

      {/* Wordmark */}
      <div
        style={{
          fontSize: '96px',
          fontWeight: '800',
          color: '#0c0a09',
          letterSpacing: '-4px',
          marginBottom: '28px',
          display: 'flex',
          lineHeight: 1,
        }}
      >
        {'Settl'}
        <span style={{ color: '#432dd7' }}>{'i'}</span>
        {'X'}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: '30px',
          fontWeight: '600',
          color: '#6b6d8a',
          marginBottom: '16px',
          letterSpacing: '0.02em',
        }}
      >
        Accept any token. Receive USDC.
      </div>

      {/* Trust line */}
      <div
        style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#9090b8',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '56px',
        }}
      >
        Non-custodial · Powered by Solana
      </div>

      {/* URL pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255,255,255,0.82)',
          border: '1.5px solid rgba(67,45,215,0.22)',
          borderRadius: '999px',
          padding: '14px 36px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#432dd7',
          letterSpacing: '-0.03em',
          boxShadow: '0 8px 40px rgba(67,45,215,0.14)',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#432dd7',
            flexShrink: 0,
          }}
        />
        settlix.itssvk.dev
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
