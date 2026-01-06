// Database imports commented out
// import { prisma } from '@/lib/prisma';
import { startScrapingJob } from '@/services/scraperService';
import { brandStore, Brand } from '@/lib/brandStore';
import { productStore } from '@/lib/productStore';

export const resolvers = {
  Query: {
    products: async (_: any, { filters }: { filters?: any }) => {
      const {
        search,
        brandId,
        type,
        page = 1,
        pageSize = 20,
      } = filters || {};

      console.log('[GraphQL] Products query called with filters:', { search, brandId, type, page, pageSize });
      
      // Debug: Check store state
      const totalProductCount = productStore.getProductCount();
      console.log('[GraphQL] Total products in store:', totalProductCount);
      
      if (brandId) {
        const brandProductCount = productStore.getProductCount(brandId);
        console.log(`[GraphQL] Products for brand ${brandId}:`, brandProductCount);
      }

      // Use in-memory product store
      const { products: storedProducts, totalCount } = productStore.getAllProducts({
        brandId,
        type,
        search,
        page,
        pageSize,
      });

      console.log('[GraphQL] Found products:', storedProducts.length, 'out of', totalCount);

      // Map to GraphQL format with brand information
      const products = storedProducts.map((p) => {
        const brand = brandStore.getBrand(p.brandId);
        return {
          id: p.id,
          name: p.name,
          brand: brand ? {
            id: brand.id,
            name: brand.name,
          } : null,
          type: p.type,
          price: p.price,
          imageUrl: p.imageUrl,
          description: p.description,
          url: p.url,
          metadata: p.metadata,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      });

      return {
        products,
        totalCount,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + products.length < totalCount,
      };
    },

    product: async (_: any, { id }: { id: string }) => {
      // Use in-memory product store
      const storedProduct = productStore.getProduct(id);
      if (!storedProduct) return null;

      const brand = brandStore.getBrand(storedProduct.brandId);
      return {
        id: storedProduct.id,
        name: storedProduct.name,
        brand: brand ? {
          id: brand.id,
          name: brand.name,
        } : null,
        type: storedProduct.type,
        price: storedProduct.price,
        imageUrl: storedProduct.imageUrl,
        description: storedProduct.description,
        url: storedProduct.url,
        metadata: storedProduct.metadata,
        createdAt: storedProduct.createdAt.toISOString(),
        updatedAt: storedProduct.updatedAt.toISOString(),
      };
    },

    brands: async () => {
      // Use in-memory brand store
      return brandStore.getAllBrands();
    },

    brand: async (_: any, { id }: { id: string }) => {
      // Use in-memory brand store
      return brandStore.getBrand(id) || null;
    },

    scraperJobs: async (_: any, { brandId }: { brandId?: string }) => {
      // Database operations commented out
      // const where = brandId ? { brandId } : {};
      // return prisma.scraperJob.findMany({
      //   where,
      //   include: { brand: true },
      //   orderBy: { createdAt: 'desc' },
      // });
      return [];
    },

    scraperJob: async (_: any, { id }: { id: string }) => {
      // Database operations commented out
      // return prisma.scraperJob.findUnique({
      //   where: { id },
      //   include: { brand: true },
      // });
      return null;
    },

    debugStore: async () => {
      // Debug endpoint to check store state
      const brands = brandStore.getAllBrands();
      const totalProducts = productStore.getProductCount();
      
      const productsByBrand = brands.map(brand => ({
        brandId: brand.id,
        brandName: brand.name,
        productCount: productStore.getProductCount(brand.id),
      }));

      console.log('[Debug] Store state:', {
        totalProducts,
        totalBrands: brands.length,
        productsByBrand,
      });

      return {
        totalProducts,
        totalBrands: brands.length,
        productsByBrand,
      };
    },
  },

  Mutation: {
    createBrand: async (_: any, { input }: { input: any }) => {
      // Use in-memory brand store
      return brandStore.addBrand({
        name: input.name,
        website: input.website,
        baseUrl: input.baseUrl || null,
        isActive: true,
      });
    },

    updateBrand: async (_: any, { id, input }: { id: string; input: any }) => {
      // Use in-memory brand store
      const updated = brandStore.updateBrand(id, {
        name: input.name,
        website: input.website,
        baseUrl: input.baseUrl || null,
      });
      if (!updated) {
        throw new Error('Brand not found');
      }
      return updated;
    },

    deleteBrand: async (_: any, { id }: { id: string }) => {
      // Use in-memory brand store
      return brandStore.deleteBrand(id);
    },

    startScraping: async (_: any, { input }: { input: { brandId: string } }) => {
      // Use in-memory brand store
      const brand = brandStore.getBrand(input.brandId);
      
      if (!brand) {
        throw new Error('Brand not found');
      }

      // Create mock scraper job (without database)
      const job = {
        id: `job-${Date.now()}`,
        brandId: input.brandId,
        status: 'pending',
        brand,
        currentPage: 0,
        productsFound: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Start scraping asynchronously
      startScrapingJob(job.id, brand).catch((error) => {
        console.error('Scraping job failed:', error);
      });

      return job;
    },

    cancelScraping: async (_: any, { jobId }: { jobId: string }) => {
      // Database operations commented out
      // await prisma.scraperJob.update({
      //   where: { id: jobId },
      //   data: { status: 'cancelled' },
      // });
      return true;
    },
  },

  Brand: {
    productCount: async (parent: any) => {
      if (parent.productCount !== undefined) {
        return parent.productCount;
      }
      // Use in-memory product store
      return productStore.getProductCount(parent.id);
    },
  },
  
  // JSON scalar resolver - Apollo Server v4 handles this automatically
  // But we define it explicitly to avoid errors
  JSON: {
    serialize: (value: any) => {
      if (value === null || value === undefined) {
        return null;
      }
      return value;
    },
    parseValue: (value: any) => {
      return value;
    },
    parseLiteral: (ast: any) => {
      if (ast.kind === 'StringValue') {
        try {
          return JSON.parse(ast.value);
        } catch {
          return ast.value;
        }
      }
      return null;
    },
  },
};

