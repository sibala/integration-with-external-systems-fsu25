---
marp: true
theme: default
paginate: true
---

# Integration with third-party systems

## Lecture 9 – Log in with Google (OAuth 2.0 + OpenID Connect)

---

<!-- Theory -->

# From L8: what we need today

| From L8 | Used today for |
|---|---|
| **httpOnly cookie** | `state` and the code verifier during the login, and the shop's own login afterwards |
| `sameSite: 'lax'` | The cookie is sent when Google sends the user back – `strict` would block it |
| `path` + `maxAge` | The login cookies only go to `/api/auth/google`, and live 10 min |
| `secure` | The cookies only travel over HTTPS in production |
| **JWT** | Google's **ID token** is a JWT – and the shop's own login cookie can be one too |

---

# The problem OAuth solves

The shop wants to know **who the customer is** – without handling a password.

| Own password login | Log in with Google |
|---|---|
| The shop stores password hashes | The shop stores **no** password |
| You build "forgot password" and e-mail verification | Google has already verified the e-mail |
| The customer creates yet another account | One click with an account they already have |
| A database leak = leaked hashes | Nothing to leak – the password is only at Google |

---

# The roles

| Role | Here |
|---|---|
| **The user** | The customer at the computer |
| **The client** | Our Express server – it has a **client id** and a **client secret** |
| **The authorization server** | `accounts.google.com` – shows the login and the approval |
| **The token endpoint** | `oauth2.googleapis.com/token` – swaps the code for tokens |

You create the client once in **Google Cloud Console** → APIs & Services → **Clients**.

---

# OAuth 2.0 and OpenID Connect

| | Answers | You get |
|---|---|---|
| **OAuth 2.0** | What may the app **do**? | An **access token** for an API |
| **OpenID Connect** (OIDC) | **Who** is the user? | An **ID token** – a JWT about the user |

OIDC is a layer on top of OAuth 2.0: the same flow, plus the scope `openid`.

For a login we only need **who** – the ID token is enough.

---

<style scoped>section { font-size: 26px; }</style>

# Authorization Code flow

```
Browser                    Express                         Google
  │ "Log in with Google" ─►│ 1. state + code verifier        │
  │◄──── redirect ─────────│    (httpOnly cookies)            │
  │─────────────────────────────────────────────────────────►│ 2. login + approve
  │◄──────────── redirect to the callback ?code=…&state=… ───│
  │ GET /callback ────────►│ 3. state ok? code + verifier ──►│ /token
  │                        │◄──────── ID token (JWT) ────────│
  │                        │ 4. read the ID token: who is it?│
  │◄── the shop's cookie ──│ 5. our own JWT cookie           │
```

The **code** passes through the browser. The **tokens** never do.

---

# state – is this the login WE started?

```ts
const state = randomString()
res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 })
// … Google sends it back unchanged
if (req.query.state !== req.cookies.oauth_state) // → stop
```

Without `state`: an attacker can send you a callback link with **their** code – and you're logged in as them (CSRF).

---

# PKCE – the code alone is worth nothing

```ts
const codeVerifier = randomString()                       // stays on our server
const codeChallenge = sha256(codeVerifier) // base64url     // sent to Google in step 1

// step 3: we send the verifier – Google hashes it and compares
body: new URLSearchParams({ client_id, client_secret, code, code_verifier: codeVerifier, grant_type: 'authorization_code', redirect_uri })
```

A stolen `code` can't be exchanged without the verifier – e.g. from the browser history or a log.

---

# Scopes – ask for as little as possible

| Scope | Gives |
|---|---|
| `openid` | An **ID token** – this makes it OpenID Connect |
| `email` | `email` and `email_verified` in the ID token |
| `profile` | `name` and `picture` in the ID token |

`openid email profile` need no review by Google – the customer just clicks "Continue".

---

<style scoped>section { font-size: 26px; }</style>

# The ID token is a JWT

```json
{
  "iss": "https://accounts.google.com",
  "aud": "1234-abc.apps.googleusercontent.com",
  "sub": "110169484474386276334",
  "email": "anna@gmail.com",
  "email_verified": true,
  "name": "Anna Andersson",
  "exp": 1794132000
}
```

The payload of a JWT, as in L8 – signed by Google, readable by anyone.

---

# Check the ID token

| Check | Why |
|---|---|
| `iss` is Google | Issued by Google, not someone else |
| `aud` is **our** client id | Meant for our app – not a token from another app |
| `exp` | Not expired |

We get it **straight from Google** over HTTPS – so the signature doesn't have to be checked. Never trust an ID token that came via the browser without checking the signature.

---

# `sub` – not the e-mail

| | `sub` | `email` |
|---|---|---|
| Changes | **Never** | The customer can change it |
| Unique | Per Google account | The same address can exist with other services |
| Use for | **Finding the customer** in your DB | Showing, sending order confirmations |

```sql
alter table customers add column google_sub text unique;
```

Already have a password login? Keep it – Google is a **second way in**. Don't merge accounts just because the e-mail matches: anyone can type any e-mail in a form.

---

# After the callback: the shop's own login

```ts
const token = jwt.sign({ id: customer.id, email, name }, process.env.SESSION_TOKEN_SECRET, { expiresIn: '8h' })
res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 8 * 60 * 60 * 1000 })
res.redirect('/')
```

The same httpOnly cookie as in L8 – Google is not involved in every request.
**Keep the login your shop already has** – session or JWT cookie – and explain it in your README.

Not localStorage: the callback is a redirect, so the server can't hand React a token without putting it in the URL.

---

# Google's tokens

| | Lives | Used for | Saved |
|---|---|---|---|
| **ID token** | 1 h | Reading who the customer is | **Nowhere** – read once in the callback |
| **Access token** | 1 h | Calling Google's APIs, e.g. Gmail | **Nowhere** – not needed for a login |
| **Refresh token** | Only with `access_type=offline` | A new access token | We don't ask for one |

After the callback the shop only uses **its own** cookie.

---

<style scoped>section { font-size: 26px; }</style>

# Setting up Google Cloud

1. **Create a project** in [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → OAuth consent screen → Get started**: the app's name, your e-mail, Audience *External*. Nothing more is needed for a login – with only `openid email profile`, every Google account can log in, no test users
3. **Clients → Create client → Web application**: add the redirect URIs
4. Copy the client id and the client secret to `.env` **at once** – the secret is only shown when the client is created

| | Authorized redirect URI |
|---|---|
| Locally | `http://localhost:5173/api/auth/google/callback` |
| Deployed | `https://your-shop.example.com/api/auth/google/callback` |

Must match **exactly** – otherwise Google shows `redirect_uri_mismatch`.

---

# Code walkthrough: `google-oauth-walkthrough/`

1. `googleAdapter.ts`: `getAuthorizeUrl()` and `exchangeCode()` – the only file that knows Google
2. `lib/pkce.ts`: `state`, and the PKCE code verifier and challenge – **commented out**: try with and without
3. `routes/auth.ts`: `/google` → Google → `/google/callback` → check `state` → ID token → cookie
4. `middleware/auth.ts`: `verifyToken` reads the shop's own cookie
5. React: a **link** to `/api/auth/google` – not `fetch`
6. Try: cancel on Google, change `state` in the URL, add a wrong redirect URI

---

# Labb 6 – Kundinloggning med Google

The first step of Assignment 2: customers log in to your shop with Google and see their own orders.

*(Go through the requirements and "Klart när" in Labb 6)*
