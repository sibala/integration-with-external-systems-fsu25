import express from 'express'
import { getRates } from './integrations/currencyAdapter.ts';

const app = express()
app.use(express.json())


import currencyRouter from './routes/currency.ts'
app.use('/api/currency',currencyRouter)



const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})







