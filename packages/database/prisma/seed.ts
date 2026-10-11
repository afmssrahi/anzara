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

  console.log('\nSeed completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Login to admin with the credentials above');
  console.log('  2. Go to Settings > Theme to customize brand colors');
  console.log('  3. Add your first product');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
