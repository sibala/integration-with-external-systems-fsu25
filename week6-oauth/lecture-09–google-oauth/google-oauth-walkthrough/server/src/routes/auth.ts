import { Router, type CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { exchangeCode, getAuthorizeUrl } from '../integrations/googleAdapter.ts'
// PKCE is commented out (every line marked PKCE). The login still works, because our server has the
// client secret. Uncomment all of them – here and in googleAdapter.ts – to turn PKCE back on.
import { randomString /* , toCodeChallenge */ } from '../lib/pkce.ts' // PKCE
import { verifyToken } from '../middleware/auth.ts'

const router = Router()

const SESSION_SECONDS = 8 * 60 * 60 // 8 hours – one token, as in L8's "The simple way"

// sameSite 'lax': the cookie IS sent when Google sends the user back to us (a normal navigation).
// 'strict' would block it.
const COOKIE: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }

// state and the code verifier for ONE login: 10 minutes, and only sent to /api/auth/google…
const FLOW_COOKIE: CookieOptions = { ...COOKIE, path: '/api/auth/google', maxAge: 10 * 60 * 1000 }

/* --- 1. START: GET /api/auth/google → the user is sent to Google --- */
router.get('/google', (_req, res) => {
  const state = randomString()
  // const codeVerifier = randomString() // PKCE
  // Saved in httpOnly cookies, so we can check them when the user comes back
  res.cookie('oauth_state', state, FLOW_COOKIE)
  // res.cookie('oauth_verifier', codeVerifier, FLOW_COOKIE) // PKCE
  console.log('\n[OAUTH] 1. Sending the user to Google')
  res.redirect(getAuthorizeUrl(state /* , toCodeChallenge(codeVerifier) */)) // PKCE
})

/* --- 2. CALLBACK: GET /api/auth/google/callback?code=…&state=… – Google sends the user back here --- */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query
  const expectedState = req.cookies.oauth_state
  // const codeVerifier = req.cookies.oauth_verifier // PKCE
  res.clearCookie('oauth_state', FLOW_COOKIE) // used once – then thrown away
  // res.clearCookie('oauth_verifier', FLOW_COOKIE) // PKCE

  // The user clicked "Cancel" on Google
  if (error) {
    res.redirect('/?error=cancelled')
    return
  }
  // Not the login WE started → stop (CSRF)
  if (typeof code !== 'string' || !expectedState || state !== expectedState) {
    res.redirect('/?error=state')
    return
  }

  try {
    const user = await exchangeCode(code /* , codeVerifier */) // PKCE
    console.log('[OAUTH] 2. Google says this is:', user.email)
    if (!user.emailVerified) {
      res.redirect('/?error=not-verified')
      return
    }

    // 3. The shop's OWN login: the same kind of httpOnly cookie as in L8's jwt-walkthrough
    // In your shop: find the customer by Google's sub – never by e-mail – or create them:
    //   insert into customers (google_sub, email, name) … on conflict (google_sub) do update …
    // and put YOUR customer id in the token instead of user.sub.
    const token = jwt.sign(
      { id: user.sub, email: user.email, name: user.name },
      process.env.SESSION_TOKEN_SECRET as string,
      { expiresIn: SESSION_SECONDS }
    )
    res.cookie('session', token, { ...COOKIE, maxAge: SESSION_SECONDS * 1000 })
    console.log('[OAUTH] 3. Logged in – the shop\'s own cookie is set')
    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.redirect('/?error=google')
  }
})

/* --- PROTECTED: GET /api/auth/me → { customer } --- */
// In your shop: e.g. GET /api/account/orders → the customer's own orders, where customer_id = res.locals.customer.id
router.get('/me', verifyToken, (_req, res) => {
  res.json({ customer: res.locals.customer })
})

/* --- LOGOUT: POST /api/auth/logout --- */
// React can't remove httpOnly cookies itself – the server has to.
router.post('/logout', (_req, res) => {
  res.clearCookie('session', COOKIE)
  res.json({ loggedOut: true })
})

export default router
