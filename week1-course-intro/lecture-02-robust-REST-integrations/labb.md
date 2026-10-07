# Lab – Robust integrations

The lab has three parts:

1. **Put the supplier integration to the test.** Run `supplier-robust-integration/` from the live coding and provoke the errors it is built to handle. This is where you see what a timeout, Zod, error handling and a cache actually do.
2. **Add Retries to /lib/fetchJson.ts.** Follow the instructions at the top of `server/src/lib/fetchJson.ts` and make `fetchJson` retry on `408`, `429`, `500`, `502`, `503` and `504`.
3. **Make your currency adapter robust.** Give the Frankfurter adapter in **your own shop** from lecture 1 the same protection.

---

## Part 1 – Put the supplier integration to the test

Start the server and the client as described in `README.md`, and open http://localhost:5173. Keep the server's terminal and the browser's network tab open.

Restart the server after each change in `server/.env`. For each test: what does the **terminal** show, and what does **React** show?

| Test | How | Expected result |
|---|---|---|
| Broken data | Run as it is (`/v1`) | 44 products in React. The terminal logs that `LEV-1037` is skipped, and why |
| Unstable supplier | `SUPPLIER_API_URL=https://leverantor-api.vercel.app/chaos/v1` and `SUPPLIER_CACHE_SECONDS=0`, reload many times | Sometimes products, sometimes an error. The terminal shows `status 503 Service Unavailable` or `No response … (timeout)` |
| Timeout | Stay on `/chaos/v1` and look at the slow calls in the network tab | They are aborted after 5 seconds, even though the supplier would answer after about 8 |
| Wrong key | `SUPPLIER_API_KEY=wrong` | React shows an error. The terminal shows `status 401` |
| Rate limit | Back to `/v1` and the right key, `SUPPLIER_CACHE_SECONDS=0`, reload quickly more than 10 times | The terminal shows `status 429` |
| Cache | `SUPPLIER_CACHE_SECONDS=300`, reload a few times | The network tab shows `X-Cache: MISS` on the first call, then `HIT`. React shows "(from cache)" |

Then answer:

- Where in the code is each error caught? Follow it from `fetchJson.ts` via `supplierAdapter.ts` to the error handler in `index.ts`.
- What would React show for the broken product without the Zod validation?
- Why does React never show a stack trace, whatever goes wrong?
- With the cache on, how many of your reloads actually reach the supplier?

---


## Part 2 - Add Retries to /lib/fetchJson.ts


Many of the `503` errors from `/chaos/v1` are temporary: the same call may work a second later. Follow the instructions at the top of `server/src/lib/fetchJson.ts` and make `fetchJson` retry on `408`, `429`, `500`, `502`, `503` and `504`.

Test it against `/chaos/v1`: the terminal should show attempts that fail and then succeed, and React should show errors much more rarely. A wrong key (`401`) must still fail right away, without retries.


---

## Part 3 – Make your currency adapter robust

Go back to `integrations/currencyAdapter.ts` in **your own shop**. You don't need to provoke any errors here – you have already seen them in part 1. 


Every step below fixes specific problem.

### Step 1 – `fetchJson` with a timeout

Copy `server/src/lib/fetchJson.ts` from the supplier project to your shop, and use it in your adapter instead of calling `fetch` directly. Make sure you can explain every line:

- Why `AbortSignal.timeout`?
- Why check `response.ok`? Doesn't `fetch` throw on errors?

### Step 2 – Validate with Zod

```bash
npm install zod
```

Write a Zod schema for Frankfurter's response and derive the type from it:

```ts
const FrankfurterRates = z.object({ /* … */ });
type FrankfurterRates = z.infer<typeof FrankfurterRates>;
```

Here is what Frankfurter answers to `GET /v1/latest?base=SEK&symbols=EUR,USD`:

```json
{ "amount": 1.0, "base": "SEK", "date": "2026-10-06", "rates": { "EUR": 0.08895, "USD": 0.10024 } }
```

- A rate must be a **positive number**. Which Zod methods express that?
- `rates` is an object with unknown keys. Look up `z.record()` in the Zod documentation.
- Why does a TypeScript type alone not protect you from external data?
  - Remove `as FrankfurterRates`. Use `safeParse` and throw an error if the validation fails.

### Step 3 – A general error handler

Add an error handler in Express, like the one in the supplier project's `index.ts`: log one readable line about what went wrong, and send `500` with a short message. Never a stack trace.

In React: if the rates can't be fetched, the shop must not break. Show the prices in SEK instead.

### Step 4 – Cache

Exchange rates change once per working day. Cache them in memory in the adapter, with the cache time from `.env` (for example `CURRENCY_CACHE_SECONDS`).

- What is a sensible cache time for exchange rates?
- An in-memory cache disappears every time the server restarts, for example on a new deploy. That's fine for a few minutes of cache, but not if the data should be kept for hours. Where could you store the cache instead, so that it survives a restart?
