---
marp: true
theme: default
paginate: true
---

# Integration with third-party systems

## Lecture 10 – Log in with GitHub, and create issues with the shop's token

---

<!-- Theory -->

<style scoped>section { font-size: 26px; }</style>

# From L9: the same flow, a new service

| From L9 | Today with GitHub |
|---|---|
| Authorization Code flow: start → redirect → callback | **The same** – `/api/auth/github` and `/api/auth/github/callback` |
| `state` + PKCE in short httpOnly cookies | **The same** |
| The code is exchanged on the server, with the client secret | **The same** |
| The shop's own httpOnly cookie after the callback | **The same** – now for the admin |
| Google's tokens are **not** saved | **The same** – the admin's GitHub token is used once |

Today's new parts: who is admin, and calling GitHub's API with **the shop's own token**.

---

<style scoped>section { font-size: 22px; }</style>

# Google vs GitHub

| | Google (L9) | GitHub (today) |
|---|---|---|
| Register the app | Google Cloud → Clients | GitHub → Developer settings → **OAuth Apps** |
| Protocol | OAuth 2.0 **+ OpenID Connect** | Only OAuth 2.0 – **no ID token** |
| Who is it? | Read the ID token | Call `GET api.github.com/user` with the access token |
| The user's id | `sub` | `id` – not `login`, which can be changed |
| Scopes | `openid email profile` | `read:user` |
| Who may log in | Every customer | **Only admins** – a list in `.env` |
| The user's token | Not saved | Not saved |

OpenID Connect is a layer **on top of** OAuth 2.0 – each service chooses whether to support it. GitHub's login doesn't: no `openid` scope, no ID token.

---

<style scoped>section { font-size: 20px; }</style>

# The flow – with GitHub

```
Browser                    Express                         GitHub
  │ "Log in with GitHub" ─►│ 1. state + code verifier        │
  │◄──── redirect ─────────│    (httpOnly cookies)            │
  │─────────────────────────────────────────────────────────►│ 2. login + approve
  │◄──────────── redirect to the callback ?code=…&state=… ───│
  │ GET /callback ────────►│ 3. state ok? code + verifier ──►│ /access_token
  │                        │◄──────── the admin's token ─────│
  │                        │ 4. GET /user with the token ───►│ api.github.com
  │                        │◄──────────── { id, login } ─────│
  │                        │ 5. admin?                       │
  │◄── the shop's cookie ──│ 6. our own JWT cookie           │
  │ "Report a problem" ───►│ 7. POST /issues, SHOP'S token ─►│ api.github.com
```

| The shop's view | Gets | |
|---|---|---|
| 2. login + approve | the **promise** – the code | **Authorization** |
| 3. `/access_token` | the **key** – the access token | **Authorization** |
| 4. `GET /user` | **who** it is | **Authentication** |

Google (L9) gives the key and who in **one** step: the ID token.

---

# Who is admin?

```ts
// .env: ADMIN_GITHUB_LOGINS=anna-k,erik99
if (!ADMINS.includes(user.login)) {
  res.redirect('/?error=not-admin')
  return
}
```

- Anyone with a GitHub account can log in to GitHub – **the shop** decides who is admin
- Save the admin in the DB by GitHub's `id`, not `login`
- Many admins? Membership in the shop's GitHub **organisation** instead (scope `read:org`)

---

# Two tokens – two jobs

| | The admin's token (OAuth) | The shop's token (`.env`) |
|---|---|---|
| Comes from | The login – a new one each time | Created **once** by you on GitHub |
| Used for | `GET /user` – who is it? | Creating and listing issues |
| Can do | `read:user` – read the profile | **Issues: Read and write** in **one** repo |
| Saved | Nowhere | `GITHUB_ISSUES_TOKEN` in `.env` – only on the server |

The admin scope is `read:user`. The shop's token scope is only issues in select repos.

---

<style scoped>section { font-size: 26px; }</style>

# The shop's token: a fine-grained personal access token

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**

| Setting | Choose |
|---|---|
| Expiration | e.g. 90 days – put a reminder in the calendar |
| Repository access | **Only select repositories** → the shop's repo |
| Repository permissions | **Issues: Read and write** – nothing else |

- The token's account becomes the author 
- Shown **once** – copy it to `.env` and to Vercel/Render at once
- No refresh token: when it expires, you create a new one

---

<style scoped>section { font-size: 24px; }</style>

# The issues API

```ts
await fetch(`https://api.github.com/repos/${REPO}/issues`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SHOP_TOKEN}`,
    Accept: 'application/vnd.github+json',
  },
  body: JSON.stringify({ title, body: `${description}\n\nReported by @${admin.login}` }),
})
```

| Answer | Means |
|---|---|
| `201` | Created – `html_url` links to the issue |
| `401` | The shop's token is wrong or has expired → create a new one |
| `403` / `404` | The token has no access to the repo, or the wrong `GITHUB_REPO` |
| `410` | Issues are turned off in the repo |

---

# The admin's token or the shop's own?

| | The admin's token | **The shop's own token** (today) |
|---|---|---|
| Author on GitHub | The admin | **The shop's account** |
| Who reported it | Shown by GitHub | The server writes the name in the text |
| Tokens to store and refresh | Yes – per admin | **No** – one token in `.env` |
| An admin leaves | Their token stops – nobody else's | Remove them from `ADMIN_GITHUB_LOGINS` |

Using the shop's own token is simpler, and it works for everyone who is admin in the shop.

---

# Redirect URIs – the deployed shop

| | Redirect URI |
|---|---|
| Deployed (tested) | `https://your-shop.vercel.app/api/auth/github/callback` |
| Locally | `http://localhost:5173/api/auth/github/callback` |

An OAuth App can have multiple Redirect URI, add both.

---

# Code walkthrough: `github-oauth-walkthrough-start/`

1. `githubAdapter.ts`: login with the admin's token (`getAuthorizeUrl`, `exchangeCode`, `getUser`)
2. `routes/auth.ts`: the same flow as L9 – plus the admin list
3. `routes/issues.ts`: `GET` and `POST /api/admin/issues` with `requireAdmin` – the admin's name in the text
4. React: log in and log out
5. **Your turn:** `createIssue` and `listOpenIssues` with the shop's token – the docs links are above each function – and "Report a problem" in React: a form and a list that call the routes

---

# Labb 7 – Admininloggning med GitHub och issues

The whole lab is the **VG** part of Assignment 2:

- Admin logs in to your shop with GitHub
- Admin reports problems as issues in the shop's repo, with the shop's own GitHub token

*(Go through the requirements and "Klart när" in Labb 7)*
