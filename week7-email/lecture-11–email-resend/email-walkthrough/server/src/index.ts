import express from 'express'
import ordersRouter from './routes/orders.ts'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Copy .env.example to .env and fill in RESEND_API_KEY.')
}

const app = express()
app.use(express.json())

app.use('/api/orders', ordersRouter)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
