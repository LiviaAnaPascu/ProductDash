import { NextResponse } from 'next/server';
import { brandConfigs } from '@/utils/brandConfigs';

export async function GET() {
  try {
    // For now, return mock data or fetch from configured brands
    // In production, you'd fetch from actual websites or a database
    const allProducts = [];

    // Fetch products from all configured brands
    for (const brandConfig of brandConfigs) {
      try {
        const products = await brandConfig.scraper(brandConfig.website);
        allProducts.push(...products);
      } catch (error) {
        console.error(`Error fetching products from ${brandConfig.name}:`, error);
      }
    }

    // If no products from scrapers, return mock data for demonstration
    if (allProducts.length === 0) {
      return NextResponse.json({
        products: [
          {
            id: '1',
            name: 'Sample Product 1',
            brand: 'Brand A',
            type: 'Electronics',
            price: '$99.99',
            imageUrl: 'https://via.placeholder.com/300x300?text=Product+1',
            description: 'This is a sample product description',
            url: 'https://example.com/product1',
          },
          {
            id: '2',
            name: 'Sample Product 2',
            brand: 'Brand B',
            type: 'Clothing',
            price: '$49.99',
            imageUrl: 'https://via.placeholder.com/300x300?text=Product+2',
            description: 'Another sample product',
            url: 'https://example.com/product2',
          },
          {
            id: '3',
            name: 'Sample Product 3',
            brand: 'Brand A',
            type: 'Accessories',
            price: '$29.99',
            imageUrl: 'https://via.placeholder.com/300x300?text=Product+3',
            description: 'Yet another sample product',
            url: 'https://example.com/product3',
          },
        ],
      });
    }

    return NextResponse.json({ products: allProducts });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

