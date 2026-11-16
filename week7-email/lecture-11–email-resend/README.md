# Lecture 11 – E-mail: order confirmations with Resend


## Video links




## Goals

After this lecture you can:

- explain how a shop sends e-mail through an API, and why it doesn't use its own mail server
- send an order confirmation from your shop with Resend's REST API and the shop's own API key
- explain where in the order flow the confirmation is sent, and why an e-mail that fails must not fail the order
- use an idempotency key so the customer gets one confirmation, even when the shop tries twice
- explain what a verified domain gives you, and what you can do without one

You build this in your own shop in **Labb 8**.

## 1. Theory

Study `slides.md`: why an e-mail API, Resend's key and test mode, the send call, the order confirmation's content, where in the flow it is sent, the idempotency key, errors, and domains and spam.

## 2. Code walkthrough: `email-walkthrough/`

A pretend checkout that sends an order confirmation with Resend.

**Create a Resend account and an API key – once**

1. [resend.com](https://resend.com) → sign up. The free plan is enough
2. **API Keys → Create API Key** → Permission **Sending access**
3. Copy the key to `RESEND_API_KEY` in `.env` at once – it is only shown when it is created
4. Keep `EMAIL_FROM` as it is: `onboarding@resend.dev` works without your own domain, but **only to the e-mail address of your Resend account** – use that address in the checkout

```bash
# Terminal 1 – the server
cd email-walkthrough/server
cp .env.example .env    # fill in RESEND_API_KEY
npm install
npm run dev

# Terminal 2 – the client
cd email-walkthrough/client
npm install
npm run dev             # http://localhost:5173
```

`server/src/integrations/emailAdapter.ts` is the only file that knows Resend. Every e-mail is logged in the server terminal, and in Resend under **Emails**.

The **"In your shop:"** comments in `email-walkthrough/` show what your shop does instead: 
1. Send the confirmation from the Stripe webhook (L5), after the order is marked as paid
2. Implement Idempotency Key
3. Include order items in the generated HTML order confirmation mail 

**Try it:** place an order to your own address. Place an order to another address: Resend answers 403, and the order still goes through. Change `RESEND_API_KEY` to something wrong and restart: 401.

## 3. Reading instructions

- [Send Email (Resend API reference)](https://resend.com/docs/api-reference/emails/send-email)
- [Idempotency keys (Resend)](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Errors (Resend API reference)](https://resend.com/docs/api-reference/errors)
- [Managing domains (Resend)](https://resend.com/docs/dashboard/domains/introduction) – May be applied only if you have your own domain, not required for Labb 8
