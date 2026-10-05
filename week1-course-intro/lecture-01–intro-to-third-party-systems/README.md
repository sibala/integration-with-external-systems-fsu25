# Lecture 1 – Introduction to third-party systems


## Video links
- _Added after the lecture._
- [01 - ...]()


## Goals

After this lecture you can:

- explain why we integrate third-party services instead of building everything ourselves, and which risks the dependency brings
- recognise the most common integration models (REST, webhooks, SDK, redirect, file based, GraphQL/SOAP)
- explain why calls to external services go through the backend and not directly from React
- build a first integration through your own adapter, with `.env`, a timeout and basic error handling

## 1. Course intro

Go through the course: goals, the two assignments, the schedule and the case. During the course you connect **your own webshop** from the backend course to the outside world (Maybe you will be given a start repo `e-shop-start` if needed).

## 2. Theory

Study `slides.md`: build it yourself or integrate, the risks of depending on someone else, integration models and the adapter pattern.

## 3. Get started with Express and React setup
- [getting-started-with-express-and-react.md](getting-started-with-express-and-react.md)


## 4 Study the code after the code walk through

The coding shows prices in several currencies, using the [Frankfurter](https://frankfurter.dev) API. Study the reference code in `frankfurter-integration/`:

```bash
cd frankfurter-integration/server
cp .env.example .env
npm install
npm run dev
```

```bash
cd frankfurter-integration/client
npm install
npm run dev
```


## 5. Exercise: Your first adapter

Build the currency adapter in **your own shop**. Put the adapter in `integrations/currencyAdapter.ts` in the server, and implement a currency converter in your client. Add a dropdown of at least 4 currencies [SEK, EUR, USD, IDK] in the navbar, that changes the product prices according to the chosen currency

We go through it together at the start of lecture 2.
Lecture 2 builds on your adapter with retries, validation and caching. So write code you want to meet again.


## 5. Reading instructions

- [Frankfurter API](https://frankfurter.dev)
- [Using the Fetch API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [AbortSignal.timeout() (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [Running TypeScript in Node.js](https://nodejs.org/api/typescript.html)
- [Error handling in Express](https://expressjs.com/en/guide/error-handling.html)
- [Vite server proxy](https://vite.dev/config/server-options#server-proxy)
- [The adapter pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/adapter)
