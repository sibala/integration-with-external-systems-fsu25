# Lecture 8 – Tokens, JWT and httpOnly cookies


## Video links




## Goals

After this lecture you can:

- explain the difference between a session and a token, and what a JWT contains
- explain why a JWT is signed but not encrypted
- explain why a short-lived access token and a long-lived refresh token are used, and when one token that lives longer is enough
- explain the two ways to send tokens – in the JSON body with an `Authorization` header, or in httpOnly cookies – and when each fits
- send the tokens in httpOnly cookies
- set safe cookie options: `httpOnly`, `sameSite`, `secure`, `maxAge` and `path`

You need these cookie options in L9, when the admin logs in with GitHub in **Labb 6**.

## 1. Theory

Study `slides.md`: sessions vs tokens, the parts of a JWT, signing vs encryption, short-lived and long-lived tokens, the refresh flow, tokens in JSON vs httpOnly cookies, stolen cookies and refresh token rotation, cookies when React and the API are on different domains, logging out, session vs JWT, why you need to understand tokens even if your shop uses sessions, how OAuth works with the login your shop already has, and the simple way with one token.

## 2. Code walkthrough: `jwt-walkthrough/`

A minimal login: an Express server and a small React app. The tokens are sent in httpOnly cookies – the way that fits a web shop. Tokens in the JSON body are only explained in the slides.

```bash
# Terminal 1 – the server
cd jwt-walkthrough/server
cp .env.example .env    # fill in ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET
npm install
npm run dev

# Terminal 2 – the client
cd jwt-walkthrough/client
npm install
npm run dev             # http://localhost:5173
```

Log in as `anna@example.com` / `hemligt123`. Every step is logged in the server terminal.

1. **The middleware** – `server/src/middleware/auth.ts`:
   - `verifyAccessToken` protects a route: it checks the access cookie and puts the user in `res.locals.user`
   - `verifyRefreshToken` is only used by the refresh route
   - `jwt.verify()` checks the signature and the expiry – no database needed
2. **The routes** – `server/src/routes/auth.ts`:
   - The access token lives **30 s** (so you can watch it expire – in a real shop e.g. 15 min), the refresh token **7 days**
   - Two different secrets: a refresh token can never be used as an access token
   - `POST /api/auth/login` sets two cookies. The refresh cookie has `path: '/api/auth/refresh'`, so it's only sent there
   - `GET /api/auth/me` uses `verifyAccessToken`. React never sees the token
   - `POST /api/auth/refresh` uses `verifyRefreshToken` and sets a new access cookie
   - `POST /api/auth/logout` clears both cookies – React can't remove httpOnly cookies itself

**Try it:** log in, call `/me`, wait 30 s and call `/me` again → `401`. Click **Refresh** and `/me` works again. Open DevTools → Application → Cookies: the cookies are there, but `document.cookie` on the page is empty.

The user is hardcoded at the top of `routes/auth.ts`. The **"In your shop:"** comments show what your shop does instead: users in the database with bcrypt-hashed passwords, and the refresh token saved in the database together with the user's id at login – `/refresh` checks that the row exists, and `/logout` deletes it.

## 3. Exercise (Not graded)

A way to get to know the cookie options before L9.

**Get started in your shop:** install two packages in your shop's server (the Express project, not React):

```bash
npm install jsonwebtoken cookie-parser
npm install -D @types/jsonwebtoken @types/cookie-parser   # only if your server uses TypeScript
```

- `jsonwebtoken` – creates and checks the tokens: `jwt.sign()` and `jwt.verify()`
- `cookie-parser` – reads the cookies the browser sends into `req.cookies`. Add `app.use(cookieParser())` before your routes – without it, `req.cookies` is `undefined`

Using express-session? You don't need either of them.

1. In `jwt-walkthrough`: remove `httpOnly` in `server/src/routes/auth.ts`, log in, and run `document.cookie` in the browser console. What can a script on the page read now? Put `httpOnly` back.
2. In your own shop:
   - **Your shop keeps a token in localStorage?** Move it to an httpOnly cookie, and remove the token from React. Short- and long-lived tokens too complex? One token that lives 8 hours works fine for your shop – see the slide "The simple way".
   - **Your shop uses express-session?** Set `httpOnly`, `sameSite`, `secure` and `maxAge` in the cookie options yourself, and check them in DevTools → Application → Cookies.

## 4. Reading instructions

**JWT**
- [Introduction to JSON Web Tokens (jwt.io)](https://jwt.io/introduction) – and paste a token into [jwt.io](https://jwt.io) to read it
- [jsonwebtoken on npm](https://www.npmjs.com/package/jsonwebtoken)

**Cookies**
- [Using HTTP cookies (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [Set-Cookie: HttpOnly, Secure, SameSite, Path, Max-Age (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [res.cookie() in Express](https://expressjs.com/en/5x/api/response/#rescookie) – the options table: `httpOnly`, `secure`, `sameSite`, `maxAge`, `path`
- [res.clearCookie() in Express](https://expressjs.com/en/5x/api/response/#resclearcookie) – the options must match the ones the cookie was set with, e.g. the same `path`

**Express middleware**
- [res.locals (Express docs)](https://expressjs.com/en/5x/api/response/#reslocals) – data that only lives for one request, e.g. the logged-in user. The walkthrough uses `res.locals.user` to pass the user from the middleware to the route. Many write `req.user` instead (e.g. Passport) – it works the same, but TypeScript then needs the type declared
