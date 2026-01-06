'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import ProductCard from './ProductCard';
import { Product } from '@/types/product';

interface VirtualizedProductGridProps {
  products: Product[];
  selectedProducts: Set<string>;
  onToggleSelect: (productId: string) => void;
  onLoadMore?: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export default function VirtualizedProductGrid({
  products,
  selectedProducts,
  onToggleSelect,
  onLoadMore,
  hasMore,
  isLoading,
}: VirtualizedProductGridProps) {
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Virtualization thresholds
  const VIRTUALIZATION_THRESHOLD = 50; // Start virtualizing after 50 items
  const ITEMS_PER_VIEWPORT = 20; // Approximate items visible at once
  const BUFFER_SIZE = 10; // Extra items to render outside viewport

  // Calculate visible range
  const visibleEndIndex = useMemo(() => {
    return Math.min(
      products.length,
      visibleStartIndex + ITEMS_PER_VIEWPORT + BUFFER_SIZE * 2
    );
  }, [visibleStartIndex, products.length]);

  const visibleProducts = useMemo(() => {
    const start = Math.max(0, visibleStartIndex - BUFFER_SIZE);
    return products.slice(start, visibleEndIndex);
  }, [products, visibleStartIndex, visibleEndIndex]);

  // Scroll handler for virtualization
  useEffect(() => {
    if (products.length < VIRTUALIZATION_THRESHOLD) {
      return; // Don't virtualize small lists
    }

    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      // Estimate which items should be visible based on scroll position
      // Assuming ~400px per row with 4 items per row = ~100px per item
      const itemHeight = 100;
      const estimatedIndex = Math.floor(scrollTop / itemHeight) * 4;
      
      const newStartIndex = Math.max(0, estimatedIndex - BUFFER_SIZE);
      
      if (Math.abs(newStartIndex - visibleStartIndex) > 5) {
        setVisibleStartIndex(newStartIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [products.length, visibleStartIndex]);

  // Intersection observer for load more
  const { ref: loadMoreRef } = useInView({
    threshold: 0,
    rootMargin: '300px',
    onChange: (inView) => {
      if (inView && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
  });

  // Render all products with lazy loading (simpler approach for grid)
  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <LazyProductCard
            key={product.id}
            product={product}
            isSelected={selectedProducts.has(product.id)}
            onToggleSelect={onToggleSelect}
            index={index}
            shouldLazyLoad={index >= VIRTUALIZATION_THRESHOLD}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-32 flex items-center justify-center mt-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading more products...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lazy loaded product card with fade-in animation
function LazyProductCard({
  product,
  isSelected,
  onToggleSelect,
  index,
  shouldLazyLoad,
}: {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  index: number;
  shouldLazyLoad: boolean;
}) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '100px', // Start loading 100px before entering viewport
  });

  // For items before threshold, render immediately
  if (!shouldLazyLoad) {
    return (
      <ProductCard
        product={product}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  // For items after threshold, use lazy loading
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-95'
      }`}
      style={{
        transitionDelay: `${(index % 20) * 30}ms`, // Stagger animation
      }}
    >
      {inView ? (
        <ProductCard
          product={product}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
        />
      ) : (
        // Placeholder while not in view
        <div className="bg-gray-200 rounded-lg h-96 animate-pulse" />
      )}
    </div>
  );
}
