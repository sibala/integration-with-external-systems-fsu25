---
marp: true
theme: default
paginate: true
---

# Integration with third-party systems

## Lecture 11 – E-mail: order confirmations with Resend

---

<!-- Theory -->

# From L5 and L10: what we need today

| From | Used today for |
|---|---|
| **L5 – the Stripe webhook** | The order becomes **paid** there – that's where the confirmation is sent |
| L5 – Stripe sends the event again | The confirmation must not be sent twice → **idempotency key** |
| **L10 – the shop's own token** | Resend uses the shop's own **API key** in `.env` – no user logs in |
| L1–L2 – timeout, adapter | `emailAdapter.ts` is the only file that knows Resend |

---

# Why an e-mail API?

| Own mail server (SMTP) | E-mail API (Resend, SendGrid, Postmark …) |
|---|---|
| You run and update the server | One `POST` over HTTPS |
| New server = no reputation → **spam folder** | The service's servers have a reputation |
| You handle bounces and blocklists yourself | The service shows every e-mail: delivered, bounced |
| Many cloud hosts block outgoing SMTP (port 25) | Works everywhere the shop can make an HTTPS call |

The shop **sends** – the integration is REST, as in L1.

---

<style scoped>section { font-size: 26px; }</style>

# Resend – the key and the test mode

1. [resend.com](https://resend.com) → sign up – the free plan: **100 e-mails per day**
2. **API Keys → Create API Key** → Permission **Sending access** – it can send, nothing else
3. Copy it to `RESEND_API_KEY` at once – only shown when it is created

| Sender | Can send to |
|---|---|
| `onboarding@resend.dev` – no domain needed | **Only your Resend account's own e-mail** |
| `order@your-domain.se` – a **verified domain** | Anyone |

Labb 8: `onboarding@resend.dev` and your own address are enough.

---

<style scoped>section { font-size: 24px; }</style>

# The send call

```ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ from: FROM, to: order.email, subject, html, text }),
  signal: AbortSignal.timeout(5_000),
})
const answer = await response.json()   // 200: { id: '49a3999c-…' }
```

---

<style scoped>section { font-size: 26px; }</style>

# The order confirmation's content

| Part | Why |
|---|---|
| `subject` | The order number – the customer can search for it |
| `html` | Simple tags – making it look good is up to you: a `<table>` and **inline styles**, because many e-mail programs ignore `<style>` and CSS files |
| `text` | The same content without HTML – for programs that don't show HTML, and for spam filters |
| **Escape** the customer's data | A name like `<a href="evil.example">` becomes a real link in the e-mail |

```ts
const html = `<h1>Thank you for your order, ${escapeHtml(order.name)}!</h1>`
```

---

<style scoped>section { font-size: 22px; }</style>

# Where in the flow?

```
Customer           Express                          Stripe            Resend
  │ "Buy" ────────►│ 1. order: pending ───────────►│                   │
  │◄── Checkout ───│                                │                   │
  │ pays ─────────────────────────────────────────►│                   │
  │                │◄── 2. webhook: paid ───────────│                   │
  │                │ 3. UPDATE … status = 'paid'    │                   │
  │                │ 4. send the confirmation ─────────────────────────►│ POST /emails
  │                │◄──────────────────────────────────────── { id } ──│
```

- **Not** at "Buy" – the customer may never pay
- **After** the transaction – a rolled-back order never gets a confirmation
- The e-mail fails? The order is **still paid**. Log it – never answer 500 because of the e-mail
- Stripe waits for the webhook's answer: a short timeout, or send after answering

---

# The idempotency key – one e-mail per order

```ts
'Idempotency-Key': `order-confirmation/${order.id}`
```

| Within 24 h | Resend |
|---|---|
| The same key, the same body | Answers with the **same id** – sends **nothing new** |
| The same key, a **different** body | `409` – something is wrong in your code |
| A new key | A new e-mail |

Stripe sends the webhook again? A retry after a timeout? **One** e-mail.
Tie the key to the **order**, not to the request – a random UUID per call protects nothing.

---

# When it goes wrong

| Answer | Means |
|---|---|
| `200` | Accepted – `id` is the e-mail in Resend → **Emails** |
| `401` | Wrong or missing `RESEND_API_KEY` |
| `403` | `onboarding@resend.dev` to someone other than you – or the domain isn't verified |
| `409` | The same idempotency key with a different body |
| `422` | A field is missing or wrong, e.g. `from` |
| `429` | Too many per second – or the day's 100 are used up |

The error body: `{ statusCode, name, message }` – **log `message`**, it says what's wrong.
`200` means *accepted*, not *delivered* – Resend → Emails shows delivered or bounced.

---

<style scoped>section { font-size: 26px; }</style>

# Your own domain – and the spam folder

With a domain, Resend gives you DNS records to add:

| Record | Proves |
|---|---|
| **SPF** | Resend's servers may send for your domain |
| **DKIM** | The e-mail is signed by your domain and not changed on the way |
| **DMARC** | What the receiver does when SPF/DKIM fail |

Without them, Gmail and Outlook put the e-mail in spam – or reject it.
**Labb 8 needs no domain** – but this is why a real shop has one.

---

<style scoped>section { font-size: 26px; }</style>

# Resend's key or the Gmail API?

| | **Resend** (today) | Gmail API |
|---|---|---|
| Authentication | The shop's **API key** in `.env` | **OAuth** – the shop's Gmail account approves once |
| Token | One key, until you revoke it | Access token 1 h + refresh token |
| Sends from | `onboarding@resend.dev` or your domain | The Gmail address |
| Made for | The shop's e-mails, many per day | A person's own e-mail |

---

# Code walkthrough: `email-walkthrough/`

1. `emailAdapter.ts`: `sendEmail()` – the only file that knows Resend
2. `lib/orderConfirmation.ts`: subject, HTML and text
3. `routes/orders.ts`: `POST /api/orders` – the order, then ONE `sendEmail()` with the order's key. The e-mail fails → the order still goes through
4. Try: your own address, another address (`403`), a wrong key (`401`)

---

# Labb 8 – Orderbekräftelse via e-post

The last part of Assignment 2, for G: the shop sends an order confirmation when an order is paid.

*(Go through the requirements and "Klart när" in Labb 8)*
