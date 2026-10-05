---
marp: true
theme: default
paginate: true
---

# Integration with Third-Party Systems


# The course at a glance

- **Weeks 41–47:** lessons Monday and Wednesday 09–17, supervision Friday 13–17
- **Block A (w41–44):** REST, data formats, search, payment, storage, shipping
- **Block B (w45–47):** tokens, OAuth, GitHub, email, social media
- **One case:** your e-commerce platform gets connected to the outside world

---

# Examination

| | Assignment 1 | Assignment 2 |
|---|---|---|
| Learning outcomes | 1, 3, 5 | 2, 4 |
| Grade | IG/G | IG/G/VG |
| Presented | 12/10 | 2/11 |
| Submission | Fri 30/10 at 23:59 | Fri 20/11 at 23:59 |

Both assignments are **individual**.

---

# Your shop today → your shop in 7 weeks

| Today | In 7 weeks |
|---|---|
| Product list | Search API + import from supplier (CSV/XML) |
| Shopping cart | Real payment + shipping calculation |
| Product images as URLs to online images | Image upload to cloud storage |
| Custom login | Log in with GitHub/Google + email verification |

---


# What is a third-party system?

A service that **someone else** builds, runs and is responsible for – and that your app uses through an interface.

- **First party:** you (your app)
- **Second party:** your user
- **Third party:** Klarna, Shippo, GitHub, Google, Cloudinary …

---

# Why not build it yourself?

| Build it yourself | Integrate |
|---|---|
| Card payments require PCI DSS certification | Stripe already has it |
| Email ends up in the spam folder | SendGrid/Resend have a reputation with Gmail |
| Your own password handling = your responsibility if it leaks | "Log in with Google" |
| Months of development | Hours or days |

**Rule of thumb:** build what is your unique value, integrate the rest.

---

# The price: you become dependent

- **Outages** – their problem becomes your problem
- **Price changes** – free tiers disappear
- **Versioning** – APIs change and old versions are shut down
- **Lock-in** – hard to switch provider
- **GDPR** – the provider becomes a *data processor*, data may end up outside the EU
- **Security** – leaked API keys give others access in your name

---

# Integration models

| Model | How it works | In the course |
|---|---|---|
| REST calls | You ask, they answer | Shipping, search, currencies |
| Webhooks | They call you when something happens | Stripe, GitHub |
| Polling | You ask again and again | Comparison with webhooks |
| SDK | Their library handles HTTP for you | Stripe SDK |
| Redirect/hosted | The user is sent to them and back | Stripe Checkout, OAuth |
| File-based | Files are exchanged (CSV, XML, SFTP) | Supplier catalog |
| GraphQL/SOAP | Other API styles | Overview |

---

# Push or pull?

**Polling (pull):** "Is the payment done? … How about now? … How about now?"

**Webhook (push):** "I'll let you know when the payment is done."

- Polling is simple but wastes calls and is slow
- Webhooks are efficient but require a public URL and verification

---

# Synchronous or asynchronous?

What happens when the external service is **slow** or **down**?

- The user waits for 30 seconds? ❌
- The whole page crashes? ❌
- Timeout + clear error message + fallback? ✅

**Every external service will go down at some point.** Design for it.

---

# So far: fetch in React

```jsx
// React – runs in the user's browser
useEffect(() => {
  fetch('https://api.frankfurter.dev/v1/latest?base=SEK')
    .then((res) => res.json())
    .then((data) => setRates(data.rates));
}, []);
```

Works – as long as the API is open, free and needs no key.

But payment gateways, shipping APIs and cloud storage require **secret keys**.

---

# From now on: through Express

```jsx
// React – calls OUR backend
fetch('/api/currency/rates?base=SEK')
```

```ts
// Express – calls the third party
const res = await fetch(`${process.env.CURRENCY_API_URL}/latest?base=SEK`, {
  signal: AbortSignal.timeout(5000),
});
```

Same `fetch` – but now on the server.

---

# Why through the backend?

```
❌  React ──────────────→ External service
✅  React ──→ Express ──→ External service
```

1. **Secrets** – API keys are visible in the browser
2. **CORS** – many APIs don't allow calls from the browser
3. **Rate limits** – a cache in the backend protects your quota
4. **Transformation** – React gets *your* data model, not the provider's
5. **Switching provider** – only the backend needs to change

---

# What's new when fetch runs on the server?

| | In the browser | On the server (Node) |
|---|---|---|
| `fetch` | Available | Also available, same syntax |
| CORS | Can block the call | Doesn't apply – CORS is a browser rule |
| API keys | Visible to everyone in DevTools | Stay on the server in `.env` |
| Timeout | The browser decides | You decide (`AbortSignal.timeout`) |
| Errors | Shown directly to the user | You send an understandable response to React |
| Logs | The browser console | The server's terminal or the logs in Render/Vercel |

---

# The adapter pattern

```
routes/currency.ts  →  integrations/currencyAdapter.ts  →  Frankfurter API
     (your app)               (the adapter)                  (third party)
```

- Routes and React do **not** know which provider is used
- The adapter translates the provider's format into your format
- If you switch provider, you rewrite **one** file

We use this pattern throughout the course.

---


# Code walkthrough

**Prices in multiple currencies in the web shop**

- API: Frankfurter (the European Central Bank's exchange rates)
- No API key needed
- Documentation: https://frankfurter.dev


