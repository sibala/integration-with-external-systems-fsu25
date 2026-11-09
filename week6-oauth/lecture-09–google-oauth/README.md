# Lecture 9 – Log in with Google (OAuth 2.0 + OpenID Connect)


## Video links
- [01 - Google OAuth slides](https://medieinstitutet.sharepoint.com/sites/FSU25D/_layouts/15/stream.aspx?id=%2Fsites%2FFSU25D%2FDelade%20dokument%2FIntegration%20med%203%2Dpartssystem%2FRecordings%2FIntegration%20med%203%2Dpartssystem%2D20261109%5F091344%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Eb17eaf40%2Db66a%2D42b7%2D840a%2D60a9201de809)(28m)
- [02 - Setting up Google Cloud ](https://medieinstitutet.sharepoint.com/sites/FSU25D/_layouts/15/stream.aspx?id=%2Fsites%2FFSU25D%2FDelade%20dokument%2FIntegration%20med%203%2Dpartssystem%2FRecordings%2FIntegration%20med%203%2Dpartssystem%2D20261109%5F094134%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E2650e83a%2D3057%2D406c%2Dbf4d%2D95bed3d2686d)(14m)
- [03 - Google OAuth codewalkthrough](https://medieinstitutet.sharepoint.com/sites/FSU25D/_layouts/15/stream.aspx?id=%2Fsites%2FFSU25D%2FDelade%20dokument%2FIntegration%20med%203%2Dpartssystem%2FRecordings%2FIntegration%20med%203%2Dpartssystem%2D20261109%5F101205%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E82220513%2D2a64%2D4543%2D983e%2D370768088da9)(50m)
- [04 - Present Assignment 2 and Labb 6](https://medieinstitutet.sharepoint.com/sites/FSU25D/_layouts/15/stream.aspx?id=%2Fsites%2FFSU25D%2FDelade%20dokument%2FIntegration%20med%203%2Dpartssystem%2FRecordings%2FIntegration%20med%203%2Dpartssystem%2D20261109%5F112238%2DMeeting%20Recording%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ef429e623%2Df6c3%2D4c73%2D85b7%2Dc083b1764e77)(12m)





## Goals

After this lecture you can:

- explain the problem OAuth 2.0 solves, the roles in the flow, and what OpenID Connect adds
- explain the Authorization Code flow with `state` and PKCE
- read Google's ID token and explain why the customer is found by `sub`, not by e-mail
- let customers log in to your shop with Google, without a library, and keep them logged in with the shop's own cookie
- explain which cookie options from L8 the login needs, and why

You build this in your own shop in **Labb 6**.

## 1. Theory

Study `slides.md`: what we use from L8, the problem OAuth solves, the roles, OAuth 2.0 vs OpenID Connect, the Authorization Code flow, `state`, PKCE, scopes, the ID token and its claims, `sub` vs e-mail, the shop's own login after the callback, Google's tokens, and how to set up Google Cloud locally and deployed.

## 2. Code walkthrough: `google-oauth-walkthrough/`

"Log in with Google" for customers – the whole OAuth flow by hand, without a library, so you see every step.

**Create a Google OAuth client – once**

1. [Google Cloud Console](https://console.cloud.google.com) → create a project
2. **APIs & Services → OAuth consent screen → Get started**: the app's name, your e-mail and Audience *External*. Audience, Branding and Data Access don't need anything more for a login – with only `openid email profile`, every Google account can log in, no test users needed
3. **Clients → Create client** → *Web application*. Authorized redirect URI: `http://localhost:5173/api/auth/google/callback`
4. Copy the **Client ID** and the **Client secret** to `.env` at once – the secret is only shown when the client is created

```bash
# Terminal 1 – the server
cd google-oauth-walkthrough/server
cp .env.example .env    # fill in the GOOGLE_ values and SESSION_TOKEN_SECRET
npm install
npm run dev

# Terminal 2 – the client
cd google-oauth-walkthrough/client
npm install
npm run dev             # http://localhost:5173
```

`server/src/integrations/googleAdapter.ts` is the only file that knows Google. Every step is logged in the server terminal.

1. **Start** – `GET /api/auth/google` (`routes/auth.ts`): creates `state`, saves it in a short httpOnly cookie, and sends the user to Google with `getAuthorizeUrl()`
2. **Callback** – `GET /api/auth/google/callback?code=…&state=…`:
   - `state` must match the cookie – otherwise it's not the login we started
   - `exchangeCode()` swaps the code for Google's ID token – server to server, with the client secret
   - The ID token is a JWT. `exchangeCode()` checks `iss`, `aud` and `exp`, and returns `sub`, `email`, `email_verified` and `name`
   - The shop sets **its own** httpOnly JWT cookie, as in L8's `jwt-walkthrough` – Google's tokens aren't saved
3. **Logged in** – `GET /api/auth/me` uses `verifyToken` (`middleware/auth.ts`), and `POST /api/auth/logout` clears the cookie. Both only use the shop's own cookie

## 3. Reading instructions

- [OpenID Connect (Google for Developers)](https://developers.google.com/identity/openid-connect/openid-connect) – the flow, the token endpoint and the claims in the ID token
- [Using OAuth 2.0 for web server applications (Google for Developers)](https://developers.google.com/identity/protocols/oauth2/web-server)
- [RFC 7636 – PKCE](https://datatracker.ietf.org/doc/html/rfc7636) – sections 1 and 4 explain the attack and the solution