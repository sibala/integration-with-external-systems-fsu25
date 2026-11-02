import { useState } from "react";

export default function App() {
  const [result, setResult] = useState<unknown>(null)

  const handleLogin = async () => {
    try {
    } catch {
      setResult({ status: 0, body: { error: 'Could not reach the server' }})
    }
  }
  return (
    <main>
      <h1>JWT in httpOnly cookies</h1>
      <p>
        <button>Log in</button> 
        <button>Protected Page</button>
        <button>Refresh</button> 
        <button>Log out</button>
      </p>
      {/* httpOnly cookies are invisible to JavaScript – look in DevTools → Application → Cookies instead */}
      <p>
        <code>document.cookie</code>: "{document.cookie}"
      </p>
      {result !== null && <pre className="result">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  )
}
