import { Resend } from "resend";
import type { PendingCartItem } from "./orders";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const from = () => process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
const siteName = () => process.env.NEXT_PUBLIC_SITE_NAME ?? "The Places We Went";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function layout(content: string) {
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:${font};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fafaf9;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 32px;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#78716c;font-family:${font};">${siteName()}</p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:4px;">

            <!-- Card content -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr><td style="padding:44px 48px 40px;">${content}</td></tr>
              <tr>
                <td style="padding:20px 48px 24px;border-top:1px solid #e7e5e4;">
                  <p style="margin:0;font-size:12px;color:#a8a29e;font-family:${font};">
                    Questions? <a href="mailto:${from()}" style="color:#78716c;text-decoration:underline;">${from()}</a>
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#a8a29e;letter-spacing:0.05em;font-family:${font};">
              © ${new Date().getFullYear()} ${siteName()}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function formatShipDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export async function sendOrderConfirmed(opts: {
  to: string;
  orderId: string;
  items: PendingCartItem[];
  estimatedShipDate?: string;
}) {
  const shortId = opts.orderId.slice(-8).toUpperCase();

  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
  const processingLine = opts.estimatedShipDate
    ? `Estimated ship date: <strong style="color:#292524;">${formatShipDate(opts.estimatedShipDate)}</strong>.`
    : "Your prints will ship within 3–5 business days.";

  const content = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#a8a29e;font-family:${font};">order confirmed</p>
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:400;color:#292524;letter-spacing:-0.01em;font-family:${font};">thank you.</h1>
    <p style="margin:0 0 32px;font-size:14px;line-height:1.7;color:#78716c;font-family:${font};">
      Your print is being prepared for production. ${processingLine}
      You'll receive another email with tracking information once it ships.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e7e5e4;border-radius:4px;margin-bottom:32px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e7e5e4;">
          <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#a8a29e;font-family:${font};">order #${shortId}</p>
        </td>
      </tr>
      ${opts.items.map((item) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f5f5f4;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:14px;color:#292524;font-family:${font};">${item.title}</td>
              <td style="font-size:13px;color:#78716c;font-family:${font};white-space:nowrap;text-align:right;">
                ×${item.quantity}&nbsp;&nbsp;${formatMoney(item.priceInCents * item.quantity)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join("")}
    </table>

    <a href="https://theplaceswewent.com/prints" style="display:inline-block;padding:12px 28px;background:#292524;color:#fafaf9;text-decoration:none;font-size:13px;letter-spacing:0.04em;font-family:${font};border-radius:100px;">
      browse more prints
    </a>`;

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
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
  const content = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#a8a29e;font-family:${font};">on its way</p>
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:400;color:#292524;letter-spacing:-0.01em;font-family:${font};">your print has shipped.</h1>
    <p style="margin:0 0 32px;font-size:14px;line-height:1.7;color:#78716c;font-family:${font};">
      It's packed and on its way to you. Use the tracking info below to follow along.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e7e5e4;border-radius:4px;margin-bottom:32px;">
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e7e5e4;">
          <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#a8a29e;font-family:${font};">carrier</p>
          <p style="margin:0;font-size:14px;color:#292524;font-family:${font};">${opts.carrier}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#a8a29e;font-family:${font};">tracking number</p>
          <p style="margin:0;font-size:14px;color:#292524;font-family:${font};">${opts.trackingNumber}</p>
        </td>
      </tr>
    </table>

    <a href="${opts.trackingUrl}" style="display:inline-block;padding:12px 28px;background:#292524;color:#fafaf9;text-decoration:none;font-size:13px;letter-spacing:0.04em;font-family:${font};border-radius:100px;">
      track your package
    </a>`;

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
