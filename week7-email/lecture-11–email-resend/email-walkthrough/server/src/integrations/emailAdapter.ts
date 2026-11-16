// Docs: https://resend.com/docs/api-reference/emails/send-email
//       https://resend.com/docs/api-reference/errors

const API_KEY = process.env.RESEND_API_KEY as string
const FROM = process.env.EMAIL_FROM as string // e.g. Hoodie Shop <onboarding@resend.dev>

 // In your shop: 
 // Add Idempotency key to prevent sending same order confirmation email multiple times by accident. Lasts 24h.
 // Docs: https://resend.com/docs/api-reference/emails/send-email#param-idempotency-key

export type Email = {
  to: string
  subject: string
  html: string
  text: string // the same content without HTML – for e-mail programs that don't show HTML, and for spam filters
}

export async function sendEmail({ to, subject, html, text }: Email): Promise<string> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`, // the shop's own key – no user logs in
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
    signal: AbortSignal.timeout(5_000),
  })
  const answer: any = await response.json()

  if (!response.ok) throw new Error(`Resend answered ${response.status}: ${answer.message}`)
  
  // In your shop: validate the answer with Zod before you use it.
  // Resend's id for the e-mail – you find it under Emails in Resend.
  // Labb 8: logging it is enough. In a real shop: often saved on the order (e.g. confirmation_email_id),
  // to find the e-mail when a customer says "I got no confirmation".
  return answer.id 
}
