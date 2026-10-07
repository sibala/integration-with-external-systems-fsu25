---
marp: true
theme: default
paginate: true
---

# Integration with third-party systems

## Lecture 2 – Robust REST integrations

---

# What can go wrong when we call someone else?

- The service doesn't respond at all (network error)
- The service responds too slowly (timeout)
- The service responds with an error (`500`, `503`)
- We have called too often (`429`)
- We made a mistake (`400`, `401`, `404`)
- The service responds `200` – but the data doesn't look like we expected

**Each item needs its own plan.**

---

# Which errors are worth retrying?

| Status | Means | Retry? |
|---|---|---|
| Timeout / network error | We got no response | Yes |
| `408` | The server gave up waiting for our request | Yes |
| `500`, `502`, `503`, `504` | An error on their side, often temporary | Yes |
| `429` | We have called too often | Yes, but wait first |
| `400` | We sent something invalid | No – fix request |
| `401`, `403` | Wrong key or permission | No – fix the key |
| `404` | Doesn't exist | No |

---

# Timeout

`fetch` has no timeout of its own. Without one, we can wait for minutes.

```ts
const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

- After 5 seconds the call is aborted with a `TimeoutError`
- Without a timeout, a slow supplier makes our own route slow too
- A timeout is often temporary – a candidate for retries

---

# Extra: Retries

Try again – but wait a little between the attempts:

```
Attempt 1 → 503 → wait 1 s
Attempt 2 → 503 → wait 1 s
Attempt 3 → 200 ✅
```

- Only retry the errors that can go away: `408`, `429`, `500`, `502`, `503`, `504`
- **Give up** after a certain number of attempts (we use 3 attempts in total)
- Log every attempt, so you can see what happens
- Timeouts and network errors can also be retried, but they make `fetch` throw – that needs a `try/catch`

---

# Only retry when it is safe

| Call | Retry? |
|---|---|
| `GET /products` – fetch | Yes, it doesn't change anything |
| `POST /payments` – create a payment | **Dangerous** – the customer can be charged twice |

Today we only make `GET` calls.

---

# Rate limits: 429

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 10
```

- The supplier limits how often we may call
- `Retry-After` says how many seconds we should wait
- The solution is usually **fewer calls** – not more retries

---

# Never trust external data

The documentation says that `prisOre` is a number. But:

```json
{ "artNr": "LEV-1037", "benamning": "Mjukisbyxor Vit", "prisOre": "ej satt" }
```

Without a check:

- `"ej satt" / 100` becomes `NaN` – the price is shown as "NaN kr"
- Or even worse: it is saved in the database

---

# Why TypeScript is not enough

```ts
const data = (await response.json()) as SupplierProduct;
```

- `as` checks **nothing** – it only tells the compiler "trust me"
- TypeScript types disappear when the code is compiled
- The supplier's data arrives when the program **runs**

TypeScript protects you from **your own** mistakes. Zod protects you from **theirs**.

---

# Validate with Zod

```ts
import { z } from 'zod';

const SupplierProduct = z.object({
  artNr: z.string(),
  benamning: z.string(),
  prisOre: z.number().int().nonnegative(),
  lagersaldo: z.number().int().nullable(),
});

const result = SupplierProduct.safeParse(raw);
if (!result.success) {
  console.warn(z.prettifyError(result.error));
}
```

`safeParse` doesn't throw – we decide what should happen.

```ts
type SupplierProduct = z.infer<typeof SupplierProduct>; // the TS type, from the same schema
```

One schema – both the runtime check and the type.

---

# One broken row should not stop everything

| If this is wrong | Do this |
|---|---|
| The whole response (e.g. `data` is missing) | Abort – something is seriously wrong |
| A single product | Skip it, log it and continue |

44 products that work are better than 0.

---

# Map to your model

| The supplier | Your shop |
|---|---|
| `artNr: "LEV-1001"` | `sku: "LEV-1001"` |
| `benamning` | `name` |
| `prisOre: 59900` | `price: 599` |
| `lagersaldo: null` | `stock: 0` |
| `varianter: "S,M,L"` | `variants: ["S", "M", "L"]` |

The mapping happens **in the adapter**. Routes and React only see your model.

---

# Error handling in one place

| Level | Responsibility |
|---|---|
| `fetchJson` | Throws on network errors, timeouts and when `response.ok` is false |
| The adapter | Throws when Zod says the response has the wrong format |
| The route | No `try/catch` – Express 5 passes errors from `async` routes on |
| Express error handler | Logs the details, sends `500` with a short message – never a stack trace |
| React | Shows something sensible to the user |

The details end up in the server log, not in the browser.

---

# Caching in the backend

The supplier's catalogue changes maybe once a day. Should we call them on every page view?

- Fewer calls → no `429`
- Faster pages
- The shop keeps working for a while even if the supplier is down

**Always ask:** how old may the data be? Exchange rates: a day. Stock: maybe a minute.

**Not the same as the browser's cache:** `Cache-Control` decides what the browser caches. Our Express cache is invisible to the browser – that's why we add `X-Cache: HIT/MISS`.

---

<!-- Live coding -->

# Live coding: the supplier API

A made-up supplier API – so that we can control when things go wrong.

- API key in the header `X-Api-Key`
- Swedish field names, prices in öre – and one broken product
- Max 10 calls per 10 seconds
- `/chaos/v1` – many calls fail with `503` or respond very slowly

Documentation: https://leverantor-api.vercel.app/docs

---

# See the calls in the browser

**F12 → Network → Fetch/XHR**

| Question | Look at |
|---|---|
| What did I send? | Request Headers – `X-Api-Key` is visible in plain text |
| What did they respond? | Status Code, Response |
| Did the response come from the cache? | Size: `(disk cache)` / `(memory cache)`, or Status `304` |
| How long may it be cached? | `Cache-Control: private, max-age=60` |
| How many calls do I have left? | `X-RateLimit-Remaining` |
| How long should I wait? | `Retry-After` |

---

# Exercise for the rest of the week

**Part 1 – Put the supplier integration to the test**
Run `supplier-robust-integration/` and provoke: `/chaos/v1`, a wrong key, the rate limit. **Extra feature**: retries in `fetchJson`

**Part 2 – Make your Frankfurter adapter robust**, in your own shop:
`fetchJson` with a timeout · Zod · a general error handler · a cache

Instructions: `labb.md`
