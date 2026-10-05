# Reminder: a new Express + React project in TypeScript

This is how the reference code was created. Use it when you start a new project, or to compare with your own shop. You need **Node 22.18 or later** (`node -v`).

**1. Project folder**

```bash
mkdir frankfurther-integration
cd frankfurther-integration
```

**2. Server: Express + TypeScript**

```bash
mkdir server
cd server
npm init -y
npm pkg set type=module
npm install express
npm install -D typescript @types/node @types/express
npx tsc --init
npm pkg set scripts.dev="node --watch --env-file=.env src/index.ts" scripts.start="node --env-file=.env src/index.ts" scripts.typecheck="tsc"
mkdir src
touch src/index.ts .env .env.example .gitignore
```

Node runs the `.ts` files directly, so there is no build step. `tsc` only checks the types. In `tsconfig.json`, replace the line `"types": [],` with:

```json
"types": ["node"],
"lib": ["esnext"],
"noEmit": true,
"allowImportingTsExtensions": true,
"erasableSyntaxOnly": true,
```

Write `node_modules` and `.env` on two lines in `.gitignore`, and `PORT=3000` in `.env` and `.env.example`. Then add a first route in `src/index.ts`:

```ts
import express from 'express'

const app = express()
app.use(express.json())

app.get('/api/currency', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

```bash
npm run dev
```

Open http://localhost:3000/api/currency.

**3. Client: React + TypeScript with Vite**

In a new terminal, from the `frankfurther-integration` folder:

```bash
npm create vite@latest client -- --template react-ts --no-interactive
cd client
npm install
```

In `client/vite.config.ts`, send all calls to `/api` to Express, so that React can call your backend without CORS:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
```

```bash
npm run dev
```

Open http://localhost:5173. In React you can now call `fetch('/api/currency')`.
