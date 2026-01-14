// Database imports commented out
// import { prisma } from '@/lib/prisma';
import { brandStore, Brand } from '@/lib/brandStore';
import { productStore } from '@/lib/productStore';
import { 
  scrapeBrandQueue, 
  scrapeProductDetailsQueue, 
  exportCSVQueue,
  JobType,
  ScrapeBrandJobData,
  ScrapeProductDetailsJobData,
  ExportCSVJobData,
} from '@/lib/queue';
import { jobStore } from '@/lib/jobStore';

export const resolvers = {
  Query: {
    products: async (_: any, { filters }: { filters?: any }) => {
      const {
        search,
        brandId,
        type,
        gender,
        page = 1,
        pageSize = 20,
      } = filters || {};

      console.log('[GraphQL] Products query called with filters:', { search, brandId, type, gender, page, pageSize });
      
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
        gender,
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
          gender: p.gender,
          price: p.price,
          imageUrl: p.imageUrl,
          description: p.description,
          url: p.url,
          metadata: p.metadata,
          details: p.details || null,
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
        gender: storedProduct.gender,
        price: storedProduct.price,
        imageUrl: storedProduct.imageUrl,
        description: storedProduct.description,
        url: storedProduct.url,
        metadata: storedProduct.metadata,
        details: storedProduct.details || null,
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

    job: async (_: any, { id }: { id: string }) => {
      const job = jobStore.getJob(id);
      
      // Debug logging
      if (!job) {
        console.log(`[GraphQL] Job ${id} not found in store`);
        const allJobs = jobStore.getAllJobs();
        console.log(`[GraphQL] Available jobs:`, allJobs.map(j => ({ id: j.id, status: j.status })));
        return null;
      }
      
      console.log(`[GraphQL] Job ${id} status: ${job.status}, progress: ${job.progress}`);
      
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || null,
        data: job.data || null,
        error: job.error || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() || null,
      };
    },

    jobs: async (_: any, { type }: { type?: string }) => {
      const jobs = jobStore.getAllJobs(type as JobType | undefined);
      
      return jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || null,
        data: job.data || null,
        error: job.error || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() || null,
      }));
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

      // Create job ID
      const jobId = `scrape-${brand.id}-${Date.now()}`;
      
      // Create job in store
      const job = jobStore.createJob(jobId, JobType.SCRAPE_BRAND, {
        brandId: brand.id,
        brandName: brand.name,
      });

      // Enqueue scraping job
      const jobData: ScrapeBrandJobData = {
        jobId,
        brandId: brand.id,
        brandName: brand.name,
        website: brand.website,
      };

      await scrapeBrandQueue.add(jobId, jobData, {
        jobId, // Use custom job ID
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
      });

      // Return mock scraper job format for backward compatibility
      return {
        id: jobId,
        brandId: input.brandId,
        status: 'pending',
        brand,
        currentPage: 0,
        productsFound: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    cancelScraping: async (_: any, { jobId }: { jobId: string }) => {
      // Database operations commented out
      // await prisma.scraperJob.update({
      //   where: { id: jobId },
      //   data: { status: 'cancelled' },
      // });
      return true;
    },

    scrapeProductDetails: async (_: any, { input }: { input: { productIds: string[] } }) => {
      if (input.productIds.length === 0) {
        throw new Error('No product IDs provided');
      }

      // Try to find at least one product to get brand ID
      // Try all product IDs until we find one that exists
      let foundProduct = null;
      let brandId: string | null = null;
      
      for (const productId of input.productIds) {
        const product = productStore.getProduct(productId);
        if (product) {
          foundProduct = product;
          brandId = product.brandId;
          break;
        }
      }

      // If no products found, provide helpful error
      if (!foundProduct || !brandId) {
        const availableProductIds = productStore.getAllProducts({ page: 1, pageSize: 10 }).products.map(p => p.id);
        throw new Error(
          `Product not found. Requested IDs: ${input.productIds.slice(0, 3).join(', ')}${input.productIds.length > 3 ? '...' : ''}. ` +
          `Available products in store: ${productStore.getProductCount()}. ` +
          `First few available IDs: ${availableProductIds.slice(0, 3).join(', ')}`
        );
      }

      const jobId = `details-${brandId}-${Date.now()}`;

      // Create job in store
      const job = jobStore.createJob(jobId, JobType.SCRAPE_PRODUCT_DETAILS, {
        productIds: input.productIds,
        brandId,
      });

      // Enqueue detail scraping job
      const jobData: ScrapeProductDetailsJobData = {
        jobId,
        productIds: input.productIds,
        brandId,
      };

      await scrapeProductDetailsQueue.add(jobId, jobData, {
        jobId,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      // Return job instead of waiting for completion
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress || null,
        data: job.data || null,
        error: job.error || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() || null,
      };
    },

    exportCSV: async (_: any, { input }: { input: { productIds: string[]; filename?: string } }) => {
      if (input.productIds.length === 0) {
        throw new Error('No product IDs provided');
      }

      const jobId = `export-${Date.now()}`;
      console.log(`[GraphQL] Creating export job: ${jobId}`);

      // Create job in store
      const job = jobStore.createJob(jobId, JobType.EXPORT_CSV, {
        productIds: input.productIds,
        filename: input.filename,
      });
      console.log(`[GraphQL] Job created in store: ${job.id}, status: ${job.status}`);

      // Enqueue export job
      const jobData: ExportCSVJobData = {
        jobId,
        productIds: input.productIds,
        filename: input.filename,
      };

      await exportCSVQueue.add(jobId, jobData, {
        jobId, // Use the same jobId
        attempts: 1, // Export jobs typically don't need retries
      });
      console.log(`[GraphQL] Job ${jobId} added to queue`);

      // Verify job is in store
      const verifyJob = jobStore.getJob(jobId);
      console.log(`[GraphQL] Verified job in store: ${verifyJob?.id}, status: ${verifyJob?.status}`);

      return {
        jobId: job.id,
        status: job.status,
      };
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

