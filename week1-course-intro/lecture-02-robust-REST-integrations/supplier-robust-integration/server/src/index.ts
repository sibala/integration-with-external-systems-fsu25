import express, { type NextFunction, type Request, type Response } from 'express';
import supplierRoutes from './routes/supplier.ts';

const app = express();

app.use(express.json());
app.use('/api/supplier', supplierRoutes);

// General error handling for all errors
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${req.method} ${req.originalUrl} failed: ${message}`);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
