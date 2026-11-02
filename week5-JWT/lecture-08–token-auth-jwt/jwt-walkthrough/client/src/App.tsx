export default function App() {

  return (
    <main>
      <h1>JWT in httpOnly cookies</h1>
      <p>
        <button>Log in</button> 
        <button>Call /me</button>
        <button>Refresh</button> 
        <button>Log out</button>
      </p>
      {/* httpOnly cookies are invisible to JavaScript – look in DevTools → Application → Cookies instead */}
      <p>
        <code>document.cookie</code>: "{document.cookie}"
      </p>
    </main>
  )
}
