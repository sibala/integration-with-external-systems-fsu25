import { Router } from 'express'
import { getRates } from '../integrations/currencyAdapter.ts';

const router = Router()

router.get('/rates', async (req, res) => {
    const base = (req.query.base ?? 'SEK') as string
    // const symbols = req.query.symbols as string

    res.json(await getRates(base))
})

export default router