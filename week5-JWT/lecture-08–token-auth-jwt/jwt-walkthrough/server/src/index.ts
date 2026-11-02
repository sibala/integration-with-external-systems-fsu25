import cookieParser from 'cookie-parser'
import express from 'express'
import authRouter from './routes/auth.ts'

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('Copy .env.example to .env and fill in ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET.')
}

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
