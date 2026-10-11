/**
 * Phase 2 smoke test. Exercises public + admin catalog endpoints.
 * Run with: pnpm exec tsx scripts/test-phase2.ts
 * (Requires backend to be running and a saved admin token in $TEMP/admin_token.txt)
 */
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const tokenPath = join(tmpdir(), 'admin_token.txt');
const token = readFileSync(tokenPath, 'utf8').trim();

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

function api<T = unknown>(p: string, opts: ApiOptions = {}): Promise<{ status: number; json: T }> {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:4000' + p);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.token) headers['Authorization'] = 'Bearer ' + opts.token;
    const req = http.request(
      {
        method: opts.method ?? 'GET',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(text) as T });
          } catch {
            resolve({ status: res.statusCode ?? 0, json: text as unknown as T });
          }
        });
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

interface ProductsListResponse {
  success: boolean;
  data: { data: unknown[]; meta: { total: number } };
}
interface CategoriesListResponse {
  success: boolean;
  data: { id: string }[];
}
interface ProductResponse {
  success: boolean;
  data: { id: string; slug: string };
}
interface DeleteResponse {
  success: boolean;
}

async function main(): Promise<void> {
  const ap = await api<ProductsListResponse>('/api/admin/products?limit=3', { token });
  console.log(
    'admin.products',
    ap.status,
    'success=' + ap.json.success,
    'total=' + ap.json.data.meta.total,
    'pageCount=' + ap.json.data.data.length,
  );

  const ac = await api<CategoriesListResponse>('/api/admin/categories', { token });
  console.log(
    'admin.categories',
    ac.status,
    'success=' + ac.json.success,
    'count=' + ac.json.data.length,
  );

  const catId = ac.json.data[0]?.id;
  if (!catId) return;
  const create = await api<ProductResponse>('/api/admin/products', {
    method: 'POST',
    token,
    body: {
      slug: 'phase2-test-product',
      name: { en: 'Phase 2 Test', bn: 'Phase 2 Test' },
      description: { en: 'Created during Phase 2 verification.', bn: 'Verification.' },
      basePrice: 99000,
      categoryId: catId,
      tags: ['test', 'phase2'],
      variants: [
        { sku: 'ANZ-P2-001-OS', size: 'OS', price: 99000, stockQuantity: 5, isActive: true },
      ],
      images: [],
    },
  });
  console.log(
    'create.product',
    create.status,
    'success=' + create.json.success,
    'slug=' + create.json.data?.slug,
  );
  if (create.json.data) {
    const del = await api<DeleteResponse>('/api/admin/products/' + create.json.data.id, {
      method: 'DELETE',
      token,
    });
    console.log('delete.product', del.status, 'success=' + del.json.success);
  }
}

void main();
