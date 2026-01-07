'use client';

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import ProductCard from '@/components/ProductCard';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import ExportButton from '@/components/ExportButton';
import BackToTopButton from '@/components/BackToTopButton';
import VirtualizedProductGrid from '@/components/VirtualizedProductGrid';
import { GET_PRODUCTS, GET_BRANDS, START_SCRAPING } from '@/graphql/queries';
import { Product } from '@/types/product';

interface GraphQLProduct {
  id: string;
  name: string;
  brand: {
    id: string;
    name: string;
  };
  type: string | null;
  price: string | null;
  imageUrl: string;
  description: string | null;
  url: string;
  metadata: any;
}

export default function Dashboard() {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [allLoadedProducts, setAllLoadedProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    brandId: '',
    type: '',
    page: 1,
    pageSize: 50,
  });

  // Fetch products using GraphQL
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(GET_PRODUCTS, {
    variables: { filters },
    fetchPolicy: 'cache-and-network',
  });

  // Fetch brands for filter
  const { data: brandsData } = useQuery(GET_BRANDS);

  // Mutation to start scraping
  const [startScraping] = useMutation(START_SCRAPING);
  
  // Ref for the bottom load more button (for intersection observer)
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Auto-start scraping if no products exist
  useEffect(() => {
    const checkAndStartScraping = async () => {
      // Wait a bit for initial data to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we have products
      const hasProducts = productsData?.products?.totalCount > 0;
      console.log("prducts: " , productsData)
      const hasBrands = brandsData?.brands?.length > 0;
      console.log("brands: " , brandsData)
      if (!hasProducts && hasBrands) {
        const firstBrand = brandsData.brands[0];
        if (firstBrand && firstBrand.productCount === 0) {
          console.log('🔄 No products found. Starting automatic scraping for', firstBrand.name);
          
          try {
            const result = await startScraping({
              variables: {
                input: { brandId: firstBrand.id },
              },
            });
            
            console.log('✅ Scraping started:', result.data?.startScraping);
            
            // Refetch products periodically until we have some
            const checkInterval = setInterval(() => {
              refetchProducts().then(({ data }) => {
                if (data?.products?.totalCount > 0) {
                  console.log('✅ Products loaded!');
                  clearInterval(checkInterval);
                }
              });
            }, 5000);
            
            // Stop checking after 2 minutes
            setTimeout(() => clearInterval(checkInterval), 120000);
          } catch (error) {
            console.error('❌ Failed to start scraping:', error);
          }
        }
      }
    };

    // Only run once when component mounts and data is available
    if (productsData !== undefined && brandsData !== undefined) {
      checkAndStartScraping();
    }
  }, [productsData?.products?.totalCount, brandsData?.brands, startScraping, refetchProducts]);

  // Transform GraphQL products to match Product type
  const currentPageProducts: Product[] = useMemo(() => {
    if (!productsData?.products?.products) return [];
    
    return productsData.products.products.map((p: GraphQLProduct) => ({
      id: p.id,
      name: p.name,
      brand: p.brand.name,
      type: p.type || 'General',
      price: p.price || undefined,
      imageUrl: p.imageUrl,
      description: p.description || undefined,
      url: p.url,
      metadata: p.metadata,
    }));
  }, [productsData]);

  // Track if we're loading more (not initial load)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousPageRef = useRef(1);
  const scrollPositionRef = useRef<{ y: number; height: number } | null>(null);
  
  // Detect when we start loading more
  useEffect(() => {
    if (filters.page > previousPageRef.current && filters.page > 1) {
      // Save scroll position before loading
      scrollPositionRef.current = {
        y: window.scrollY,
        height: document.documentElement.scrollHeight,
      };
      setIsLoadingMore(true);
    }
  }, [filters.page]);
  
  // Accumulate products when loading more pages
  useEffect(() => {
    if (currentPageProducts.length > 0) {
      if (filters.page === 1) {
        // First page or filter reset: replace all products
        setIsLoadingMore(false);
        previousPageRef.current = 1;
        scrollPositionRef.current = null;
        setAllLoadedProducts(currentPageProducts);
      } else {
        // Subsequent pages: append new products (avoid duplicates)
        setAllLoadedProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = currentPageProducts.filter(p => !existingIds.has(p.id));
          return newProducts.length > 0 ? [...prev, ...newProducts] : prev;
        });
        
        setIsLoadingMore(false);
        previousPageRef.current = filters.page;
      }
    }
  }, [currentPageProducts, filters.page]);
  
  // Restore scroll position after new items are added
  useLayoutEffect(() => {
    if (scrollPositionRef.current && !isLoadingMore && allLoadedProducts.length > 0) {
      const { y } = scrollPositionRef.current;
      
      // Restore scroll position synchronously before paint
      window.scrollTo({
        top: y,
        behavior: 'auto',
      });
      
      scrollPositionRef.current = null;
    }
  }, [allLoadedProducts, isLoadingMore]);

  // Reset accumulated products when filters change
  useEffect(() => {
    if (filters.page === 1) {
      setAllLoadedProducts([]);
    }
  }, [filters.search, filters.brandId, filters.type]);

  // Handle load more - prevent multiple simultaneous loads
  const handleLoadMore = () => {
    if (productsData?.products?.hasMore && !productsLoading && !isLoadingMore) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // Use accumulated products for display
  const products = allLoadedProducts.length > 0 ? allLoadedProducts : currentPageProducts;

  // Get unique brands and types for filters
  const brands = useMemo(() => {
    if (!brandsData?.brands) return [];
    return brandsData.brands.map((b: any) => b.name).sort();
  }, [brandsData]);

  const types = useMemo(() => {
    const uniqueTypes = new Set(products.map((p) => p.type));
    return Array.from(uniqueTypes).sort();
  }, [products]);

  // Get selected product objects
  const selectedProductObjects = useMemo(() => {
    return products.filter((p) => selectedProducts.has(p.id));
  }, [products, selectedProducts]);

  const toggleProductSelect = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleBrandChange = (brandName: string) => {
    const brand = brandsData?.brands?.find((b: any) => b.name === brandName);
    setFilters({ ...filters, brandId: brand?.id || '', page: 1 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and export products from various brands</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <SearchBar
                value={filters.search}
                onChange={(value) => setFilters({ ...filters, search: value, page: 1 })}
              />
            </div>
            <ExportButton selectedProducts={selectedProductObjects} />
          </div>
          <FilterBar
            brands={brands}
            types={types}
            selectedBrand={brandsData?.brands?.find((b: any) => b.id === filters.brandId)?.name || ''}
            selectedType={filters.type}
            onBrandChange={handleBrandChange}
            onTypeChange={(type) => setFilters({ ...filters, type, page: 1 })}
          />
        </div>

        {productsLoading && filters.page === 1 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found</p>
            <button
              onClick={() => refetchProducts()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Products
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {products.length} of {productsData?.products?.totalCount || 0} products
              {productsData?.products?.hasMore && (
                <button
                  onClick={() => {
                    setFilters({ ...filters, page: filters.page + 1 });
                  }}
                  className="ml-4 px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Load More ({productsData?.products?.totalCount - products.length} remaining)
                </button>
              )}
            </div>
            {/* Use virtualized grid for better performance with large lists */}
            <VirtualizedProductGrid
              products={products}
              selectedProducts={selectedProducts}
              onToggleSelect={toggleProductSelect}
              onLoadMore={handleLoadMore}
              hasMore={productsData?.products?.hasMore || false}
              isLoading={isLoadingMore || (productsLoading && filters.page > 1)}
            />
          </>
        )}
      </main>
      <BackToTopButton />
    </div>
  );
}
