import { Resend } from "resend";
import type { PendingCartItem } from "./orders";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const from = () => process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
const siteName = () => process.env.NEXT_PUBLIC_SITE_NAME ?? "Photography Store";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e5e5;">
        <tr>
          <td style="padding:36px 48px 28px;border-bottom:1px solid #e5e5e5;">
            <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#aaa;font-family:Arial,sans-serif;">${siteName()}</p>
          </td>
        </tr>
        <tr><td style="padding:36px 48px 40px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 48px;background:#f9f9f9;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:12px;color:#bbb;font-family:Arial,sans-serif;">
              Questions? Contact <a href="mailto:${from()}" style="color:#888;">${from()}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmed(opts: {
  to: string;
  orderId: string;
  items: PendingCartItem[];
}) {
  const shortId = opts.orderId.slice(-8).toUpperCase();
  const itemRows = opts.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;font-family:Arial,sans-serif;">${item.title}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#999;font-family:Arial,sans-serif;text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;font-family:Arial,sans-serif;text-align:right;">${formatMoney(item.priceInCents * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:400;color:#111;">Order confirmed</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#666;font-family:Arial,sans-serif;">
      Thank you — your prints are being prepared and will ship within 3–5 business days.
    </p>
    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#bbb;font-family:Arial,sans-serif;">Order #${shortId}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">${itemRows}</table>
    <p style="margin:0;font-size:13px;color:#aaa;font-family:Arial,sans-serif;">You'll receive another email when your order ships.</p>`;

  await getResend().emails.send({
    from: from(),
    to: opts.to,
    subject: `Order confirmed — #${shortId}`,
    html: layout(content),
  });
}

export async function sendOrderShipped(opts: {
  to: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}) {
  const content = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:400;color:#111;">Your order is on its way</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#666;font-family:Arial,sans-serif;">Your print has shipped.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #e5e5e5;margin-bottom:28px;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#bbb;font-family:Arial,sans-serif;">Carrier</p>
        <p style="margin:0 0 18px;font-size:15px;color:#333;font-family:Arial,sans-serif;">${opts.carrier}</p>
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#bbb;font-family:Arial,sans-serif;">Tracking number</p>
        <p style="margin:0 0 20px;font-size:15px;color:#333;font-family:Arial,sans-serif;">${opts.trackingNumber}</p>
        <a href="${opts.trackingUrl}" style="display:inline-block;padding:11px 22px;background:#111;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.04em;font-family:Arial,sans-serif;">
          Track your package →
        </a>
      </td></tr>
    </table>`;

  const res = await getResend().emails.send({
    from: from(),
    to: opts.to,
    subject: `Your order has shipped`,
    html: layout(content),
  });

  if (res.error) {
    console.error(res.error);
  }
}
