/**
 * JSON-LD structured-data helpers.
 *
 * Used by the storefront to emit schema.org objects that Google
 * and other search engines turn into rich results. The functions
 * here are pure: they return objects, and the caller renders
 * them inside a <script type="application/ld+json"> tag.
 *
 * The Product type used by productLd is structurally compatible
 * with @anzara/shared-types' Product but defined locally so this
 * package doesn't take a dependency on it.
 */

/** Minimal Product shape needed for productLd. */
export interface ProductLike {
  name: unknown;
  description: unknown;
  /** Base price in paisa (the smallest unit). */
  basePrice: number | { amount: number };
  images: Array<{ url: string }>;
  variants?: Array<{ sku?: string | null }>;
}

export type JsonLdObject = Record<string, unknown>;

export interface OrganizationInput {
  name: string;
  url: string;
  logoUrl?: string;
  sameAs?: string[]; // social profile URLs
  contactEmail?: string;
  contactPhone?: string;
}

export function organizationLd(input: OrganizationInput): JsonLdObject {
  const out: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };
  if (input.logoUrl) out['logo'] = input.logoUrl;
  if (input.sameAs && input.sameAs.length > 0) out['sameAs'] = input.sameAs;
  if (input.contactEmail || input.contactPhone) {
    const cp: JsonLdObject = { '@type': 'ContactPoint' };
    if (input.contactEmail) cp['email'] = input.contactEmail;
    if (input.contactPhone) cp['telephone'] = input.contactPhone;
    cp['contactType'] = 'customer service';
    out['contactPoint'] = [cp];
  }
  return out;
}

export interface WebSiteInput {
  name: string;
  url: string;
  /** Optional site-search URL template, e.g. `${url}/products?search={search_term_string}` */
  searchUrlTemplate?: string;
}

export function webSiteLd(input: WebSiteInput): JsonLdObject {
  const out: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };
  if (input.searchUrlTemplate) {
    out['potentialAction'] = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: input.searchUrlTemplate,
      },
      'query-input': 'required name=search_term_string',
    };
  }
  return out;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export interface ProductLdInput {
  product: ProductLike;
  url: string;
  /** Site URL used to absolutize relative image URLs. */
  siteUrl: string;
  /** Currency code (defaults to BDT). */
  currency?: string;
  /** Average rating 0-5, plus count. */
  rating?: { value: number; count: number };
  /** Inventory status, default inStock. */
  availability?: 'inStock' | 'outOfStock' | 'preorder';
}

export function productLd(input: ProductLdInput): JsonLdObject {
  const { product, url, siteUrl } = input;
  const currency = input.currency ?? 'BDT';

  const images: string[] = product.images
    .map((img) => (img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`))
    .filter(Boolean);

  // Localized name/description
  const name =
    (typeof product.name === 'object' && product.name !== null
      ? (product.name as { en?: string }).en
      : (product.name as unknown as string)) || '';
  const description =
    (typeof product.description === 'object' && product.description !== null
      ? (product.description as { en?: string }).en
      : (product.description as unknown as string)) || '';

  const basePriceAmount: number =
    typeof product.basePrice === 'number' ? product.basePrice : product.basePrice.amount;

  const offers: JsonLdObject = {
    '@type': 'Offer',
    url,
    priceCurrency: currency,
    price: (basePriceAmount / 100).toFixed(2),
    availability:
      input.availability === 'outOfStock'
        ? 'https://schema.org/OutOfStock'
        : input.availability === 'preorder'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
    seller: { '@type': 'Organization', name: 'Anzara' },
  };

  const out: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images,
    sku: product.variants?.[0]?.sku,
    brand: { '@type': 'Brand', name: 'Anzara' },
    offers,
  };

  if (input.rating && input.rating.count > 0) {
    out['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.value,
      reviewCount: input.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return out;
}

/**
 * Render a JSON-LD object as a `<script>` tag string.
 * Use inside JSX:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: jsonLdScript(orgLd) }} />
 */
export function jsonLdScript(obj: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
