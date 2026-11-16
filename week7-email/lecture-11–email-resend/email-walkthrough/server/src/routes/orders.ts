import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { sendEmail } from '../integrations/emailAdapter.ts'
import { orderConfirmation, type Order } from '../lib/orderConfirmation.ts'

const router = Router()

/* --- POST /api/orders – a paid order --- */
router.post('/', async (req, res) => {
  const { name, email } = req.body
  // In your shop: the order and the prices come from your DB – here a fixed cart
  const order: Order = {
    id: randomUUID().slice(0, 8),
    name,
    email,
    items: [
      { title: 'Hoodie, black, M', quantity: 1, price: 499 },
      { title: 'Cap', quantity: 2, price: 149 },
    ],
  }

  // In your shop: send the confirmation where the order becomes PAID – in the Stripe webhook (L5),
  // after the transaction that sets status = 'paid'. Not when the customer clicks "Buy".
  try {
    const { subject, html, text } = orderConfirmation(order)
    // The key is tied to the ORDER: Stripe sends the webhook again → the same key → no second e-mail
    const id = await sendEmail({ to: order.email, subject, html, text})
    console.log('[EMAIL] Sent', subject, 'to', order.email, '– Resend id:', id)
    res.status(201).json({ orderId: order.id, emailSent: true })
  } catch (err) {
    // The order is paid even if the e-mail fails – never answer 500 for it. Log it, so it can be sent again.
    console.error('[EMAIL] Failed:', err)
    res.status(201).json({ orderId: order.id, emailSent: false })
  }
})

export default router
