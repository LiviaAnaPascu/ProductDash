// Database seed file - all operations commented out
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

async function main() {
  console.log('Database seeding is disabled. Uncomment database code to enable.');
  return;
  /*
  // Create sample brands
  const brand1 = await prisma.brand.upsert({
    where: { name: 'Morellato' },
    update: {
      website: 'https://www.morellato.com/catalogo-prodotti-A1.htm',
      baseUrl: 'https://www.morellato.com',
    },
    create: {
      name: 'Morellato',
      website: 'https://www.morellato.com/catalogo-prodotti-A1.htm',
      baseUrl: 'https://www.morellato.com',
      isActive: true,
    },
  });

  const brand2 = await prisma.brand.upsert({
    where: { name: 'Example Brand' },
    update: {},
    create: {
      name: 'Example Brand',
      website: 'https://example.com/products',
      baseUrl: 'https://example.com',
      isActive: true,
    },
  });

  // Create sample products
  await prisma.product.upsert({
    where: {
      brandId_url: {
        brandId: brand1.id,
        url: 'https://example.com/product1',
      },
    },
    update: {},
    create: {
      name: 'Sample Product 1',
      brandId: brand1.id,
      type: 'Electronics',
      price: '$99.99',
      imageUrl: 'https://via.placeholder.com/300x300?text=Product+1',
      description: 'This is a sample product description',
      url: 'https://example.com/product1',
    },
  });

  await prisma.product.upsert({
    where: {
      brandId_url: {
        brandId: brand2.id,
        url: 'https://example.com/product2',
      },
    },
    update: {},
    create: {
      name: 'Sample Product 2',
      brandId: brand2.id,
      type: 'Clothing',
      price: '$49.99',
      imageUrl: 'https://via.placeholder.com/300x300?text=Product+2',
      description: 'Another sample product',
      url: 'https://example.com/product2',
    },
  });

  console.log('Seed data created successfully');
}

  */
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Database operations commented out
    // await prisma.$disconnect();
  });

