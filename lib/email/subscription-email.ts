export interface SubscriptionConfirmationEmailData {
  subscriberName: string | null
  subscriberEmail: string
  planTitle: string | null
  amount: string
  tokenSymbol: string
  interval: string
  nextBillingDate: string
  manageUrl: string
  txSignature: string
}

export interface SubscriptionUserCancelledEmailData {
  subscriberName: string | null
  subscriberEmail: string
  planTitle: string | null
  amount: string
  tokenSymbol: string
  interval: string
  accessUntil: string
  subscribeUrl: string
}

export interface SubscriptionRenewalEmailData {
  subscriberName: string | null
  subscriberEmail: string
  planTitle: string | null
  amount: string
  tokenSymbol: string
  interval: string
  manageUrl: string
  subscribeUrl: string
  attemptNumber: 1 | 2
  nextRetryTime: string
  failureReason?: string
}

export interface SubscriptionCancelledEmailData {
  subscriberName: string | null
  subscriberEmail: string
  planTitle: string | null
  amount: string
  tokenSymbol: string
  interval: string
  subscribeUrl: string
  failureReason?: string
}

import { INTERVAL_UNIT as INTERVAL_LABELS } from '@/lib/subscriptions/constants'

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#09090b;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Settlix</p>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;letter-spacing:0.5px;text-transform:uppercase;">Subscription</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <strong style="color:#6b7280;">Settlix</strong> · Solana payments infrastructure</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

import { SOLSCAN_CLUSTER } from '@/lib/solana/constants'

export function buildConfirmationSubject(data: SubscriptionConfirmationEmailData): string {
  const plan = data.planTitle ? `"${data.planTitle}"` : 'your subscription'
  return `You're subscribed to ${plan}`
}

export function buildConfirmationHtml(data: SubscriptionConfirmationEmailData): string {
  const greeting = data.subscriberName ? `Hi ${data.subscriberName},` : 'Hi,'
  const plan = data.planTitle ?? 'Your subscription'
  const interval = INTERVAL_LABELS[data.interval] ?? data.interval
  const explorerUrl = `https://solscan.io/tx/${data.txSignature}${SOLSCAN_CLUSTER}`

  const body = `
    <p style="margin:0 0 24px;font-size:16px;color:#374151;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      You're now subscribed to <strong style="color:#09090b;">${plan}</strong>.
      Your first payment of <strong style="color:#09090b;">${Number(data.amount).toFixed(2)} ${data.tokenSymbol}</strong>
      has been processed successfully.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#166534;padding:4px 0;">Amount</td>
          <td style="font-size:13px;color:#166534;font-weight:600;text-align:right;">${Number(data.amount).toFixed(2)} ${data.tokenSymbol} / ${interval}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#166534;padding:4px 0;">Next billing</td>
          <td style="font-size:13px;color:#166534;font-weight:600;text-align:right;">${new Date(data.nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
      </table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td align="center">
          <a href="${data.manageUrl}" style="display:inline-block;background-color:#09090b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">
            Manage subscription →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      <a href="${explorerUrl}" style="color:#9ca3af;">View transaction on Solscan</a>
    </p>
  `
  return baseLayout(buildConfirmationSubject(data), body)
}

export function buildUserCancelledSubject(data: SubscriptionUserCancelledEmailData): string {
  const plan = data.planTitle ? `"${data.planTitle}"` : 'your subscription'
  return `Subscription cancelled: ${plan}`
}

export function buildUserCancelledHtml(data: SubscriptionUserCancelledEmailData): string {
  const greeting = data.subscriberName ? `Hi ${data.subscriberName},` : 'Hi,'
  const plan = data.planTitle ?? 'Your subscription'
  const interval = INTERVAL_LABELS[data.interval] ?? data.interval

  const body = `
    <p style="margin:0 0 24px;font-size:16px;color:#374151;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      Your subscription to <strong style="color:#09090b;">${plan}</strong>
      (<strong style="color:#09090b;">${Number(data.amount).toFixed(2)} ${data.tokenSymbol}</strong> / ${interval})
      has been cancelled as requested.
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#374151;">
        You will retain access until <strong>${new Date(data.accessUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
        No further charges will be made.
      </p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Changed your mind? You can resubscribe at any time.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${data.subscribeUrl}" style="display:inline-block;background-color:#09090b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">
            Resubscribe →
          </a>
        </td>
      </tr>
    </table>
  `
  return baseLayout(buildUserCancelledSubject(data), body)
}

export function buildRenewalWarningSubject(data: SubscriptionRenewalEmailData): string {
  const plan = data.planTitle ? `"${data.planTitle}"` : 'your subscription'
  return `Action needed: renewal failed for ${plan} (attempt ${data.attemptNumber} of 3)`
}

export function buildRenewalWarningHtml(data: SubscriptionRenewalEmailData): string {
  const greeting = data.subscriberName ? `Hi ${data.subscriberName},` : 'Hi,'
  const plan = data.planTitle ?? 'Your subscription'
  const interval = INTERVAL_LABELS[data.interval] ?? data.interval

  const body = `
    <p style="margin:0 0 24px;font-size:16px;color:#374151;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      We were unable to renew <strong style="color:#09090b;">${plan}</strong> for
      <strong style="color:#09090b;">${Number(data.amount).toFixed(2)} ${data.tokenSymbol}</strong> / ${interval}.
    </p>

    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">Attempt ${data.attemptNumber} of 3 — retrying at ${data.nextRetryTime}</p>
      ${data.failureReason ? `<p style="margin:6px 0 0;font-size:12px;color:#b45309;font-family:monospace;">${data.failureReason}</p>` : ''}
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      The most common causes are <strong>insufficient token balance</strong> or a <strong>revoked delegation</strong>.
      Make sure your wallet has enough ${data.tokenSymbol} before the next retry.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${data.manageUrl}" style="display:inline-block;background-color:#09090b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">
            Manage subscription →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      If you no longer want this subscription, you can cancel from the link above.
    </p>
  `
  return baseLayout(buildRenewalWarningSubject(data), body)
}

export function buildCancelledSubject(data: SubscriptionCancelledEmailData): string {
  const plan = data.planTitle ? `"${data.planTitle}"` : 'your subscription'
  return `Your subscription ${plan} has been cancelled`
}

export function buildCancelledHtml(data: SubscriptionCancelledEmailData): string {
  const greeting = data.subscriberName ? `Hi ${data.subscriberName},` : 'Hi,'
  const plan = data.planTitle ?? 'Your subscription'
  const interval = INTERVAL_LABELS[data.interval] ?? data.interval

  const body = `
    <p style="margin:0 0 24px;font-size:16px;color:#374151;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      After 3 failed renewal attempts, <strong style="color:#09090b;">${plan}</strong>
      (<strong style="color:#09090b;">${Number(data.amount).toFixed(2)} ${data.tokenSymbol}</strong> / ${interval}) has been cancelled.
    </p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Subscription cancelled</p>
      ${data.failureReason ? `<p style="margin:6px 0 0;font-size:12px;color:#b91c1c;font-family:monospace;">${data.failureReason}</p>` : ''}
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      You can resubscribe at any time — your wallet will need sufficient ${data.tokenSymbol} balance before doing so.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <a href="${data.subscribeUrl}" style="display:inline-block;background-color:#09090b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">
            Resubscribe →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      Once resubscribed your wallet will need to authorize a new delegation.
    </p>
  `
  return baseLayout(buildCancelledSubject(data), body)
}
