# Lecture 2 – Robust REST integrations


## Video links
- _Added after the lecture._


## Goals

After this lecture you can:

- decide which errors from an external API are worth retrying, and which are not
- make calls more robust with a timeout, and (extra) with retries
- validate external JSON with Zod at runtime, and explain why TypeScript types alone are not enough
- handle errors in one place, so the user never sees a stack trace
- explain when a cache in the backend is needed
- inspect API calls in the browser's network tab: status codes, headers, cache and rate limit

## ~~1. Solution to the previous exercise~~ (Skipped)

~~We go through the currency adapter from lecture 1: your solutions, the error tests and the reference code in `../lecture-01–intro-to-third-party-systems/frankfurter-integration/`.~~

We will focus on todays concepts instead. Please notify me if you feel that lectures about React concepts are needed.

## 2. Theory 

Study `slides.md`: when calls go wrong, timeouts, retries, rate limits, validation, error handling and caching.

## 3. Try out the supplier API by inspecting calls in the browser

- Documentation (Swagger UI): https://leverantor-api.vercel.app/docs – you can try the API directly in the browser
- API key: send the header `X-Api-Key: demo-nyckel-123`, otherwise you get `401`
- Page size: `?pageSize=45` gives all 45 products in one call (the default is 10)
- Rate limit: max 10 calls per 10 seconds, then `429` with `Retry-After`
- Unstable version: `/chaos/v1` instead of `/v1` gives random `503` and slow responses – use it to put the integration to the test
- Pick the industry closest to your shop with `?bransch=`, e.g. `?bransch=elektronik` (list: `GET /v1/branscher`). Without the parameter you get clothes. Use the same industry for the rest of the course.

The supplier speaks its own language: Swedish field names, prices in öre and variants as a comma-separated string. One product has a broken price. The adapter in the live coding has to handle all of it.

## 4. Study the code

The live coding connects a client to the supplier API. Study the reference code in `supplier-robust-integration/`.

Run it in two terminals (needs **Node 22.18 or later**):

```bash
cd supplier-robust-integration/server
cp .env.example .env
npm install
npm run dev
```

```bash
cd supplier-robust-integration/client
npm install
npm run dev
```

Open http://localhost:5173. Change `SUPPLIER_API_URL` in `.env` to `.../chaos/v1` and watch the errors in the server's terminal.

## 5. Exercise: Robust integrations

File: `labb.md`

1. **Put the supplier integration to the test:** run `supplier-robust-integration/`, provoke the errors with `/chaos/v1`, a wrong key and the rate limit, and see how the code handles them. Extra: add retries to `fetchJson`.
2. **Make your currency adapter robust:** give the Frankfurter adapter in **your own shop** from lecture 1 the same protection: a timeout, Zod validation, a general error handler and a cache.

The exercise is for the rest of the week


## 6. Reading instructions

- [Supplier API documentation](https://leverantor-api.vercel.app/docs)
- [Frankfurter API](https://frankfurter.dev)
- [HTTP response status codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [429 Too Many Requests (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429)
- [Retry-After (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)
- [Zod documentation](https://zod.dev)
- [OpenAPI specification](https://swagger.io/specification/)
- [HTTP caching (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
