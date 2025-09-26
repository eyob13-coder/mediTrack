import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create a Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Default Tenant',
      defaultLanguage: 'en',
      plan: 'FREE',
      subscriptionStatus: 'ACTIVE',
    },
  });
  console.log(`Created tenant with id: ${tenant.id}`);

  // 2. Create an Admin/Pharmacist User
  const hashedPassword = await bcrypt.hash('password123', 10); // Hash a default password
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      language: 'en',
    },
  });
  console.log(`Created admin user with id: ${user.id}`);

  // 3. Create a Pharmacy associated with the Tenant
  const pharmacy = await prisma.pharmacy.create({
    data: {
      tenantId: tenant.id,
      name: 'Central Pharmacy',
      address: '123 Main St, Anytown',
      phone: '555-1234',
      licenseNumber: 'LIC-PHARM-001',
      isEmergencyService: true,
      latitude: 34.0522,
      longitude: -118.2437,
      verified: true,
      isActive: true,
    },
  });
  console.log(`Created pharmacy with id: ${pharmacy.id}`);

  // 4. Create Inventory items for the Pharmacy
  const inventoryItem1 = await prisma.inventory.create({
    data: {
      pharmacyId: pharmacy.id,
      tenantId: tenant.id,
      sku: 'PR001',
      name: 'Pain Reliever 200mg',
      description: 'Fast-acting pain relief.',
      category: 'Over-the-counter',
      quantity: 100,
      price: 5.99,
      cost: 2.50,
      isAvailable: true,
      requiresPrescription: false,
    },
  });
  console.log(`Created inventory item 1 with id: ${inventoryItem1.id}`);

  const inventoryItem2 = await prisma.inventory.create({
    data: {
      pharmacyId: pharmacy.id,
      tenantId: tenant.id,
      sku: 'AB001',
      name: 'Antibiotic X 100mg',
      description: 'Prescription antibiotic.',
      category: 'Prescription',
      quantity: 50,
      price: 12.50,
      cost: 6.00,
      isAvailable: true,
      requiresPrescription: true,
    },
  });
  console.log(`Created inventory item 2 with id: ${inventoryItem2.id}`);

  const inventoryItem3 = await prisma.inventory.create({
    data: {
      pharmacyId: pharmacy.id,
      tenantId: tenant.id,
      sku: 'VIT001',
      name: 'Multivitamin',
      description: 'Daily essential vitamins.',
      category: 'Supplements',
      quantity: 200,
      price: 8.00,
      cost: 3.50,
      isAvailable: true,
      requiresPrescription: false,
    },
  });
  console.log(`Created inventory item 3 with id: ${inventoryItem3.id}`);

  console.log('Seeding finished.');
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
