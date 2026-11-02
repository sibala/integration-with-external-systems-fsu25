---
marp: true
theme: default
paginate: true
---

# Integration with third-party systems

## Lecture 8 – Token-based authentication with JWT

---

<!-- Theory -->

# Sessions – what you know from the backend course

```
Browser                    Server                  Session store
  │ login ───────────────►│ creates a session ──────►│ { id: 'a1b2', user: 1 }
  │◄── cookie: sid=a1b2 ──│                          │
  │ request + cookie ────►│ looks up 'a1b2' ────────►│
```

- The server **remembers** who is logged in
- Every request = a lookup in the session store

---

# Tokens – the server remembers nothing

```
Browser                    Server
  │ login ───────────────►│ signs a token: "user 1, valid until 10:15"
  │◄────── token ─────────│
  │ request + token ─────►│ checks the signature – no lookup
```

- The token **itself** says who you are – signed by the server
- Works between services: another server with the key can check it too

---

# What is a JWT?

Three base64url parts, separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzk...}.4pX2c...
      header                    payload                signature
```

| Part | Contains |
|---|---|
| **Header** | `{ "alg": "HS256", "typ": "JWT" }` |
| **Payload** | `{ "id": 1, "email": "anna@example.com", "exp": 1793260800 }` |
| **Signature** | HMAC of header + payload with the **server's secret** |

---

<style scoped>section { font-size: 26px; } pre { white-space: pre-wrap; word-break: break-all; }</style>

# Signed – not encrypted

Anyone can **read** the payload: paste this token into [jwt.io](https://jwt.io).

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhbm5hQGV4YW1wbGUuY29tIiwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzkzMjU5OTAwLCJleHAiOjE3OTMyNjA4MDB9.HWmGueR_c1p-S5K6GcpZsBSdht3GouBBOivbtQOfdws
```

Nobody can **change** it: a changed payload no longer matches the signature. On jwt.io: secret `hemlig` → "Signature verified". Any other secret → "Invalid signature".

```ts
jwt.verify(token, SECRET) // checks the signature AND exp – throws if either is wrong
```

- Never put a password or other secrets in the payload
- The secret lives only on the server, in `.env`

---

# The problem: a JWT can't be taken back

A session is deleted on the server → the user is logged out at once.

A JWT is valid until `exp` – the server has no list to delete it from.

**Stolen token = valid until it expires.**

The solution: two tokens.

---

<style scoped>section { font-size: 28px; }</style>

# Short-lived and long-lived tokens

| | **Access token** | **Refresh token** |
|---|---|---|
| Lives | **Short** – e.g. 15 min | **Long** – e.g. 7 days |
| Sent | With **every** request | **Only** to `/refresh` |
| Used for | Proving who you are | Getting a new access token |
| Stolen | Works for a few minutes | Dangerous – store it carefully, revoke it on logout |

The walkthrough uses **30 s** for the access token, so you can watch it expire.

---

# The flow

```
React                         Express
  │ email + password ────────►│ /login
  │◄── access + refresh ──────│
  │ /me + access token ──────►│ verify → 200
  │        … 30 s later …     │
  │ /me + access token ──────►│ verify → 401 "Token expired"
  │ refresh token ───────────►│ /refresh → a new access token
  │ /me + new access token ──►│ verify → 200
```

The user stays logged in for 7 days – without the password again.

---

# Where does the token go? Two ways

| | **A. JSON + Authorization header** | **B. httpOnly cookies** |
|---|---|---|
| Login answers with | `{ accessToken, refreshToken }` | `Set-Cookie` headers |
| Who keeps the token | **React** | **The browser** |
| Who sends it | React: `Authorization: Bearer …` | The browser, by itself |
| JavaScript can read it | Yes | **No** |
| Logout | React forgets the tokens | The server clears the cookies |

---

# A. Tokens in JSON

```ts
// Server
res.json({ accessToken, refreshToken })

// The client sends it itself
fetch('/api/me', { headers: { Authorization: `Bearer ${accessToken}` } })
```

In a browser, React has to keep it somewhere:

- **State (memory)** – gone on reload
- **localStorage** – survives a reload, but **any script on the page can read it** (XSS)

Fits where there is **no browser**: mobile apps, and server-to-server calls. Not in the code walkthrough.

---

# B. Tokens in httpOnly cookies

```ts
res.cookie('access_token', accessToken, {
  httpOnly: true,   // JavaScript can't read it → XSS can't steal it
  sameSite: 'lax',  // not sent when another site posts to us → CSRF protection
  secure: true,     // HTTPS only (off on localhost)
  maxAge: 30 * 1000,
})
```

```ts
fetch('/api/auth/me') // no token in React – the browser sends the cookie
```

Fits: a web shop where React and the API are used in the browser. **The code walkthrough uses this.**

---

# The refresh cookie: only where it's needed

