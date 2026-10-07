import { string, z } from 'zod';
import { fetchJson } from '../lib/fetchJson.ts';

const BASE_URL = process.env.SUPPLIER_API_URL;
const API_KEY = process.env.SUPPLIER_API_KEY ?? '';
const TIMEOUT_MS = Number(process.env.SUPPLIER_API_TIMEOUT_MS ?? 5000);
const CACHE_MS = Number(process.env.SUPPLIER_CACHE_SECONDS ?? 300) * 1000;
const BRANSCH = process.env.SUPPLIER_BRANSCH ?? 'klader';
const PAGE_SIZE = 45;

// 1. What the supplier's data SHOULD look like (according to their documentation).
const SupplierProduct = z.object({
  artNr: z.string(),
  benamning: z.string(),
  kategori: z.string(),
  prisOre: z.int().nonnegative(),
  lagersaldo: z.int(),
  varianter: z.string(),
  uppdaterad: z.iso.datetime(),
});





// z.infer creates the TypeScript type from the schema, so we don't write the same fields twice:
// { artNr: string; benamning: string; …; lagersaldo: number | null; … }
type SupplierProduct = z.infer<typeof SupplierProduct>;

const SupplierResponse = z.object({
  // unknown: each product is validated on its own below, so ONE broken product doesn't fail the whole list.
  data: z.array(z.unknown()),
});

// OUR model – the only thing the rest of the app and React get to see.
export type Product = {
  sku: string;
  name: string;
  category: string;
  price: number; // SEK (kronor)
  stock: number;
  variants: string[];
  updatedAt: string;
};

// 2. Translate to OUR model.
function toProduct(p: SupplierProduct): Product {
  return {
    sku: p.artNr,
    name: p.benamning,
    category: p.kategori,
    price: p.prisOre / 100, // öre → kronor
    stock: p.lagersaldo ?? 0, // unknown stock counts as out of stock
    variants: p.varianter ? p.varianter.split(',') : [],
    updatedAt: p.uppdaterad,
  };
}

async function fetchProducts() {
  const data = await fetchJson(`${BASE_URL}/products?bransch=${BRANSCH}&pageSize=${PAGE_SIZE}`, {
    headers: { 'X-Api-Key': API_KEY },
    timeoutMs: TIMEOUT_MS,
  });

  // The whole response has the wrong format → abort.
  const parsed = SupplierResponse.safeParse(data);
  if (!parsed.success) {
    throw new Error(`The supplier responded with an unexpected format:\n${z.prettifyError(parsed.error)}`);
  }

  // One product has the wrong format → skip it and log.
  const products: Product[] = [];
  let skippedCount = 0;
  for (const raw of parsed.data.data) {
    const result = SupplierProduct.safeParse(raw);
    if (result.success) {
      products.push(toProduct(result.data));
    } else {
      skippedCount++;
      console.warn('Skipping product from the supplier:', {problem: z.prettifyError(result.error)});
    }
  }
  return { products, skippedCount };
}

// 4. In-memory cache
type Catalog = { 
  products: Product[]; 
  skippedCount: number; 
  fetchedAt: string 
};

let cache: { value: Catalog; expiresAt: number } | null = null;

export async function getSupplierProducts(): Promise<Catalog & { fromCache: boolean }> {
  if (cache && cache.expiresAt > Date.now()) {
    return { ...cache.value, fromCache: true };
  }
  const value: Catalog = { 
    ...(await fetchProducts()), 
    fetchedAt: new Date().toISOString() 
  };
  cache = { value, expiresAt: Date.now() + CACHE_MS };
  return { ...value, fromCache: false };
}
