import "server-only"

/**
 * Email delivery for ShipFlow.
 *
 * Production-grade with a safe fallback:
 * - If RESEND_API_KEY + EMAIL_FROM are configured, sends real email via Resend.
 * - Otherwise, logs the email (incl. any action link) to the server console
 *   so development is never blocked on DNS/email setup.
 *
 * The sending function is real from day one. Flipping to live email is just
 * setting the two env vars once the sending domain is verified.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM // e.g. "ShipFlow <noreply@mail.yourdomain.com>"

type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
}

async function deliver({ to, subject, html, text }: SendArgs): Promise<void> {
  // Live path: real Resend send
  if (RESEND_API_KEY && EMAIL_FROM) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Resend send failed (${res.status}): ${detail}`)
    }
    return
  }

  // Fallback path: log to console (development, pre-DNS)
  console.log(
    [
      "",
      "──────────────────────────────────────────────",
      "  EMAIL (dev fallback — Resend not configured)",
      "──────────────────────────────────────────────",
      `  To:      ${to}`,
      `  Subject: ${subject}`,
      "",
      `  ${text}`,
      "──────────────────────────────────────────────",
      "",
    ].join("\n")
  )
}

/**
 * Sends the "set your password" email used for:
 * - provisioned admins (first password)
 * - invited members (first password)
 * - forgot-password resets
 */
export async function sendPasswordSetupEmail(args: {
  to: string
  name: string
  url: string
}): Promise<void> {
  const { to, name, url } = args

  const subject = "Set your ShipFlow password"

  const text = [
    `Hi ${name},`,
    "",
    "Use the link below to set your password and access your ShipFlow workspace.",
    "",
    url,
    "",
    "This link expires in 24 hours. If you didn't expect this, you can ignore this email.",
  ].join("\n")

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 0; color: #111;">
    <div style="font-size: 15px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 28px;">ShipFlow</div>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">Hi ${name},</p>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 24px; color: #444;">Use the button below to set your password and access your ShipFlow workspace.</p>
    <a href="${url}" style="display: inline-block; background: #1f1f1f; color: #fff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 8px;">Set your password</a>
    <p style="font-size: 13px; line-height: 1.5; margin: 28px 0 0; color: #888;">This link expires in 24 hours. If you didn't expect this, you can ignore this email.</p>
  </div>`

  await deliver({ to, subject, html, text })
}