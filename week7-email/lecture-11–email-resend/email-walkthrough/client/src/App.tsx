import { useState, type SubmitEvent } from 'react'

export default function App() {
  const [orderId, setOrderId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // A pretend checkout: the order counts as paid at once. In your shop: after Stripe (L5)
  async function placeOrder(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.get('name'), email: form.get('email') }),
    })
    const body = await response.json()
    setOrderId(body.orderId)
    setMessage(body.emailSent ? 'Thank you! The confirmation is on its way.' : 'Thank you! The confirmation could not be sent right now.')
  }

  return (
    <main>
      <h1>Checkout</h1>
      <form onSubmit={placeOrder}>
        <p>
          <label>
            Name <input name="name" required />
          </label>
        </p>
        <p>
          {/* With onboarding@resend.dev: the e-mail of YOUR Resend account */}
          <label>
            E-mail <input name="email" type="email" required />
          </label>
        </p>
        <button>Buy – 797 kr</button>
      </form>

      {orderId && (
        <p role="status">
          Order {orderId}. {message}
        </p>
      )}
    </main>
  )
}
