// Adapter for "Log in with Google" (OAuth 2.0 + OpenID Connect). The ONLY file that knows Google's URLs,
// client id and client secret.
// Docs: https://developers.google.com/identity/openid-connect/openid-connect
import jwt from 'jsonwebtoken'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? ''

if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
  throw new Error('Google is not configured. Copy .env.example to .env and fill in the GOOGLE_ values.')
}

/* --- 1. Where we send the user: Google's own login page --- */
export function getAuthorizeUrl(state: string /* , codeChallenge: string */) { // PKCE
  const params = new URLSearchParams({
    response_type: 'code', // Authorization Code flow
    client_id: CLIENT_ID,
    scope: 'openid email profile', // openid = we want an ID token. Only who the user is – nothing sensitive
    redirect_uri: CALLBACK_URL, // must match an Authorized redirect URI in Google Cloud exactly
    state, // we check it in the callback → protects against CSRF
    // code_challenge: codeChallenge, // PKCE: the hash of a secret only our server knows
    // code_challenge_method: 'S256', // PKCE
  })

  console.log("getAuthorizeUrl", `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/* --- 2. The code from the callback → Google's ID token → who the user is --- */
// Server to server: the client secret never reaches the browser.
export async function exchangeCode(code: string /* , codeVerifier: string */) { // PKCE
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      // code_verifier: codeVerifier, // PKCE: Google hashes it and compares with code_challenge
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
    }),
    signal: AbortSignal.timeout(5_000),
  })
  const answer: any = await response.json()
  if (!response.ok || !answer.id_token) {
    throw new Error(`Google refused the code: ${answer.error ?? response.status}`)
  }

  console.log('Response from Google Token request, a JWT:', answer)

  // The ID token is a JWT (L8) – signed by Google. Paste it into jwt.io to see the payload.
  // We got it straight from Google over HTTPS, so we don't need to check the signature –
  // but we check that it was issued by Google, to OUR app, and hasn't expired.
  const claims = jwt.decode(answer.id_token) as jwt.JwtPayload
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
    throw new Error('The ID token is not from Google')
  }

  console.log('Response from Google Token request, Dcoded JWT:', claims)
  if (claims.aud !== CLIENT_ID) throw new Error('The ID token is for another app')
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error('The ID token has expired')

  // In your shop: validate the claims with Zod before you use them.
  return {
    sub: String(claims.sub), // Google's id for the user – never changes
    email: String(claims.email),
    emailVerified: claims.email_verified === true,
    name: String(claims.name ?? claims.email),
  }
  // Google's access token (answer.access_token) isn't needed: everything we want is in the ID token.
}
