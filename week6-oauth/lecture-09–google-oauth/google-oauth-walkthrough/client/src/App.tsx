import { useEffect, useState } from 'react'

type Customer = { id: string; email: string; name: string }

// The server sends the user back here with ?error=… when the login fails
const ERRORS: Record<string, string> = {
  cancelled: 'You cancelled the login on Google.',
  state: 'The login could not be verified. Try again.',
  'not-verified': 'Your e-mail address is not verified by Google.',
  google: 'Google is not responding. Try again later.',
}

export default function App() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [checked, setChecked] = useState(false)
  const error = new URLSearchParams(window.location.search).get('error')

  // Logged in? The browser sends the shop's httpOnly cookie by itself
  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { customer: null }))
      .then((body) => setCustomer(body.customer))
      .catch(() => setCustomer(null))
      .finally(() => setChecked(true))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setCustomer(null)
  }

  if (!checked) return <main>Loading…</main>

  return (
    <main>
      <h1>My pages</h1>
      {error && <p role="alert">{ERRORS[error] ?? 'The login failed.'}</p>}

      {customer ? (
        <>
          <p>
            Logged in as {customer.name} ({customer.email})
          </p>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        // A LINK, not fetch: the browser itself has to go to Google and back
        <a href="/api/auth/google">Log in with Google</a>
      )}
    </main>
  )
}
