import { useState } from "react";

export default function App() {
  const [result, setResult] = useState<unknown>(null)

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: 'anna@example.com', password: 'hemligt123'})
      })

      setResult({ status: response.status, body: await response.json()})
    } catch {
      setResult({ status: 0, body: { error: 'Could not reach the server' }})
    }
  }
  const handleProtectedPage = async () => {
    try {
      const response = await fetch('/api/auth/protected')
      if (!response.ok) {
        // if (Token expired) handleRefresh()
      }
      setResult({ status: response.status, body: await response.json()})
    } catch {
      setResult({ status: 0, body: { error: 'Could not reach the server' }})
    }
  }


  const handleRefresh = async () => {
    try {
      console.log('handleRefresh')
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({})
      })

      setResult({ status: response.status, body: await response.json()})
    } catch {
      setResult({ status: 0, body: { error: 'Could not reach the server' }})
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({})
      })

      setResult({ status: response.status, body: await response.json()})
    } catch {
      setResult({ status: 0, body: { error: 'Could not reach the server' }})
    }
  }
  return (
    <main>
      <h1>JWT in httpOnly cookies</h1>
      <p>
        <button onClick={() => handleLogin()}>Log in</button> 
        <button onClick={() => handleProtectedPage()}>Protected Page</button>
        <button onClick={() => handleRefresh()}>Refresh</button> 
        <button onClick={() => handleLogout()}>Log out</button>
      </p>
      {/* httpOnly cookies are invisible to JavaScript – look in DevTools → Application → Cookies instead */}
      <p>
        <code>document.cookie</code>: "{document.cookie}"
      </p>
      {result !== null && <pre className="result">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  )
}
