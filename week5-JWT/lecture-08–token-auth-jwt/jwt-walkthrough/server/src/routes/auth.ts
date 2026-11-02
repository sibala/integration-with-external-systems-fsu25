import { Router, type CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
const router = Router()


// One hardcoded user. In your shop: the users are in the DB, and the password is hashed with bcrypt.
type User = { id: number; email: string; role: 'customer' | 'admin' }
const USER: User = { id: 1, email: 'anna@example.com', role: 'customer' }
const PASSWORD = 'hemligt123'

const ACCESS_TOKEN_SECONDS = 30 // 30 s so you can watch it expire in the walkthrough – in a real shop e.g. 15 minutes.
const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60 // 7 days

// httpOnly: JavaScript in the browser can't read the cookie – an XSS attack can't steal the token.
// sameSite 'lax': the browser doesn't send the cookie when another site posts to our API – protects against CSRF.
// secure: only over HTTPS. Off on localhost (http), on when deployed.
// Shop and API on different domains, e.g. Vercel + Render? Then sameSite: 'none', secure: true and CORS with credentials.
const COOKIE_OPTIONS: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }

// The refresh cookie is only sent to the refresh route – not with every request.
const REFRESH_PATH = '/api/auth/refresh'


/* --- LOGIN: POST /api/auth/login  { email, password } → { user } + two cookies --- */
router.post('/login', (req, res) => {
  if (req.body?.email !== USER.email || req.body?.password !== PASSWORD) {
    res.status(401).json({ error: 'Wrong email or password' })
    return
  }

  // In your shop: save the refresh token in the DB together with the user's id,
  // e.g. a table refresh_tokens (user_id, token, expires_at). /refresh checks the row, /logout deletes it.
  res.json({ user: USER })
})

const verifyRefreshToken = () => {}
/* --- REFRESH: POST /api/auth/refresh  (refresh cookie) → a new access cookie --- */
router.post('/refresh', verifyRefreshToken, (_req, res) => {
  // In your shop: find the user in the DB, and check that the refresh token isn't revoked.
  if (res.locals.userId !== USER.id) {
    res.status(401).json({ error: 'Log in again' })
    return
  }
  
  res.json({ user: USER })
})


const verifyAccessToken = () => {}
/* --- PROTECTED: GET /api/auth/me  (access cookie) → { user } --- */
router.get('/me', verifyAccessToken, (_req, res) => {
  res.json({ user: res.locals.user })
})

/* --- LOGOUT: POST /api/auth/logout → both cookies removed --- */
// React can't remove httpOnly cookies itself – the server has to.
router.post('/logout', (_req, res) => {
  // In your shop: also revoke the refresh token in the DB.
  res.json({ loggedOut: true })
})

export default router
