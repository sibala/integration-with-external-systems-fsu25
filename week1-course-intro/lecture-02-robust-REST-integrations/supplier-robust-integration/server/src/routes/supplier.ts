import { Router } from 'express';
import { getSupplierProducts } from '../integrations/supplierAdapter.ts';

const router = Router();

// GET /api/supplier/products
router.get('/products', async (_req, res) => {
  const { products, skippedCount, fetchedAt, fromCache } = await getSupplierProducts();
  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  res.json({ 
    products, 
    skippedCount, 
    fetchedAt, 
    fromCache 
  });
});

export default router;