```ts
res.cookie('refresh_token', refreshToken, {
  httpOnly: true, sameSite: 'lax', secure: true,
  path: '/api/auth/refresh', // sent ONLY to the refresh route
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

The long-lived token never travels with ordinary requests.

Logout: `res.clearCookie('refresh_token', { path: '/api/auth/refresh' })` – the same path.

---

<style scoped>section { font-size: 26px; }</style>

# Can a cookie be stolen? Yes.

`httpOnly` stops JavaScript from **reading** it – not someone sniffing http, malware on the computer, or XSS **using** it.

| Stolen | Works until |
|---|---|
| Session cookie | The session expires, or the server deletes it |
| Access token | It expires – **by itself**, after 15 min |
| Refresh token | It expires (7 days), or the server deletes it from the DB |

**Refresh token rotation:** every `/refresh` gives a **new** refresh token and makes the old one invalid. The old one used again = two people have it → the server revokes all of the user's refresh tokens.

Needs refresh tokens **in the DB** – otherwise the server can't revoke or detect anything.

---

<style scoped>section { font-size: 26px; }</style>

# Why not just steal the refresh token?

Both are httpOnly cookies – **equally hard to steal**. The difference is what happens next:

| | Access token | Refresh token |
|---|---|---|
| Can be revoked | **No** – only the signature is checked | **Yes** – it's in the DB, delete the row |
| Stolen and used | Works until it expires (15 min) | **Rotation** spots it: the old token used again → revoke them all |
| Travels | With **every** request | Only to `/refresh` (`path`), every 15 min |
| From GitHub/Google (L9–L12) | Works on its own | Useless without the shop's **client secret** |

The gain isn't that it's harder to steal – it's that the server can **stop it**. In a shop with one server, a session gives you the same – with less code.

---

# Deployed on two domains?

React on Vercel, API on Render = **different sites**. Then the cookies need:

```ts
{ httpOnly: true, sameSite: 'none', secure: true }
```

…and CORS that allows credentials, and `fetch(url, { credentials: 'include' })` in React.

Or: put the API under the same domain as React (a rewrite/proxy) – then `sameSite: 'lax'` works.

---

# Logging out – and revoking

| | Logout |
|---|---|
| **JSON** | React forgets the tokens |
| **Cookies** | `POST /logout` → the server clears the cookies |

The refresh token is still valid until it expires – so **in your shop**:

- Save refresh tokens in the DB, and delete the row on logout
- `/refresh` checks that the row still exists

---

<style scoped>section { font-size: 28px; }</style>

# Is JWT safer than a session? No.

| | Session | JWT (short + long) |
|---|---|---|
| Log out / block a user | **At once** – delete the session | Within 15 min – the access token is valid until it expires |
| DB lookups | Every request | Only on `/refresh` |
| Code | Little | More: two tokens, refresh, rotation |

JWT's advantage is **scaling**: many servers or services can check the login with the signature, without asking a shared store. With one server, a session lookup takes about 1 ms – it only becomes a bottleneck with many servers, regions or services. That's why Google and GitHub use short + long tokens.

**One server + one database – like your shop?** A session is simpler, and at least as safe. Both are fine in Assignment 2 – explain your choice in your README.

Deployed on Vercel/Render: keep the sessions **in the DB** (e.g. `connect-pg-simple`, `connect-mongo`) – not in memory.

---

# Code walkthrough: `jwt-walkthrough/`

1. `middleware/auth.ts`: `verifyAccessToken` and `verifyRefreshToken` check the cookies
2. `routes/auth.ts`: login → two tokens, two secrets, two lifetimes, two httpOnly cookies
3. React: wait 30 s → `/me` gives 401 → Refresh → `/me` works again
4. DevTools → Application → Cookies: the cookies are there, `document.cookie` is empty

**"In your shop:"** users in the DB with bcrypt, refresh tokens in the DB so they can be revoked.

---

<style scoped>section { font-size: 26px; }</style>

# Using sessions? You still need to understand tokens

From L9 on, the **third-party services** send you tokens:

| Where | The token | From today |
|---|---|---|
| **L9** GitHub login | GitHub's access token (8 h) + refresh token | Short- and long-lived |
| **L10** Google login | Google's **ID token is a JWT** – `sub`, `email`, `exp` | Payload, signature, "signed – not encrypted" |
| **L10** GitHub webhooks | `X-Hub-Signature-256` = **HMAC-SHA256** of the body | A signature proves nothing was changed |
| **L12** Gmail API | Access token (1 h) + refresh token **you save in the DB** | Short- and long-lived, revoking |

You don't have to build your own JWT login – but you have to read and handle the tokens other services give you.

---

# OAuth + the login you already have

OAuth only tells you **who** the user is. After the callback, your shop logs them in **the way it already does**:

| Your shop today | After the OAuth callback |
|---|---|
| express-session | `req.session.user = …` → `res.redirect('/')` |
| JWT in an httpOnly cookie | `res.cookie(…)` → `res.redirect('/')` |
| JWT in **localStorage** | **Doesn't work well** – see below |

The callback is a **redirect** from GitHub, not a `fetch`. The server can't hand a token to React's localStorage – only through the URL (`/?token=…`), which ends up in the browser history and in logs.

**JWT in localStorage → move it to an httpOnly cookie before L9.**

---

<style scoped>section { font-size: 26px; }</style>

# The simple way: one token, 8 hours

Short- and long-lived tokens are **not required**. Moving from localStorage and finding it hard? One token is enough:

```ts
// Login: one cookie instead of a JSON answer
const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' })
res.cookie('token', token, {
  httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000,
})

// Middleware: read the cookie instead of the Authorization header
const user = jwt.verify(req.cookies.token, process.env.JWT_SECRET)
```

- No refresh route, no second secret – the user logs in again after 8 h
- The price: a stolen token works for up to 8 h, and logout only clears the cookie
- Fine for your shop – and **the same as the GitHub example in L9**

---

# Exercise (Not graded)

1. In `jwt-walkthrough`: remove `httpOnly` in `routes/auth.ts`, log in, and run `document.cookie` in the console. What can a script read now?
2. In your shop:
   - **Token in localStorage?** Move it to an httpOnly cookie. Short- and long-lived tokens too complex? One token that lives 8 hours works fine for your shop.
   - **express-session?** Set `httpOnly`, `sameSite`, `secure` and `maxAge` yourself, and check the cookie in DevTools.
