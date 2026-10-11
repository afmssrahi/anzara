/**
 * OpenAPI base spec for swagger-jsdoc.
 *
 * - `definition` holds the OpenAPI 3.0 root + reusable component schemas.
 * - The actual `paths` and `operations` are NOT defined here. They are
 *   generated from `@openapi` JSDoc comments on each route file. This
 *   keeps the spec next to the code so it can't drift.
 *
 * To see the merged result, hit /api/docs (UI) or /api/docs.json (raw).
 */
import { getEnv } from '@anzara/config';

const env = getEnv();

export const openapiDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Anzara API',
    version: '1.0.0',
    description:
      'REST API for the Anzara e-commerce platform.\n\n' +
      'Three apps in the system: **storefront** (customers), **admin** (staff), ' +
      'and this **backend** (the single source of truth). The backend owns the ' +
      'database; the frontends only talk to it.\n\n' +
      '**Auth:** most customer routes use a JWT in an httpOnly cookie set by ' +
      '`POST /api/auth/login`. Admin routes use a separate cookie set by ' +
      '`POST /api/auth/admin/login`. 2FA on the admin side uses a `totp` field ' +
      'on the admin login body.\n\n' +
      '**Money:** every amount is in *paisa* (1 BDT = 100 paisa). The wire ' +
      'shape is `{ "amount": 1500, "currency": "BDT" }`.\n\n' +
      '**Error shape:** `{ "success": false, "error": { "code", "message", "details?" } }`.',
    contact: { name: 'Anzara Engineering', email: 'dev@anzara.com' },
    license: { name: 'Private' },
  },
  servers: [
    { url: `http://localhost:${env.PORT}`, description: 'Local development' },
    { url: env.API_URL, description: 'Current (env.API_URL)' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness probe' },
    { name: 'Auth', description: 'Login, logout, profile, password, 2FA' },
    { name: 'Products', description: 'Public catalog' },
    { name: 'Categories', description: 'Public category tree' },
    { name: 'Collections', description: 'Curated product groupings' },
    { name: 'Reviews', description: 'Verified-buyer reviews' },
    { name: 'Content', description: 'Banners + CMS pages (public)' },
    { name: 'Settings (public)', description: 'Brand, contact, social, analytics (public subset)' },
    { name: 'Payments (public)', description: 'Enabled payment methods' },
    { name: 'Cart', description: 'Customer cart (auth required)' },
    { name: 'Addresses', description: 'Customer shipping addresses' },
    { name: 'Orders', description: 'Customer order history' },
    { name: 'Wishlist', description: "Customer's saved products" },
    { name: 'Coupons (customer)', description: 'Customer-side coupon validation' },
    { name: 'Admin · Products', description: 'Full product CRUD (admin)' },
    { name: 'Admin · Categories', description: 'Full category CRUD (admin)' },
    { name: 'Admin · Collections', description: 'Full collection CRUD (admin)' },
    { name: 'Admin · Orders', description: 'Order management (admin)' },
    { name: 'Admin · Coupons', description: 'Coupon CRUD (admin)' },
    { name: 'Admin · Reviews', description: 'Review moderation (admin)' },
    { name: 'Admin · Content', description: 'Banners + pages CRUD (admin)' },
    { name: 'Admin · Settings', description: 'Site settings CRUD (admin)' },
    { name: 'Admin · Dashboard', description: 'KPI summary (admin)' },
    { name: 'Admin · Assets', description: 'Image upload (admin)' },
  ],
  components: {
    securitySchemes: {
      // Auth uses httpOnly cookies. The OpenAPI cookieAuth scheme tells
      // Swagger UI to send the cookies with each request automatically
      // (after a successful login in the same browser).
      customerCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'Customer JWT, set by POST /api/auth/login',
      },
      adminCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'adminAccessToken',
        description: 'Admin JWT, set by POST /api/auth/admin/login',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Not logged in or token expired',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
          },
        },
      },
      Forbidden: {
        description: 'Logged in but not allowed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied' } },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
          },
        },
      },
      ValidationError: {
        description: 'Request input failed validation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input',
                details: { field: 'email' },
              },
            },
          },
        },
      },
      RateLimited: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: { code: 'RATE_LIMITED', message: 'Slow down' } },
          },
        },
      },
    },
    schemas: {
      // ---- Common ----
      Money: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: {
            type: 'integer',
            description: 'Value in paisa (1 BDT = 100 paisa)',
            example: 150000,
          },
          currency: { type: 'string', enum: ['BDT'], example: 'BDT' },
        },
      },
      LocalizedString: {
        type: 'object',
        required: ['en'],
        properties: {
          en: { type: 'string', example: 'Linen Eid Borka' },
          bn: { type: 'string', example: 'লিনেন ঈদ বোরকা' },
        },
      },
      ISODate: { type: 'string', format: 'date-time', example: '2026-10-12T10:55:18.722Z' },
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'CONFLICT',
                  'UNPROCESSABLE',
                  'RATE_LIMITED',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 142 },
          totalPages: { type: 'integer', example: 8 },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      // ---- Catalog ----
      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', example: 'https://cdn.anzara.com/...jpg' },
          alt: { type: 'string' },
          position: { type: 'integer' },
        },
      },
      ProductVariant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sku: { type: 'string', example: 'ANZ-LIN-M' },
          size: { type: 'string', nullable: true, example: 'M' },
          color: { type: 'string', nullable: true, example: 'Beige' },
          price: { type: 'integer', description: 'paisa' },
          compareAtPrice: { type: 'integer', nullable: true, description: 'paisa' },
          stockQuantity: { type: 'integer' },
          lowStockThreshold: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'linen-eid-borka' },
          name: { $ref: '#/components/schemas/LocalizedString' },
          description: { $ref: '#/components/schemas/LocalizedString' },
          shortDescription: { $ref: '#/components/schemas/LocalizedString' },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          basePrice: { $ref: '#/components/schemas/Money' },
          compareAtPrice: { $ref: '#/components/schemas/Money', nullable: true },
          categoryId: { type: 'string' },
          collectionIds: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
          variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
          tags: { type: 'array', items: { type: 'string' } },
          hasVariants: { type: 'boolean' },
          totalStock: { type: 'integer' },
          isFeatured: { type: 'boolean' },
          createdAt: { $ref: '#/components/schemas/ISODate' },
          updatedAt: { $ref: '#/components/schemas/ISODate' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'abayas' },
          name: { $ref: '#/components/schemas/LocalizedString' },
          description: { $ref: '#/components/schemas/LocalizedString' },
          imageUrl: { type: 'string', nullable: true },
          position: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      Collection: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'summer-picks' },
          name: { $ref: '#/components/schemas/LocalizedString' },
          description: { $ref: '#/components/schemas/LocalizedString' },
          imageUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      // ---- Cart / orders / addresses ----
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          variantId: { type: 'string' },
          productId: { type: 'string' },
          productName: { $ref: '#/components/schemas/LocalizedString' },
          productSlug: { type: 'string' },
          imageUrl: { type: 'string', nullable: true },
          sku: { type: 'string' },
          size: { type: 'string', nullable: true },
          color: { type: 'string', nullable: true },
          unitPrice: { $ref: '#/components/schemas/Money' },
          quantity: { type: 'integer' },
          lineTotal: { $ref: '#/components/schemas/Money' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          subtotal: { $ref: '#/components/schemas/Money' },
          shipping: { $ref: '#/components/schemas/Money' },
          discount: { $ref: '#/components/schemas/Money' },
          total: { $ref: '#/components/schemas/Money' },
          appliedCoupon: {
            type: 'object',
            nullable: true,
            properties: {
              code: { type: 'string' },
              type: { type: 'string', enum: ['PERCENTAGE', 'FIXED'] },
              value: { type: 'integer' },
              discount: { $ref: '#/components/schemas/Money' },
            },
          },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string', example: 'Home' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string', nullable: true },
          city: { type: 'string' },
          district: { type: 'string' },
          division: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', example: 'BD' },
          isDefault: { type: 'boolean' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orderNumber: { type: 'string', example: 'ANZ-20261012-0042' },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'CONFIRMED',
              'PROCESSING',
              'SHIPPED',
              'DELIVERED',
              'CANCELLED',
              'FAILED',
              'RETURNED',
            ],
          },
          paymentMethod: { type: 'string', example: 'COD' },
          paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'REFUNDED', 'FAILED'] },
          subtotal: { $ref: '#/components/schemas/Money' },
          shipping: { $ref: '#/components/schemas/Money' },
          discount: { $ref: '#/components/schemas/Money' },
          total: { $ref: '#/components/schemas/Money' },
          address: { $ref: '#/components/schemas/Address' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                variantId: { type: 'string' },
                productName: { $ref: '#/components/schemas/LocalizedString' },
                sku: { type: 'string' },
                size: { type: 'string', nullable: true },
                color: { type: 'string', nullable: true },
                unitPrice: { $ref: '#/components/schemas/Money' },
                quantity: { type: 'integer' },
                lineTotal: { $ref: '#/components/schemas/Money' },
              },
            },
          },
          createdAt: { $ref: '#/components/schemas/ISODate' },
          updatedAt: { $ref: '#/components/schemas/ISODate' },
        },
      },
      // ---- Reviews ----
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          userId: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          title: { type: 'string' },
          comment: { type: 'string' },
          isVerified: { type: 'boolean' },
          isApproved: { type: 'boolean' },
          isFeatured: { type: 'boolean' },
          images: { type: 'array', items: { type: 'string' } },
          helpfulCount: { type: 'integer' },
          createdAt: { $ref: '#/components/schemas/ISODate' },
        },
      },
      ReviewSummary: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          count: { type: 'integer', example: 12 },
          average: { type: 'number', format: 'float', example: 4.5 },
          distribution: {
            type: 'object',
            description: 'Histogram: { "1": n, "2": n, ... }',
            example: { '1': 0, '2': 1, '3': 1, '4': 4, '5': 6 },
          },
        },
      },
      // ---- Content / settings ----
      Banner: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string', nullable: true },
          imageUrl: { type: 'string' },
          ctaText: { type: 'string', nullable: true },
          ctaLink: { type: 'string', nullable: true },
          position: { type: 'integer' },
          isActive: { type: 'boolean' },
          startsAt: { $ref: '#/components/schemas/ISODate', nullable: true },
          endsAt: { $ref: '#/components/schemas/ISODate', nullable: true },
        },
      },
      Page: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'about-us' },
          title: { $ref: '#/components/schemas/LocalizedString' },
          content: { $ref: '#/components/schemas/LocalizedString' },
          isPublished: { type: 'boolean' },
          publishedAt: { $ref: '#/components/schemas/ISODate', nullable: true },
        },
      },
      SiteSetting: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string', example: 'social.whatsapp' },
          value: { description: 'JSON value (string / number / object)' },
          isPublic: { type: 'boolean' },
          group: { type: 'string', example: 'social' },
          description: { type: 'string' },
        },
      },
      // ---- Coupons ----
      Coupon: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string', example: 'EID2026' },
          type: { type: 'string', enum: ['PERCENTAGE', 'FIXED'] },
          value: { type: 'integer', description: 'percent or paisa depending on type' },
          minOrderAmount: { $ref: '#/components/schemas/Money', nullable: true },
          maxUses: { type: 'integer', nullable: true },
          usedCount: { type: 'integer' },
          perCustomerLimit: { type: 'integer' },
          startsAt: { $ref: '#/components/schemas/ISODate', nullable: true },
          endsAt: { $ref: '#/components/schemas/ISODate', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      // ---- Auth ----
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      AuthAdminLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          totp: {
            type: 'string',
            description: 'Required only if the admin has 2FA enabled',
            example: '123456',
          },
        },
      },
      AuthRegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
        },
      },
      AuthLoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'Short-lived JWT in httpOnly cookie too',
              },
              refreshToken: {
                type: 'string',
                description: 'Long-lived JWT in httpOnly cookie too',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
              },
            },
          },
        },
      },
      // ---- Dashboard ----
      DashboardSummary: {
        type: 'object',
        properties: {
          ordersToday: { type: 'integer' },
          revenueLast30Days: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'paisa' },
              count: { type: 'integer' },
            },
          },
          pendingReviews: { type: 'integer' },
          lowStockCount: { type: 'integer' },
          lowStockItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                variantId: { type: 'string' },
                sku: { type: 'string' },
                stockQuantity: { type: 'integer' },
                lowStockThreshold: { type: 'integer' },
                product: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    name: { $ref: '#/components/schemas/LocalizedString' },
                  },
                },
              },
            },
          },
          recentOrders: {
            type: 'array',
            items: { $ref: '#/components/schemas/Order' },
          },
        },
      },
    },
  },
};
