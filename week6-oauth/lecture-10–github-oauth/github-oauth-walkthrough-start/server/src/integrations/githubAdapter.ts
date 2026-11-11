// Adapter for GitHub: "Log in with GitHub" (OAuth 2.0) and issues (REST API).
// The ONLY file that knows GitHub's URLs, client id, client secret and the shop's token.
// Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
//       https://docs.github.com/en/rest/issues/issues

const CLIENT_ID = process.env.GITHUB_CLIENT_ID as string
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET as string
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL as string
const REPO = process.env.GITHUB_REPO as string // owner/repo, e.g. anna-k/hoodie-shop
// The SHOP'S own token – a fine-grained personal access token with Issues: Read and write, only for REPO
const SHOP_TOKEN = process.env.GITHUB_ISSUES_TOKEN as string

/* ===== LOGIN – with the ADMIN'S GitHub account ===== */

/* --- 1. Where we send the user: GitHub's own login page --- */
export function getAuthorizeUrl(state: string /* , codeChallenge: string */) { // PKCE
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL, // must match one of the Redirect URIs in the OAuth App's settings
    scope: 'read:user', // only who the user is – the issues use the shop's own token
    state, // we check it in the callback → protects against CSRF
    // code_challenge: codeChallenge, // PKCE: the hash of a secret only our server knows
    // code_challenge_method: 'S256', // PKCE
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

/* --- 2. The code from the callback → the admin's access token --- */
export async function exchangeCode(code: string /* , codeVerifier: string */): Promise<string> { // PKCE
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' }, // otherwise GitHub answers in form format
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
      // code_verifier: codeVerifier, // PKCE: GitHub hashes it and compares with code_challenge
    }),
    signal: AbortSignal.timeout(5_000),
  })
  const answer: any = await response.json()
  // GitHub answers 200 even when the code is wrong – the error is in the body, e.g. "bad_verification_code"
  if (!answer.access_token) throw new Error(`GitHub refused the code: ${answer.error}`)
  // In your shop: validate the answer with Zod before you use it.
  return answer.access_token // used ONCE, in getUser() – then thrown away, as Google's tokens in L9
}

/* --- 3. Who is it? The admin's access token → GitHub's user --- */
export async function getUser(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
  const user: any = await response.json()

  return {
    id: user.id,
    login: user.login,
  }
}

/* ===== ISSUES – with the SHOP'S token, so GitHub shows the shop's account as the author ===== */

// YOUR TURN (VG): fill in createIssue() and listOpenIssues().
// Getting started with GitHub's REST API – the headers, the token, the answers:
//   https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api
// The same pattern as getUser() above – but with SHOP_TOKEN and REPO, not the admin's token.

// Docs: https://docs.github.com/en/rest/issues/issues#create-an-issue
// Return { number, title, url } – routes/issues.ts and React use them.
export async function createIssue(title: string, body: string): Promise<{ number: number; title: string; url: string }> {
  throw new Error('createIssue() is not done yet')
}

// Docs: https://docs.github.com/en/rest/issues/issues#list-repository-issues
// Return [{ number, title, url, author }] – React shows them in the list.
export async function listOpenIssues(): Promise<{ number: number; title: string; url: string; author: string }[]> {
  throw new Error('listOpenIssues() is not done yet')
}
