export interface InvoiceEmailData {
  invoiceId: string
  clientName: string | null
  clientEmail: string
  amount: string
  tokenSymbol: string
  dueDate: string | null
  memo: string | null
  lineItems: { description: string; quantity: string; unitPrice: string }[]
  invoiceUrl: string
  merchantWallet: string
}

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const {
    clientName,
    amount,
    tokenSymbol,
    dueDate,
    memo,
    lineItems,
    invoiceUrl,
    merchantWallet,
  } = data

  const greeting = clientName ? `Hi ${clientName},` : 'Hi,'

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${Number(item.unitPrice).toFixed(2)} ${tokenSymbol}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)} ${tokenSymbol}</td>
      </tr>`,
    )
    .join('')

  const shortenedWallet = `${merchantWallet.slice(0, 6)}...${merchantWallet.slice(-4)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice from ${shortenedWallet}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#09090b;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Settlix</p>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;letter-spacing:0.5px;text-transform:uppercase;">Invoice</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

              <p style="margin:0 0 24px;font-size:16px;color:#374151;">${greeting}</p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                You have received an invoice for <strong style="color:#09090b;">${Number(amount).toFixed(2)} ${tokenSymbol}</strong>${formattedDue ? ` due on <strong style="color:#09090b;">${formattedDue}</strong>` : ''}.
              </p>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:32px;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Unit Price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color:#f9fafb;">
                    <td colspan="3" style="padding:12px;text-align:right;font-size:14px;font-weight:700;color:#09090b;">Total</td>
                    <td style="padding:12px;text-align:right;font-size:15px;font-weight:700;color:#09090b;font-family:monospace;">${Number(amount).toFixed(2)} ${tokenSymbol}</td>
                  </tr>
                </tfoot>
              </table>

              ${memo ? `<p style="margin:0 0 32px;font-size:14px;color:#6b7280;font-style:italic;background:#f9fafb;padding:16px;border-radius:10px;border-left:3px solid #e5e7eb;">${memo}</p>` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}" style="display:inline-block;background-color:#09090b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">
                      Pay Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                Or copy this link: <a href="${invoiceUrl}" style="color:#6b7280;word-break:break-all;">${invoiceUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by <span style="font-family:monospace;">${shortenedWallet}</span> via Settlix &nbsp;·&nbsp; Powered by Solana
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildInvoiceEmailSubject(data: InvoiceEmailData): string {
  const from = data.merchantWallet.slice(0, 6) + '...' + data.merchantWallet.slice(-4)
  return `Invoice for ${Number(data.amount).toFixed(2)} ${data.tokenSymbol} from ${from}`
}

export interface ReceiptEmailData {
  clientName: string | null
  clientEmail: string
  amount: string
  tokenSymbol: string
  memo: string | null
  lineItems: { description: string; quantity: string; unitPrice: string }[]
  invoiceUrl: string
  txSignature: string
  merchantWallet: string
  inputTokenSymbol: string | null
  inputAmount: string | null
  inputTokenLogo: string | null
  outputAmount: string | null
  outputTokenSymbol: string | null
  outputTokenLogo: string | null
}

export function buildReceiptEmailHtml(data: ReceiptEmailData): string {
  const {
    clientName, amount, tokenSymbol, memo, lineItems, invoiceUrl, txSignature, merchantWallet,
    inputTokenSymbol, inputAmount, inputTokenLogo,
    outputAmount, outputTokenSymbol, outputTokenLogo,
  } = data

  const greeting = clientName ? `Hi ${clientName},` : 'Hi,'
  const shortenedWallet = `${merchantWallet.slice(0, 6)}...${merchantWallet.slice(-4)}`
  const shortenedTx = `${txSignature.slice(0, 8)}...${txSignature.slice(-6)}`
  const solscanUrl = `https://solscan.io/tx/${txSignature}`

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${Number(item.unitPrice).toFixed(2)} ${tokenSymbol}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)} ${tokenSymbol}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#09090b;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Settlix</p>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;letter-spacing:0.5px;text-transform:uppercase;">Payment Receipt</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

              <!-- Paid badge -->
              <div style="text-align:center;margin-bottom:28px;">
                <span style="display:inline-block;background-color:#dcfce7;color:#16a34a;font-size:13px;font-weight:700;padding:6px 18px;border-radius:999px;letter-spacing:0.3px;">
                  ✓ Payment Confirmed
                </span>
              </div>

              <p style="margin:0 0 12px;font-size:16px;color:#374151;">${greeting}</p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                Your payment of <strong style="color:#09090b;">${Number(amount).toFixed(2)} ${tokenSymbol}</strong> has been received. Here's your receipt.
              </p>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:32px;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Unit Price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color:#f9fafb;">
                    <td colspan="3" style="padding:12px;text-align:right;font-size:14px;font-weight:700;color:#09090b;">Total</td>
                    <td style="padding:12px;text-align:right;font-size:15px;font-weight:700;color:#16a34a;font-family:monospace;">${Number(amount).toFixed(2)} ${tokenSymbol}</td>
                  </tr>
                </tfoot>
              </table>

              ${memo ? `<p style="margin:0 0 32px;font-size:14px;color:#6b7280;font-style:italic;background:#f9fafb;padding:16px;border-radius:10px;border-left:3px solid #e5e7eb;">${memo}</p>` : ''}

              <!-- Swap summary -->
              ${inputAmount && inputTokenSymbol ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:32px;">
                <tr style="background-color:#f9fafb;">
                  <td style="padding:10px 16px;text-align:center;width:44%;">
                    ${inputTokenLogo ? `<img src="${inputTokenLogo}" width="20" height="20" style="display:inline-block;vertical-align:middle;border-radius:50%;margin-right:6px;" />` : ''}
                    <span style="font-family:monospace;font-size:13px;font-weight:600;color:#09090b;vertical-align:middle;">${inputAmount}</span>
                    <span style="font-size:12px;color:#6b7280;vertical-align:middle;margin-left:3px;">${inputTokenSymbol}</span>
                  </td>
                  <td style="padding:10px 0;text-align:center;font-size:16px;color:#9ca3af;width:12%;">→</td>
                  <td style="padding:10px 16px;text-align:center;width:44%;">
                    ${outputTokenLogo ? `<img src="${outputTokenLogo}" width="20" height="20" style="display:inline-block;vertical-align:middle;border-radius:50%;margin-right:6px;" />` : ''}
                    <span style="font-family:monospace;font-size:13px;font-weight:600;color:#16a34a;vertical-align:middle;">${outputAmount ?? Number(amount).toFixed(2)}</span>
                    <span style="font-size:12px;color:#6b7280;vertical-align:middle;margin-left:3px;">${outputTokenSymbol ?? tokenSymbol}</span>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Tx signature -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Transaction</p>
                <a href="${solscanUrl}" style="font-family:monospace;font-size:13px;color:#6b7280;text-decoration:none;word-break:break-all;">${shortenedTx}</a>
                <a href="${solscanUrl}" style="display:inline-block;margin-left:8px;font-size:11px;color:#3b82f6;text-decoration:none;">View on Solscan ↗</a>
              </div>

              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                <a href="${invoiceUrl}" style="color:#6b7280;text-decoration:none;">View invoice →</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by <span style="font-family:monospace;">${shortenedWallet}</span> via Settlix &nbsp;·&nbsp; Powered by Solana
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildReceiptEmailSubject(data: ReceiptEmailData): string {
  return `Payment receipt — ${Number(data.amount).toFixed(2)} ${data.tokenSymbol}`
}
