import { useEffect, useState } from 'react'

type Admin = { id: number; login: string }

// The server sends the user back here with ?error=… when the login fails
const ERRORS: Record<string, string> = {
  cancelled: 'You cancelled the login on GitHub.',
  state: 'The login could not be verified. Try again.',
  'not-admin': 'Your GitHub account is not an admin in this shop.',
  github: 'GitHub is not responding. Try again later.',
}

export default function App() {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const error = new URLSearchParams(window.location.search).get('error')

  // Logged in? The browser sends the shop's httpOnly cookie by itself. 401 = not logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { admin: null }))
      .then((body) => setAdmin(body.admin))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAdmin(null)
  }

  return (
    <main>
      <h1>Admin</h1>
      {error && <p role="alert">{ERRORS[error] ?? 'The login failed.'}</p>}

      {admin ? (
        <>
          <p>
            Logged in as {admin.login} <button onClick={logout}>Log out</button>
          </p>
          {/* YOUR TURN (VG): "Report a problem" – a form that creates an issue, and a list of the open issues.
              The routes are in server/src/routes/issues.ts. */}
        </>
      ) : (
        // A LINK, not fetch: the browser itself has to go to GitHub and back
        <a href="/api/auth/github">Log in with GitHub</a>
      )}
    </main>
  )
}
