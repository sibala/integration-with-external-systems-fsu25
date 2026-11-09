import cookieParser from 'cookie-parser'
import express from 'express'
import authRouter from './routes/auth.ts'

if (!process.env.SESSION_TOKEN_SECRET) {
  throw new Error('Copy .env.example to .env and fill in SESSION_TOKEN_SECRET.')
}

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
