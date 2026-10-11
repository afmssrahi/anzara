/**
 * Database seed.
 * Run with: pnpm db:seed
 *
 * Creates:
 * - All admin permissions
 * - System roles (Super Admin, Admin, limited roles)
 * - A default SUPER_ADMIN user (password from env or "ChangeMe123!")
 * - Default site settings (theme, currency)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Bcrypt hash. Must match the algorithm used by the auth service.
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const PERMISSIONS = [
  { key: 'product:view', description: 'View products' },
  { key: 'product:create', description: 'Create products' },
  { key: 'product:update', description: 'Update products' },
  { key: 'product:delete', description: 'Delete products' },
  { key: 'order:view', description: 'View orders' },
  { key: 'order:update', description: 'Update orders' },
  { key: 'order:cancel', description: 'Cancel orders' },
  { key: 'order:refund', description: 'Process refunds' },
  { key: 'customer:view', description: 'View customers' },
  { key: 'customer:update', description: 'Update customers' },
  { key: 'inventory:view', description: 'View inventory' },
  { key: 'inventory:update', description: 'Update inventory' },
  { key: 'coupon:view', description: 'View coupons' },
  { key: 'coupon:manage', description: 'Manage coupons' },
  { key: 'review:moderate', description: 'Moderate reviews' },
  { key: 'cms:manage', description: 'Manage website content' },
  { key: 'settings:view', description: 'View settings' },
  { key: 'settings:update', description: 'Update settings' },
  { key: 'integration:manage', description: 'Manage integrations' },
  { key: 'admin:user:manage', description: 'Manage admin users' },
  { key: 'report:view', description: 'View reports' },
];

async function main() {
  console.log('Starting seed...');

  // 1. Create all permissions
  console.log('Creating permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.adminPermission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    });
  }

  // 2. Create system roles
  console.log('Creating roles...');

  const allPermissions = await prisma.adminPermission.findMany();

  // Super Admin - all permissions
  const superAdmin = await prisma.adminRole.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Full system access',
      isSystem: true,
    },
  });

  // Connect all permissions to super admin
  for (const perm of allPermissions) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: perm.id },
    });
  }

  // Admin - almost all but no user management
  const admin = await prisma.adminRole.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Full operational access',
      isSystem: true,
    },
  });

  for (const perm of allPermissions.filter((p) => p.key !== 'admin:user:manage')) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: admin.id, permissionId: perm.id },
    });
  }

  // Product Manager
  const productManager = await prisma.adminRole.upsert({
    where: { name: 'PRODUCT_MANAGER' },
    update: {},
    create: {
      name: 'PRODUCT_MANAGER',
      description: 'Manage products and inventory',
      isSystem: true,
    },
  });

  const productManagerPerms = allPermissions.filter((p) =>
    [
      'product:view',
      'product:create',
      'product:update',
      'product:delete',
      'inventory:view',
      'inventory:update',
      'review:moderate',
      'coupon:view',
      'coupon:manage',
      'report:view',
    ].includes(p.key),
  );
  for (const perm of productManagerPerms) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: productManager.id, permissionId: perm.id } },
      update: {},
      create: { roleId: productManager.id, permissionId: perm.id },
    });
  }

  // Order Manager
  const orderManager = await prisma.adminRole.upsert({
    where: { name: 'ORDER_MANAGER' },
    update: {},
    create: {
      name: 'ORDER_MANAGER',
      description: 'Manage orders and shipments',
      isSystem: true,
    },
  });

  const orderManagerPerms = allPermissions.filter((p) =>
    [
      'order:view',
      'order:update',
      'order:cancel',
      'order:refund',
      'customer:view',
      'inventory:view',
      'report:view',
    ].includes(p.key),
  );
  for (const perm of orderManagerPerms) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: orderManager.id, permissionId: perm.id } },
      update: {},
      create: { roleId: orderManager.id, permissionId: perm.id },
    });
  }

  // 3. Create default SUPER_ADMIN user
  console.log('Creating super admin...');
  const defaultEmail = 'admin@anzara.com';
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'AnzaraAdmin@2026';

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: defaultEmail },
  });

  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: defaultEmail,
        passwordHash: await hashPassword(defaultPassword),
        firstName: 'Super',
        lastName: 'Admin',
        roleId: superAdmin.id,
        isActive: true,
        twoFactorEnabled: false,
      },
    });
    console.log(`\n  Created SUPER_ADMIN: ${defaultEmail}`);
    console.log(`  Password: ${defaultPassword}`);
    console.log('  CHANGE THIS PASSWORD AFTER FIRST LOGIN!\n');
  } else {
    console.log(`  SUPER_ADMIN already exists: ${defaultEmail}`);
  }

  // 4. Default site settings
  console.log('Creating default settings...');
  const defaultSettings = [
    { key: 'brand.name', value: 'Anzara', group: 'general' },
    { key: 'brand.tagline', value: 'Timeless Elegance', group: 'general' },
    { key: 'brand.primaryColor', value: '#0F4C5C', group: 'theme' },
    { key: 'brand.accentColor', value: '#E36414', group: 'theme' },
    { key: 'brand.logo', value: null, group: 'theme' },
    { key: 'brand.favicon', value: null, group: 'theme' },
    { key: 'contact.email', value: 'hello@anzara.com', group: 'general' },
    { key: 'contact.phone', value: '+8801700000000', group: 'general' },
    { key: 'contact.address', value: 'Dhaka, Bangladesh', group: 'general' },
    { key: 'social.facebook', value: '', group: 'social' },
    { key: 'social.instagram', value: '', group: 'social' },
    { key: 'social.whatsapp', value: '', group: 'social' },
    { key: 'seo.defaultTitle', value: 'Anzara - Premium Modest Fashion', group: 'seo' },
    {
      key: 'seo.defaultDescription',
      value: 'Discover premium modest fashion at Anzara.',
      group: 'seo',
    },
    { key: 'currency.code', value: 'BDT', group: 'general' },
    { key: 'currency.symbol', value: '৳', group: 'general' },
    { key: 'payment.cod.enabled', value: true, group: 'payment' },
    { key: 'payment.cod.minOrderAmount', value: 0, group: 'payment' },
    { key: 'payment.sslcommerz.enabled', value: false, group: 'payment' },
    { key: 'shipping.freeShippingThreshold', value: 500000, group: 'shipping' }, // ৳5000
    { key: 'shipping.defaultInsideDhaka', value: 6000, group: 'shipping' }, // ৳60
    { key: 'shipping.defaultOutsideDhaka', value: 12000, group: 'shipping' }, // ৳120
    { key: 'tax.enabled', value: false, group: 'tax' },
    { key: 'tax.rate', value: 0, group: 'tax' },
  ];

  for (const setting of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        group: setting.group,
        isPublic: ['brand', 'seo', 'social', 'currency'].includes(setting.group),
      },
    });
  }

  // 5. Default categories
  console.log('Creating default categories...');
  const defaultCategories = [
    { slug: 'abayas', name: { en: 'Abayas', bn: 'আবায়া' } },
    { slug: 'hijabs', name: { en: 'Hijabs', bn: 'হিজাব' } },
    { slug: 'borkas', name: { en: 'Borkas', bn: 'বোরকা' } },
    { slug: 'tops', name: { en: 'Tops & Kurti', bn: 'টপস ও কুর্তি' } },
    { slug: 'dresses', name: { en: 'Dresses', bn: 'ড্রেস' } },
    { slug: 'accessories', name: { en: 'Accessories', bn: 'এক্সেসরিজ' } },
  ];

  for (let i = 0; i < defaultCategories.length; i++) {
    const cat = defaultCategories[i];
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        name: cat.name,
        position: i,
        isActive: true,
      },
    });
  }

  // 6. Default collections
  console.log('Creating default collections...');
  const defaultCollections = [
    { slug: 'new-arrivals', name: { en: 'New Arrivals', bn: 'নতুন আগমন' } },
    { slug: 'eid-collection', name: { en: 'Eid Collection', bn: 'ঈদ কালেকশন' } },
    { slug: 'festive', name: { en: 'Festive Special', bn: 'উৎসব বিশেষ' } },
    { slug: 'trending', name: { en: 'Trending', bn: 'ট্রেন্ডিং' } },
  ];

  for (let i = 0; i < defaultCollections.length; i++) {
    const col = defaultCollections[i];
    await prisma.collection.upsert({
      where: { slug: col.slug },
      update: {},
      create: {
        slug: col.slug,
        name: col.name,
        position: i,
        isActive: true,
      },
    });
  }

  // 7. Sample products so the storefront is browseable end-to-end.
  // Images use stable picsum.photos URLs (deterministic by seed) so the
  // storefront has something to render without uploading real photos.
  console.log('Creating sample products...');
  const categoriesBySlug = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id] as const),
  );
  const collectionsBySlug = new Map(
    (await prisma.collection.findMany()).map((c) => [c.slug, c.id] as const),
  );

  interface SeedVariant {
    sku: string;
    size: string;
    color?: string;
    price: number; // paisa
    compareAtPrice?: number; // paisa
    stock: number;
  }
  interface SeedImage {
    url: string;
    alt: string;
  }
  interface SeedProduct {
    slug: string;
    name: { en: string; bn: string };
    shortDescription: { en: string; bn: string };
    description: { en: string; bn: string };
    basePrice: number; // paisa
    category: string;
    collections?: string[];
    tags: string[];
    isFeatured?: boolean;
    hasVariants: boolean;
    variants: SeedVariant[];
    images: SeedImage[];
  }

  const products: SeedProduct[] = [
    {
      slug: 'classic-black-abaya',
      name: { en: 'Classic Black Abaya', bn: 'ক্লাসিক কালো আবায়া' },
      shortDescription: {
        en: 'A timeless black abaya with elegant flow and modest cut.',
        bn: 'মার্জিত ফ্লো ও ঐতিহ্যবাহী কাটের সাথে কালজয়ী কালো আবায়া।',
      },
      description: {
        en: 'Crafted from premium Nida fabric, this classic black abaya features a flowing silhouette that drapes beautifully. Perfect for daily wear and special occasions.',
        bn: 'প্রিমিয়াম নিদা কাপড় থেকে তৈরি এই ক্লাসিক কালো আবায়ার ফ্লোিং সিলুয়েট দারুণভাবে ঝুলে পড়ে। দৈনন্দিন ব্যবহার এবং বিশেষ অনুষ্ঠানের জন্য নিখুঁত।',
      },
      basePrice: 350000, // ৳3500
      category: 'abayas',
      collections: ['new-arrivals', 'trending'],
      tags: ['bestseller', 'everyday', 'nida'],
      isFeatured: true,
      hasVariants: true,
      variants: [
        { sku: 'ANZ-ABY-001-S', size: 'S', price: 350000, stock: 12 },
        { sku: 'ANZ-ABY-001-M', size: 'M', price: 350000, stock: 18 },
        { sku: 'ANZ-ABY-001-L', size: 'L', price: 350000, stock: 10 },
        { sku: 'ANZ-ABY-001-XL', size: 'XL', price: 350000, stock: 6 },
      ],
      images: [
        {
          url: 'https://picsum.photos/seed/anzara-abaya-1a/800/1000',
          alt: 'Classic Black Abaya front',
        },
        {
          url: 'https://picsum.photos/seed/anzara-abaya-1b/800/1000',
          alt: 'Classic Black Abaya detail',
        },
      ],
    },
    {
      slug: 'emerald-green-hijab',
      name: { en: 'Emerald Green Hijab', bn: 'পান্না সবুজ হিজাব' },
      shortDescription: {
        en: 'Soft, breathable hijab in a rich emerald green.',
        bn: 'অমৃত সবুজে নরম, শ্বাস-প্রশ্বাসযোগ্য হিজাব।',
      },
      description: {
        en: 'A premium modal-blend hijab with a soft, non-slip drape. Stays in place all day without pins.',
        bn: 'প্রিমিয়াম মোডাল-ব্লেন্ড হিজাব যা নরম ও নন-স্লিপ ড্রেপ দেয়। পিন ছাড়াই সারাদিন জায়গায় থাকে।',
      },
      basePrice: 85000, // ৳850
      category: 'hijabs',
      collections: ['new-arrivals'],
      tags: ['hijab', 'modal', 'everyday'],
      isFeatured: true,
      hasVariants: true,
      variants: [
        { sku: 'ANZ-HJB-001-OS', size: 'OS', color: 'Emerald', price: 85000, stock: 30 },
        { sku: 'ANZ-HJB-001-OS-BG', size: 'OS', color: 'Beige', price: 85000, stock: 25 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-hijab-1a/800/1000', alt: 'Emerald Green Hijab' },
      ],
    },
    {
      slug: 'linen-eid-borka',
      name: { en: 'Linen Eid Borka', bn: 'লিনেন ঈদ বোরকা' },
      shortDescription: {
        en: 'Festive linen borka for Eid with delicate embroidery.',
        bn: 'সূক্ষ্ম সূচিশিল্প সহ ঈদের জন্য উৎসবময় লিনেন বোরকা।',
      },
      description: {
        en: 'A breathable linen borka with hand-finished embroidery along the sleeves. Made for the warmth and joy of Eid.',
        bn: 'হাতের কাজ করা সূচিশিল্প সহ শ্বাস-প্রশ্বাসযোগ্য লিনেন বোরকা। ঈদের উষ্ণতা ও আনন্দের জন্য তৈরি।',
      },
      basePrice: 480000, // ৳4800
      compareAtPrice: 550000, // ৳5500
      category: 'borkas',
      collections: ['eid-collection', 'festive'],
      tags: ['eid', 'linen', 'embroidered'],
      isFeatured: true,
      hasVariants: true,
      variants: [
        { sku: 'ANZ-BRK-001-S', size: 'S', price: 480000, stock: 5 },
        { sku: 'ANZ-BRK-001-M', size: 'M', price: 480000, stock: 8 },
        { sku: 'ANZ-BRK-001-L', size: 'L', price: 480000, stock: 4 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-borka-1a/800/1000', alt: 'Linen Eid Borka' },
        {
          url: 'https://picsum.photos/seed/anzara-borka-1b/800/1000',
          alt: 'Linen Eid Borka detail',
        },
      ],
    },
    {
      slug: 'everyday-kurti-beige',
      name: { en: 'Everyday Beige Kurti', bn: 'দৈনন্দিন বেইজ কুর্তি' },
      shortDescription: {
        en: 'Versatile beige kurti in breathable cotton.',
        bn: 'শ্বাস-প্রশ্বাসযোগ্য সুতির বহুমুখী বেইজ কুর্তি।',
      },
      description: {
        en: 'A simple, elegant kurti in soft cotton. Goes with anything in your wardrobe.',
        bn: 'নরম সুতির সাধারণ, মার্জিত কুর্তি। আপনার ওয়ার্ডরোবের যেকোনো কিছুর সাথে মানানসই।',
      },
      basePrice: 180000, // ৳1800
      category: 'tops',
      collections: ['trending'],
      tags: ['cotton', 'kurti', 'everyday'],
      hasVariants: true,
      variants: [
        { sku: 'ANZ-TOP-001-S', size: 'S', price: 180000, stock: 20 },
        { sku: 'ANZ-TOP-001-M', size: 'M', price: 180000, stock: 22 },
        { sku: 'ANZ-TOP-001-L', size: 'L', price: 180000, stock: 18 },
        { sku: 'ANZ-TOP-001-XL', size: 'XL', price: 180000, stock: 10 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-kurti-1a/800/1000', alt: 'Beige Everyday Kurti' },
      ],
    },
    {
      slug: 'floral-festive-dress',
      name: { en: 'Floral Festive Dress', bn: 'ফুলের উৎসবের ড্রেস' },
      shortDescription: {
        en: 'A floral printed dress with a flowing hem.',
        bn: 'ফ্লোিং হেম সহ ফুলের প্রিন্টেড ড্রেস।',
      },
      description: {
        en: 'Light, joyful, and perfect for daytime events. Soft crepe fabric with a subtle floral print.',
        bn: 'হালকা, আনন্দদায়ক এবং দিনের অনুষ্ঠানের জন্য নিখুঁত। সূক্ষ্ম ফুলের প্রিন্ট সহ নরম ক্রেপ কাপড়।',
      },
      basePrice: 320000, // ৳3200
      category: 'dresses',
      collections: ['festive', 'new-arrivals'],
      tags: ['dress', 'floral', 'crepe'],
      isFeatured: true,
      hasVariants: true,
      variants: [
        { sku: 'ANZ-DRS-001-S', size: 'S', price: 320000, stock: 7 },
        { sku: 'ANZ-DRS-001-M', size: 'M', price: 320000, stock: 9 },
        { sku: 'ANZ-DRS-001-L', size: 'L', price: 320000, stock: 5 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-dress-1a/800/1000', alt: 'Floral Festive Dress' },
        {
          url: 'https://picsum.photos/seed/anzara-dress-1b/800/1000',
          alt: 'Floral Festive Dress detail',
        },
      ],
    },
    {
      slug: 'pearl-hijab-pins-set',
      name: { en: 'Pearl Hijab Pin Set (6)', bn: 'মুক্তার হিজাব পিন সেট (৬ টি)' },
      shortDescription: {
        en: 'A 6-piece set of pearl-finished hijab pins.',
        bn: '৬ পিস মুক্তা-ফিনিশ হিজাব পিন সেট।',
      },
      description: {
        en: 'Elegant, understated pins that hold without damaging fabric. Comes in a soft pouch.',
        bn: 'কাপড় নষ্ট না করে ধরে রাখে এমন মার্জিত, সাদামাটা পিন। নরম পাউচে আসে।',
      },
      basePrice: 45000, // ৳450
      category: 'accessories',
      tags: ['pins', 'accessory', 'pearl'],
      hasVariants: false,
      variants: [{ sku: 'ANZ-ACC-001-OS', size: 'OS', price: 45000, stock: 50 }],
      images: [
        { url: 'https://picsum.photos/seed/anzara-pins-1a/800/1000', alt: 'Pearl Hijab Pin Set' },
      ],
    },
    {
      slug: 'midnight-abaya-navy',
      name: { en: 'Midnight Navy Abaya', bn: 'মধ্যরাতের নেভি আবায়া' },
      shortDescription: {
        en: 'A deep navy abaya with subtle silver detailing.',
        bn: 'সূক্ষ্ম রূপালী ডিটেইলিং সহ গভীর নেভি আবায়া।',
      },
      description: {
        en: 'A flowing navy abaya with silver-thread embroidery along the cuffs. A sophisticated alternative to black.',
        bn: 'কাফের ধরে রূপালী সুতা দিয়ে সূচিশিল্প সহ ফ্লোিং নেভি আবায়া। কালোর একটি পরিশীলিত বিকল্প।',
      },
      basePrice: 420000, // ৳4200
      category: 'abayas',
      collections: ['trending', 'festive'],
      tags: ['navy', 'abaya', 'embroidered'],
      hasVariants: true,
      variants: [
        { sku: 'ANZ-ABY-002-S', size: 'S', price: 420000, stock: 6 },
        { sku: 'ANZ-ABY-002-M', size: 'M', price: 420000, stock: 9 },
        { sku: 'ANZ-ABY-002-L', size: 'L', price: 420000, stock: 4 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-abaya-2a/800/1000', alt: 'Midnight Navy Abaya' },
      ],
    },
    {
      slug: 'pleated-eid-hijab-set',
      name: { en: 'Pleated Eid Hijab Set', bn: 'প্লিটেড ঈদ হিজাব সেট' },
      shortDescription: {
        en: 'A 3-piece pleated hijab set in festive gold.',
        bn: 'উৎসবময় সোনালিতে ৩-পিসের প্লিটেড হিজাব সেট।',
      },
      description: {
        en: 'Includes an under-scarf, the pleated outer hijab, and a brooch. Perfect for Eid mornings.',
        bn: 'আন্ডার-স্কার্ফ, প্লিটেড বাইরের হিজাব এবং একটি ব্রোচ অন্তর্ভুক্ত। ঈদের সকালের জন্য নিখুঁত।',
      },
      basePrice: 180000, // ৳1800
      category: 'hijabs',
      collections: ['eid-collection'],
      tags: ['eid', 'hijab', 'set'],
      hasVariants: true,
      variants: [
        { sku: 'ANZ-HJB-002-OS-GLD', size: 'OS', color: 'Gold', price: 180000, stock: 12 },
        { sku: 'ANZ-HJB-002-OS-ROSE', size: 'OS', color: 'Rose', price: 180000, stock: 8 },
      ],
      images: [
        {
          url: 'https://picsum.photos/seed/anzara-hijab-2a/800/1000',
          alt: 'Pleated Eid Hijab Set',
        },
      ],
    },
    {
      slug: 'cotton-printed-kurti-mint',
      name: { en: 'Cotton Printed Kurti - Mint', bn: 'সুতির প্রিন্টেড কুর্তি - পুদিনা' },
      shortDescription: {
        en: 'A breathable mint kurti with delicate block print.',
        bn: 'সূক্ষ্ম ব্লক প্রিন্ট সহ শ্বাস-প্রশ্বাসযোগ্য পুদিনা কুর্তি।',
      },
      description: {
        en: 'Block-printed by hand in soft cotton. Pair with white pants for a fresh, summery look.',
        bn: 'নরম সুতিতে হাতে ব্লক-প্রিন্টেড। সাদা প্যান্টের সাথে জোড়া দিয়ে একটি তাজা, গ্রীষ্মকালীন চেহারা তৈরি করুন।',
      },
      basePrice: 220000, // ৳2200
      category: 'tops',
      tags: ['cotton', 'kurti', 'mint', 'block-print'],
      hasVariants: true,
      variants: [
        { sku: 'ANZ-TOP-002-S', size: 'S', price: 220000, stock: 14 },
        { sku: 'ANZ-TOP-002-M', size: 'M', price: 220000, stock: 18 },
        { sku: 'ANZ-TOP-002-L', size: 'L', price: 220000, stock: 11 },
      ],
      images: [
        { url: 'https://picsum.photos/seed/anzara-kurti-2a/800/1000', alt: 'Mint Cotton Kurti' },
      ],
    },
    {
      slug: 'rose-butterfly-accessory',
      name: { en: 'Rose Butterfly Brooch', bn: 'গোলাপী প্রজাপতি ব্রোচ' },
      shortDescription: {
        en: 'A delicate rose-gold brooch with a butterfly motif.',
        bn: 'প্রজাপতির নকশা সহ সূক্ষ্ম রোজ-গোল্ড ব্রোচ।',
      },
      description: {
        en: 'A timeless accessory that complements any hijab, abaya, or kurti.',
        bn: 'যেকোনো হিজাব, আবায়া বা কুর্তির সাথে মানানসই কালজয়ী এক্সেসরি।',
      },
      basePrice: 65000, // ৳650
      category: 'accessories',
      tags: ['brooch', 'accessory', 'rose-gold'],
      hasVariants: false,
      variants: [{ sku: 'ANZ-ACC-002-OS', size: 'OS', price: 65000, stock: 40 }],
      images: [
        {
          url: 'https://picsum.photos/seed/anzara-brooch-1a/800/1000',
          alt: 'Rose Butterfly Brooch',
        },
      ],
    },
  ];

  for (const product of products) {
    const categoryId = categoriesBySlug.get(product.category);
    if (!categoryId) {
      console.warn(`  Skipping ${product.slug}: category not found: ${product.category}`);
      continue;
    }
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        basePrice: product.basePrice,
        status: 'PUBLISHED',
        categoryId,
        hasVariants: product.hasVariants,
        isFeatured: product.isFeatured ?? false,
        tags: product.tags,
      },
    });
    const created = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (!created) continue;
    // Variants
    for (const [i, v] of product.variants.entries()) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: created.id,
          sku: v.sku,
          size: v.size,
          color: v.color ?? null,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stockQuantity: v.stock,
          lowStockThreshold: 5,
          isActive: true,
          position: i,
        },
      });
    }
    // Images
    for (const [i, img] of product.images.entries()) {
      await prisma.productImage.upsert({
        where: { id: `seed-${product.slug}-${i}` },
        update: {},
        create: {
          id: `seed-${product.slug}-${i}`,
          productId: created.id,
          url: img.url,
          alt: img.alt,
          position: i,
        },
      });
    }
    // Collection links
    for (const colSlug of product.collections ?? []) {
      const colId = collectionsBySlug.get(colSlug);
      if (!colId) continue;
      await prisma.collectionProduct.upsert({
        where: {
          collectionId_productId: { collectionId: colId, productId: created.id },
        },
        update: {},
        create: { collectionId: colId, productId: created.id, position: 0 },
      });
    }
  }

  console.log(`\nSeed completed successfully (${products.length} products)!`);
  console.log('\nNext steps:');
  console.log('  1. Login to admin with the credentials above');
  console.log('  2. Go to Settings > Theme to customize brand colors');
  console.log('  3. Browse the storefront at /products');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
