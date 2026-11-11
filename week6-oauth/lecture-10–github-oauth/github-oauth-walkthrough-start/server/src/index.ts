import cookieParser from 'cookie-parser'
import express from 'express'
import authRouter from './routes/auth.ts'
import issuesRouter from './routes/issues.ts'

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/admin/issues', issuesRouter)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
