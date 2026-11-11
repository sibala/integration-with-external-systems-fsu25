import { Router, type CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { exchangeCode, getAuthorizeUrl, getUser } from '../integrations/githubAdapter.ts'
// PKCE is commented out (every line marked PKCE). The login still works, because our server has the
// client secret. Uncomment all of them – here and in githubAdapter.ts – to turn PKCE on.
import { randomString /* , toCodeChallenge */ } from '../lib/pkce.ts' // PKCE
import { requireAdmin } from '../middleware/auth.ts'

const router = Router()

// Who is admin: a list of GitHub usernames in .env, e.g. anna-k,erik99
// Many admins? Membership in the shop's GitHub organisation instead (scope read:org).
const ADMINS = process.env.ADMIN_GITHUB_LOGINS?.split(',') ?? []

const SESSION_SECONDS = 8 * 60 * 60 // 8 hours – an admin's working day

const COOKIE: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }

// state and the code verifier for ONE login: 10 minutes, and only sent to /api/auth/github…
const FLOW_COOKIE: CookieOptions = { ...COOKIE, path: '/api/auth/github', maxAge: 10 * 60 * 1000 }

/* --- 1. START: GET /api/auth/github → the user is sent to GitHub --- */
router.get('/github', (_req, res) => {
  const state = randomString()
  // const codeVerifier = randomString() // PKCE
  // Saved in httpOnly cookies, so we can check them when the user comes back
  res.cookie('oauth_state', state, FLOW_COOKIE)
  // res.cookie('oauth_verifier', codeVerifier, FLOW_COOKIE) // PKCE
  console.log('\n[OAUTH] 1. Sending the user to GitHub')
  res.redirect(getAuthorizeUrl(state /* , toCodeChallenge(codeVerifier) */)) // PKCE
})

/* --- 2. CALLBACK: GET /api/auth/github/callback?code=…&state=… – GitHub sends the user back here --- */
router.get('/github/callback', async (req, res) => {
  const { code, state, error } = req.query
  const { oauth_state /* , oauth_verifier */ } = req.cookies // PKCE
  res.clearCookie('oauth_state', FLOW_COOKIE) // used once – then thrown away
  // res.clearCookie('oauth_verifier', FLOW_COOKIE) // PKCE

  // The user clicked "Cancel" on GitHub
  if (error) {
    res.redirect('/?error=cancelled')
    return
  }
  // Not the login WE started → stop (CSRF)
  if (!state || state !== oauth_state) {
    res.redirect('/?error=state')
    return
  }

  try {
    const accessToken = await exchangeCode(code as string /* , oauth_verifier */) // PKCE
    console.log('[OAUTH] 2. Got an access token from GitHub')
    const user = await getUser(accessToken)
    console.log('[OAUTH] 3. GitHub says this is:', user.login)
    // The admin's access token isn't saved – the issues use the shop's own token.

    if (!ADMINS.includes(user.login)) {
      res.redirect('/?error=not-admin')
      return
    }
    // In your shop: create or update the admin in the DB by github_id.

    // 4. The shop's OWN login: the same kind of httpOnly cookie as in L8 and L9
    const token = jwt.sign({ id: user.id, login: user.login }, process.env.SESSION_TOKEN_SECRET as string, {
      expiresIn: SESSION_SECONDS,
    })
    res.cookie('admin_token', token, { ...COOKIE, maxAge: SESSION_SECONDS * 1000 })
    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.redirect('/?error=github')
  }
})

/* --- PROTECTED: GET /api/auth/me → { admin } --- */
router.get('/me', requireAdmin, (_req, res) => {
  res.json({ admin: res.locals.admin })
})

/* --- LOGOUT: POST /api/auth/logout --- */
router.post('/logout', (_req, res) => {
  res.clearCookie('admin_token', COOKIE)
  res.json({ loggedOut: true })
})

export default router
