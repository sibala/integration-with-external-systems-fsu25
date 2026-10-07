import { useEffect, useState } from 'react';

// Same as server's response from GET /api/supplier/products.
type Product = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variants: string[];
  updatedAt: string;
};

type SupplierResult = {
  products: Product[];
  skippedCount: number;
  fetchedAt: string;
  fromCache: boolean;
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);

export default function SupplierProducts() {
  const [result, setResult] = useState<SupplierResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/supplier/products')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        return body as SupplierResult;
      })
      .then(data => setResult(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">Could not fetch the product range: {error}</p>;
  if (!result) return <p>Fetching the supplier's product range …</p>;

  return (
    <section>
      <h2>Supplier's product range</h2>
      <p className="meta">
        {result.products.length} products · fetched {new Date(result.fetchedAt).toLocaleTimeString('sv-SE')}
        {result.fromCache && ' (from cache)'}
        {result.skippedCount > 0 && ` · ${result.skippedCount} product(s) skipped due to errors in the supplier's data`}
      </p>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>In stock</th>
            <th>Variants</th>
          </tr>
        </thead>
        <tbody>
          {result.products.map((p) => (
            <tr key={p.sku}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{formatPrice(p.price)}</td>
              <td>{p.stock}</td>
              <td>{p.variants.join(', ') || '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
